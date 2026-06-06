import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Store from '../models/Store';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
    console.log('Connected to MongoDB. Checking hamaki store...');
    const store = await Store.findOne({ 'domain.subdomain': 'hamaki' }).lean();
    if (store) {
        console.log('SUCCESS: Store found!');
        console.log('ID:', store._id);
        console.log('Name:', store.name);
        console.log('Subdomain:', store.domain?.subdomain);
        console.log('Custom Domain:', store.domain?.customDomain);
        console.log('Status:', store.status);
    } else {
        console.log('ERROR: No store found in the database with subdomain "hamaki".');
        
        // Let's print some other subdomains to see what's in there
        const allStores = await Store.find({}, 'name domain.subdomain status').limit(10).lean();
        console.log('Sample of stores in database:');
        console.log(allStores);
    }
    process.exit();
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});
