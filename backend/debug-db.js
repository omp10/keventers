import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://omparteki2002_db_user:cfjOVIh0D7IG11Bv@cluster0.3u9qxl1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'keventers';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME });
    console.log('Connected successfully.');

    const db = mongoose.connection.db;

    // 1. List Restaurants
    console.log('\n--- RESTAURANTS ---');
    const restaurants = await db.collection('restaurants').find({}).toArray();
    restaurants.forEach(r => {
      console.log(`ID: ${r._id}, Name: ${r.name}, Status: ${r.status}, OrgId: ${r.organizationId}`);
    });

    // 2. List Branches
    console.log('\n--- BRANCHES ---');
    const branches = await db.collection('branches').find({}).toArray();
    branches.forEach(b => {
      console.log(`ID: ${b._id}, Name: ${b.name}, Status: ${b.status}, OrgId: ${b.organizationId}, RestaurantId: ${b.restaurantId}`);
    });

    // 3. List Products (first 5)
    console.log('\n--- PRODUCTS (first 5) ---');
    const products = await db.collection('products').find({}).limit(5).toArray();
    products.forEach(p => {
      console.log(`ID: ${p._id}, Name: ${p.name}, Status: ${p.status}, OrgId: ${p.organizationId}, RestaurantId: ${p.restaurantId}`);
    });

    // 4. List Active/Live Guest Sessions
    console.log('\n--- ACTIVE GUEST SESSIONS (last 5) ---');
    const sessions = await db.collection('guest_sessions').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    sessions.forEach(s => {
      console.log(`ID: ${s._id}, TableId: ${s.tableId}, Status: ${s.status}, OrgId: ${s.organizationId}, RestaurantId: ${s.restaurantId}, BranchId: ${s.branchId}`);
    });

  } catch (error) {
    console.error('Error running script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

run();
