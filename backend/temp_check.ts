import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  const Subscription = mongoose.model('Subscription', new mongoose.Schema({}, { strict: false }));
  const Plan = mongoose.model('SubscriptionPlan', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  console.log("Plans:");
  const plans = await Plan.find({});
  console.log(plans);

  console.log("Users and Subscriptions:");
  const subs = await Subscription.find({});
  for (const subDoc of subs) {
    const sub: any = subDoc;
    const user: any = await User.findById(sub.userId);
    console.log(`User: ${user?.email} - PlanId: ${sub.planId} - Status: ${sub.status}`);
  }

  process.exit();
});
