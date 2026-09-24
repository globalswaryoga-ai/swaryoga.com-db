#!/usr/bin/env node
/**
 * Reclaims Mongo space by dropping inline base64 attachments from
 * qr_whatsapp_messages.rawMessage.
 *
 * The webhook used to persist the whole bridge payload as rawMessage, so every
 * photo/video was stored both as base64 in Mongo and as a file in Bunny. The
 * write path no longer does this; this script cleans up the backlog.
 *
 * SAFETY: a document is only stripped when `mediaUrl` is set, i.e. the binary
 * is known to exist in Bunny. Messages whose media never made it to Bunny are
 * left untouched and reported, so the base64 is never the only remaining copy.
 *
 *   node scripts/strip-rawmessage-media.js            # dry run, writes nothing
 *   node scripts/strip-rawmessage-media.js --apply    # perform the update
 */
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const BATCH = 500;

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const col = client.db(process.env.MONGODB_CRM_DB_NAME).collection('qr_whatsapp_messages');

  const hasInline = {
    $or: [
      { 'rawMessage.mediaBase64': { $exists: true, $ne: null } },
      { 'rawMessage.media.data': { $exists: true, $ne: null } },
    ],
  };

  const total = await col.countDocuments(hasInline);
  const orphans = await col.countDocuments({
    $and: [hasInline, { $or: [{ mediaUrl: '' }, { mediaUrl: { $exists: false } }] }],
  });
  const safe = total - orphans;

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — docs with inline base64: ${total}`);
  console.log(`  strippable (media already in Bunny): ${safe}`);
  console.log(`  skipped (no mediaUrl — base64 is the only copy): ${orphans}`);

  // Measure real savings from a sample rather than guessing.
  const sample = await col.find(hasInline).limit(200).toArray();
  let before = 0;
  let after = 0;
  for (const d of sample) {
    before += JSON.stringify(d).length;
    const c = JSON.parse(JSON.stringify(d));
    if (c.rawMessage) {
      delete c.rawMessage.mediaBase64;
      if (c.rawMessage.media) delete c.rawMessage.media.data;
    }
    after += JSON.stringify(c).length;
  }
  if (sample.length) {
    const perDoc = (before - after) / sample.length;
    console.log(`  avg reclaimed/doc: ${(perDoc / 1024).toFixed(1)} KB`);
    console.log(`  projected reclaim: ${((perDoc * safe) / 1024 / 1024).toFixed(0)} MB (logical, pre-compression)`);
  }

  if (!APPLY) {
    console.log('\nNothing written. Re-run with --apply to perform the update.');
    await client.close();
    return;
  }

  let done = 0;
  for (;;) {
    const batch = await col
      .find({ $and: [hasInline, { mediaUrl: { $exists: true, $ne: '' } }] }, { projection: { _id: 1 } })
      .limit(BATCH)
      .toArray();
    if (!batch.length) break;
    const res = await col.updateMany(
      { _id: { $in: batch.map((d) => d._id) } },
      { $unset: { 'rawMessage.mediaBase64': '', 'rawMessage.media.data': '' } }
    );
    done += res.modifiedCount;
    process.stdout.write(`\r  stripped ${done}/${safe}`);
    if (res.modifiedCount === 0) break; // guard against a non-advancing loop
  }
  console.log(`\nDone. Stripped ${done} documents.`);
  console.log('Storage is reclaimed lazily by WiredTiger; run compact or wait for reuse to see the file shrink.');
  await client.close();
})().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});
