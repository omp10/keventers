// One-off: attach dish photos to the seeded Raddison menu products.
// Matches by the product _id values the live public menu returned, so it can
// only ever touch those 8 rows. Hotlinks Wikimedia Commons thumbnails (CC) —
// no upload step, works in local and deployed alike. Re-runnable (idempotent).
//
//   node scripts/seed-raddison-images.mjs
import 'dotenv/config';
import mongoose from 'mongoose';

const ID_URL = {
  '6a5a220c785b1c9e91807688': { name: 'Biryani', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Biryani_Home.jpg/960px-Biryani_Home.jpg' },
  '6a5a220c785b1c9e9180768a': { name: 'Butter Chicken', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Chicken_makhani.jpg/960px-Chicken_makhani.jpg' },
  '6a5a220c785b1c9e9180768c': { name: 'Dal Makhani', url: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Dal_Makhani.jpg' },
  '6a5a220b785b1c9e9180767c': { name: 'Paneer Tikka', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Paneer_Tikka_Shashlik_PK012.jpg' },
  '6a5a220b785b1c9e9180767e': { name: 'Chicken Seekh Kebab', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Chicken_Seekh_Kabab.jpg/960px-Chicken_Seekh_Kabab.jpg' },
  '6a5a220b785b1c9e91807680': { name: 'Crispy Corn', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Crispy_chilli_baby_corn.....jpg/960px-Crispy_chilli_baby_corn.....jpg' },
  '6a5a220c785b1c9e91807684': { name: 'Gulab Jamun', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Two_Gulab_Jamun_in_a_plate_01.jpg/960px-Two_Gulab_Jamun_in_a_plate_01.jpg' },
  '6a5a220c785b1c9e91807686': { name: 'Rasmalai', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Rasmalai_with_carrot.jpg/960px-Rasmalai_with_carrot.jpg' },
};

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;
if (!uri) throw new Error('MONGO_URI not set');

await mongoose.connect(uri, { dbName });
const products = mongoose.connection.collection('products');

// The id map was built from the live public menu (matched by NAME there), but a
// reseed changes _ids. Resolve by name against the actual rows so this survives
// a fresh seed; fall back to the pinned ids only if a name somehow misses.
const wantByName = new Map(Object.values(ID_URL).map((v) => [v.name, v.url]));
const rows = await products.find({ name: { $in: [...wantByName.keys()] } }).toArray();

let updated = 0;
for (const p of rows) {
  const url = wantByName.get(p.name);
  if (!url) continue;
  const image = { role: 'hero', key: null, url, alt: p.name, displayOrder: 0 };
  await products.updateOne(
    { _id: p._id },
    { $set: { images: [image], heroImageUrl: url, thumbnailUrl: url } },
  );
  updated += 1;
  console.log(`  ✓ ${p.name}`);
}

const missing = [...wantByName.keys()].filter((n) => !rows.some((r) => r.name === n));
if (missing.length) console.warn('  ! no product matched:', missing.join(', '));
console.log(`\nDone — ${updated}/${wantByName.size} products imaged.`);
await mongoose.disconnect();
