const { initBunnyCommunitySchema, listBunnyCommunityMembers } = require('./lib/bunnyCommunityRepository');

async function test() {
  try {
    const res = await listBunnyCommunityMembers({ communityId: 'community_1_daily_posts', status: 'all' });
    console.log(res);
  } catch (e) {
    console.error("ERROR", e);
  }
}
test();
