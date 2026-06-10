import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Wallet = mongoose.model('Wallet', new mongoose.Schema({}, { strict: false }));
  const Subscription = mongoose.model('Subscription', new mongoose.Schema({}, { strict: false }));
  const WalletTransaction = mongoose.model('WalletTransaction', new mongoose.Schema({}, { strict: false }));

  const user: any = await User.findOne({ email: 'yousefhamaki2@gmail.com' });
  if (user) {
    const wallet: any = await Wallet.findOne({ userId: user._id });
    const sub: any = await Subscription.findOne({ userId: user._id });
    const txs = await WalletTransaction.find({ userId: user._id });

    console.log("=== User Info ===");
    console.log(`Email: ${user.email}`);
    console.log(`Wallet Balance: ${wallet?.balance} ${wallet?.currency}`);
    console.log(`Subscription PlanId: ${sub?.planId} - Status: ${sub?.status}`);
    console.log("\n=== Wallet Transactions ===");
    console.log(txs);
  } else {
    console.log("User not found");
  }

  process.exit();
});
