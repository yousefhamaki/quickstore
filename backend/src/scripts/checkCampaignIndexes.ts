import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
    console.log('Connected to MongoDB. Checking campaign collection indexes...');
    
    const db = mongoose.connection.db;
    if (!db) {
        console.error('Database connection not established.');
        process.exit(1);
    }

    const indexes = await db.collection('campaigns').indexes();
    console.log('Indexes on "campaigns" collection:');
    console.log(JSON.stringify(indexes, null, 2));

    process.exit();
}).catch(err => {
    console.error('Failed to check indexes:', err);
    process.exit(1);
});
