import mongoose from 'mongoose';
import { loadEnv } from '../config/env';
import { resetLaunchData } from './resetLaunch';

// Wipes transactional data so the store can launch from zero.
//   Dry run (default):  npm run reset-launch --workspace apps/api
//   For real:           npm run reset-launch --workspace apps/api -- --yes-wipe-production
//   Also drop @example.com customer accounts:  ... -- --yes-wipe-production --delete-test-accounts
//
// NOT the seed script. `seed.ts` deletes products and settings; this never does.
const CONFIRM_FLAG = '--yes-wipe-production';

async function main() {
  const dryRun = !process.argv.includes(CONFIRM_FLAG);
  const deleteTestAccounts = process.argv.includes('--delete-test-accounts');
  const env = loadEnv(process.env);

  await mongoose.connect(env.MONGODB_URI);
  // Name the target database explicitly — dev and prod share a connection string here,
  // so the operator should see what they are about to change.
  console.log(`Connected to database: ${mongoose.connection.name}`);
  console.log(dryRun ? '\nDRY RUN — nothing will be modified.\n' : '\nWIPING DATA — this cannot be undone.\n');

  const { counts } = await resetLaunchData({ dryRun, deleteTestAccounts });

  console.log(`Orders deleted:                 ${counts.orders}`);
  console.log(`Carts deleted:                  ${counts.carts}`);
  console.log(`Reviews deleted:                ${counts.reviews}`);
  console.log(`Subscribers deleted:            ${counts.subscribers}`);
  console.log(`Discount codes reset to 0 uses: ${counts.discountCodesReset}`);
  console.log(`Product ratings cleared:        ${counts.productRatingsCleared}`);
  console.log(
    `Test accounts deleted:          ${deleteTestAccounts ? counts.testAccounts : `0 (${counts.testAccounts} found — pass --delete-test-accounts)`}`,
  );

  const kept = counts.customerAccounts - (deleteTestAccounts ? counts.testAccounts : 0);
  console.log(`\n(${kept} customer account(s) kept.)`);

  if (dryRun) console.log(`\nRe-run with ${CONFIRM_FLAG} to apply.`);
  else console.log('\nDone.');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
