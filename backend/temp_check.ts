import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  console.log("Users in database matching yousefhamaki2:");
  const users = await User.find({ email: /yousefhamaki2/i });
  for (const u of users) {
    const user = u as any;
    console.log(`ID: ${user._id} | Email: ${user.email} | isVerified: ${user.isVerified} | authProvider: ${user.authProvider} | verificationHash: ${user.emailVerificationTokenHash} | expires: ${user.emailVerificationExpiresAt}`);
  }

  process.exit();
});
