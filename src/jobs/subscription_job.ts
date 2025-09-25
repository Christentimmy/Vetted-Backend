
import { CronJob } from 'cron';
import Subscription from '../models/subscription_model';
import User from '../models/user_model';

// Run every 5 minutes
const JOB_SCHEDULE = '*/5 * * * *';

function startSubscriptionJob() {
  const job = new CronJob(JOB_SCHEDULE, async () => {
    try {
      const now = new Date();
      
      // Find subscriptions that are past due and not already marked as such
      const pastDueSubs = await Subscription.find({
        currentPeriodEnd: { $lt: now },
        status: { $ne: 'canceled' }
      }).populate('userId');

      for (const sub of pastDueSubs) {
        try {
          // Update subscription status in our DB
          sub.status = 'past_due';
          await sub.save();

          // Update user's subscription status
          await User.findByIdAndUpdate(sub.userId, {
            'subscription.status': 'past_due',
            'subscription.cancelAtPeriodEnd': false
          });

          // Optionally: Send notification to user
          // await sendSubscriptionExpiredNotification(sub.userId);

          console.log(`Updated expired subscription for user ${sub.userId}`);
        } catch (error) {
          console.error(`Error processing subscription ${sub._id}:`, error);
        }
      }

      console.log(`Subscription check completed at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Error in subscription job:', error);
    }
  });

  job.start();
  console.log('Subscription monitoring job started');
}

startSubscriptionJob();