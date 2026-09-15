/**
 * Rebuilds Article's text index to match the current schema exactly.
 *
 * Needed once after the schema's text-indexed field set changes (e.g. adding
 * `tags`) — Mongoose's autoIndex does not migrate an existing text index in
 * place, and this collection had accumulated a STALE, incomplete index
 * (title_text_content_text, weights {title:1, content:1} only — missing
 * summary, tags, and all three Arabic fields entirely) left over from an
 * earlier schema version, silently blocking the real ArticleTextIndex from
 * ever being created (Mongo allows only one text index per collection).
 *
 * Run: npx ts-node src/scripts/rebuildArticleTextIndex.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Article from '../models/Article';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect((process.env.MONGO_URI || process.env.MONGODB_URI) as string);
        console.log('Connected. Syncing indexes...');
        const result = await Article.syncIndexes();
        console.log('syncIndexes result:', result);
        const indexes = await Article.collection.indexes();
        console.log('Current indexes:', JSON.stringify(indexes, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error rebuilding index:', error);
        process.exit(1);
    }
};

run();
