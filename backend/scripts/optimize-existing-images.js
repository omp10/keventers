/**
 * BACKFILL — compress images that were uploaded before the upload pipeline
 * started optimizing them.
 *
 * New uploads are compressed automatically (media.service.js). This walks the
 * images ALREADY on disk, writes a .webp beside each one, and repoints the
 * database at it. Existing 2 MB banners are the reason the homepage's first
 * paint is slow; nothing else fixes those retroactively.
 *
 * DRY RUN BY DEFAULT — it reports what it would do and changes nothing. Pass
 * --apply to actually write files and update the database.
 *
 *   node scripts/optimize-existing-images.js            # report only
 *   node scripts/optimize-existing-images.js --apply    # do it
 *
 * Originals are kept (renamed .orig) so a bad conversion is always reversible.
 */
import 'dotenv/config';
import { readdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';

import mongoose from 'mongoose';

import { optimizeImage } from '../src/modules/organization/services/image-optimizer.js';

const APPLY = process.argv.includes('--apply');
const ROOT = process.env.STORAGE_LOCAL_DIR || './storage';
const IMAGE_RE = /\.(png|jpe?g)$/i;

/** Every collection+field that can hold an uploaded image URL. */
const URL_FIELDS = [
  ['banners', 'imageUrl'],
  ['storefrontcategories', 'imageUrl'],
  ['branches', 'coverImageUrl'],
  ['restaurants', 'logoUrl'],
  ['products', 'imageUrl'],
];

async function* walk(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (IMAGE_RE.test(e.name)) yield full;
  }
}

async function main() {
  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — scanning ${ROOT}\n`);

  const converted = [];
  let originalTotal = 0;
  let optimizedTotal = 0;

  for await (const file of walk(ROOT)) {
    const buffer = await readFile(file);
    const folder = path.basename(path.dirname(file));
    const result = await optimizeImage(
      { buffer, mimetype: file.match(/\.png$/i) ? 'image/png' : 'image/jpeg', originalname: path.basename(file) },
      folder,
    );
    if (result.meta?.skipped) {
      console.log(`  skip  ${path.basename(file)} (${result.meta.skipped})`);
      continue;
    }

    originalTotal += result.meta.originalBytes;
    optimizedTotal += result.meta.optimizedBytes;
    const webpPath = file.replace(/\.[^.]+$/, '.webp');
    converted.push({ file, webpPath, ...result.meta });
    console.log(
      `  ${APPLY ? 'write' : 'would'} ${path.basename(webpPath)}  ` +
      `${(result.meta.originalBytes / 1024).toFixed(0)}KB → ${(result.meta.optimizedBytes / 1024).toFixed(0)}KB ` +
      `(-${result.meta.savedPercent}%)`,
    );

    if (APPLY) {
      await writeFile(webpPath, result.buffer);
      await rename(file, `${file}.orig`); // reversible
    }
  }

  if (!converted.length) {
    console.log('\nNothing to convert.');
    return;
  }

  console.log(
    `\n${converted.length} image(s): ${(originalTotal / 1048576).toFixed(1)} MB → ` +
    `${(optimizedTotal / 1048576).toFixed(1)} MB ` +
    `(-${Math.round((1 - optimizedTotal / originalTotal) * 100)}%)`,
  );

  // Repoint the database at the new files.
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME });
  let updated = 0;
  for (const [collection, field] of URL_FIELDS) {
    for (const c of converted) {
      const oldName = path.basename(c.file);
      const newName = path.basename(c.webpPath);
      const filter = { [field]: { $regex: oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } };
      if (!APPLY) {
        updated += await mongoose.connection.collection(collection).countDocuments(filter);
        continue;
      }
      const docs = await mongoose.connection.collection(collection).find(filter).toArray();
      for (const d of docs) {
        await mongoose.connection.collection(collection).updateOne(
          { _id: d._id },
          { $set: { [field]: String(d[field]).replace(oldName, newName) } },
        );
        updated += 1;
      }
    }
  }
  console.log(`${APPLY ? 'Updated' : 'Would update'} ${updated} database reference(s).`);
  if (!APPLY) console.log('\nRe-run with --apply to make these changes.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
