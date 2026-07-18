import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://omparteki2002_db_user:cfjOVIh0D7IG11Bv@cluster0.3u9qxl1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'keventers';

async function run() {
  await mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME });
  const db = mongoose.connection.db;

  const p = await db.collection('products').findOne({ name: /Biryani/i });
  if (!p) {
    console.log('Biryani product not found');
  } else {
    console.log('Product:', {
      _id: p._id,
      name: p.name,
      restaurantId: p.restaurantId,
      organizationId: p.organizationId,
      sku: p.sku
    });
    const vars = await db.collection('variants').find({ productId: p._id }).toArray();
    console.log('Variants count:', vars.length);
    for (const v of vars) {
      console.log({
        _id: v._id,
        name: v.name,
        productId: v.productId,
        sku: v.sku,
        price: v.price
      });
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
