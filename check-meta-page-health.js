#!/usr/bin/env node
// Comprehensive Meta Page Health Check - All Assets

const fs = require('fs');
const crypto = require('crypto');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  if (key) process.env[key] = val;
}

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const PIXEL_ID = process.env.META_PIXEL_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const API_VER = process.env.META_GRAPH_API_VERSION || 'v24.0';
const BASE = `https://graph.facebook.com/${API_VER}`;

function proof(token) {
  return crypto.createHmac('sha256', APP_SECRET).update(token).digest('hex');
}

const FORM_IDS = ['794153503706391']; // unique form IDs

function status(ok) { return ok ? '✅' : '❌'; }

async function get(url, token) {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}access_token=${token}&appsecret_proof=${proof(token)}`);
  return res.json();
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         META PAGE HEALTH CHECK - SWARYOGA           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── 1. TOKEN HEALTH ─────────────────────────────────────────
  console.log('━━━ 1. ACCESS TOKEN HEALTH ━━━━━━━━━━━━━━━━━━━━━━━━━');
  const tokenInfo = await get(`${BASE}/me`, ACCESS_TOKEN);
  if (tokenInfo.id) {
    console.log(`${status(true)} Token valid — User: ${tokenInfo.name} (ID: ${tokenInfo.id})`);
  } else {
    console.log(`${status(false)} Token invalid: ${tokenInfo.error?.message}`);
  }

  const pageTokenInfo = await get(`${BASE}/me`, PAGE_TOKEN);
  if (pageTokenInfo.id) {
    console.log(`${status(true)} Page Token valid — User: ${pageTokenInfo.name}`);
  } else {
    console.log(`${status(false)} Page Token invalid: ${pageTokenInfo.error?.message}`);
  }

  // ── 2. FACEBOOK PAGE ─────────────────────────────────────────
  console.log('\n━━━ 2. FACEBOOK PAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const page = await get(
    `${BASE}/${PAGE_ID}?fields=id,name,username,category,fan_count,followers_count,verification_status,about,website`,
    PAGE_TOKEN
  );
  if (page.error) {
    console.log(`${status(false)} Page fetch error: ${page.error.message}`);
  } else {
    console.log(`${status(true)} Page: ${page.name} (@${page.username || 'N/A'})`);
    console.log(`   ID              : ${page.id}`);
    console.log(`   Category        : ${page.category || 'N/A'}`);
    console.log(`   Followers       : ${(page.followers_count || 0).toLocaleString()}`);
    console.log(`   Fans/Likes      : ${(page.fan_count || 0).toLocaleString()}`);
    console.log(`   Verification    : ${page.verification_status || 'unverified'}`);
    console.log(`   Website         : ${page.website || 'N/A'}`);
  }

  // Page Insights (reach last 28 days)
  const insights = await get(
    `${BASE}/${PAGE_ID}/insights?metric=page_impressions,page_reach,page_post_engagements,page_fan_adds_unique&period=month&limit=1`,
    PAGE_TOKEN
  );
  if (!insights.error && insights.data) {
    console.log('\n   Page Insights (last 28 days):');
    for (const m of insights.data) {
      const latest = m.values?.[m.values.length - 1]?.value ?? 0;
      console.log(`   ${m.name.replace('page_', '').padEnd(35)}: ${typeof latest === 'number' ? latest.toLocaleString() : JSON.stringify(latest)}`);
    }
  }

  // Recent posts
  const posts = await get(
    `${BASE}/${PAGE_ID}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true)&limit=3`,
    PAGE_TOKEN
  );
  if (!posts.error && posts.data?.length) {
    console.log('\n   Recent Posts:');
    for (const p of posts.data) {
      const msg = (p.message || '(no text)').slice(0, 60).replace(/\n/g, ' ');
      const likes = p.likes?.summary?.total_count ?? 0;
      const comments = p.comments?.summary?.total_count ?? 0;
      console.log(`   • [${new Date(p.created_time).toLocaleDateString()}] ${msg}`);
      console.log(`     Likes: ${likes}  Comments: ${comments}`);
    }
  } else {
    console.log('   Recent Posts: none or not accessible');
  }

  // ── 3. WHATSAPP BUSINESS ACCOUNT ──────────────────────────────
  console.log('\n━━━ 3. WHATSAPP BUSINESS ACCOUNT (WABA) ━━━━━━━━━━━━━');
  const waba = await get(
    `${BASE}/${WABA_ID}?fields=id,name,currency,timezone_id,message_template_namespace,account_review_status,business_verification_status,ownership_type,on_behalf_of_business_info`,
    ACCESS_TOKEN
  );
  if (waba.error) {
    console.log(`${status(false)} WABA error: ${waba.error.message}`);
  } else {
    const reviewOk = waba.account_review_status === 'APPROVED';
    const verifyOk = waba.business_verification_status === 'verified';
    console.log(`${status(reviewOk)} Account Review   : ${waba.account_review_status}`);
    console.log(`${status(verifyOk)} Biz Verification : ${waba.business_verification_status}`);
    console.log(`   Name              : ${waba.name}`);
    console.log(`   WABA ID           : ${waba.id}`);
    console.log(`   Currency          : ${waba.currency}`);
    console.log(`   Ownership Type    : ${waba.ownership_type}`);
    console.log(`   Template NS       : ${waba.message_template_namespace}`);
  }

  // ── 4. WHATSAPP PHONE NUMBER ──────────────────────────────────
  console.log('\n━━━ 4. WHATSAPP PHONE NUMBER ━━━━━━━━━━━━━━━━━━━━━━━━');
  const phone = await get(
    `${BASE}/${PHONE_NUMBER_ID}?fields=verified_name,quality_rating,messaging_limit_tier,is_official_business_account,account_mode,status,name_status,display_phone_number,code_verification_status`,
    ACCESS_TOKEN
  );
  if (phone.error) {
    console.log(`${status(false)} Phone error: ${phone.error.message}`);
  } else {
    const statusOk = phone.status === 'CONNECTED';
    const qualOk = phone.quality_rating !== 'RED';
    console.log(`${status(statusOk)} Status             : ${phone.status}`);
    console.log(`${status(qualOk)} Quality Rating      : ${phone.quality_rating}`);
    console.log(`   Display Number    : ${phone.display_phone_number}`);
    console.log(`   Verified Name     : ${phone.verified_name}`);
    console.log(`   Messaging Tier    : ${phone.messaging_limit_tier}`);
    console.log(`   Account Mode      : ${phone.account_mode}`);
    console.log(`   Name Status       : ${phone.name_status}`);
    console.log(`   Official Business : ${phone.is_official_business_account ? 'Yes' : 'No'}`);
    console.log(`   Code Verified     : ${phone.code_verification_status}`);
  }

  // ── 5. MESSAGE TEMPLATES ──────────────────────────────────────
  console.log('\n━━━ 5. MESSAGE TEMPLATES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const templates = await get(
    `${BASE}/${WABA_ID}/message_templates?fields=id,name,status,category,language,quality_score,rejected_reason&limit=50`,
    ACCESS_TOKEN
  );
  if (templates.error) {
    console.log(`${status(false)} Templates error: ${templates.error.message}`);
  } else {
    const list = templates.data || [];
    const approved = list.filter(t => t.status === 'APPROVED');
    const rejected = list.filter(t => t.status === 'REJECTED');
    const pending  = list.filter(t => !['APPROVED','REJECTED'].includes(t.status));
    console.log(`   Total: ${list.length}  Approved: ${approved.length}  Rejected: ${rejected.length}  Other: ${pending.length}`);
    for (const t of list) {
      const tOk = t.status === 'APPROVED';
      const score = t.quality_score?.score || 'N/A';
      const rej = t.rejected_reason ? ` [Reason: ${t.rejected_reason}]` : '';
      console.log(`   ${status(tOk)} ${t.name.padEnd(40)} | ${t.status.padEnd(10)} | ${t.language} | Quality: ${score}${rej}`);
    }
  }

  // ── 6. META PIXEL ────────────────────────────────────────────
  console.log('\n━━━ 6. META PIXEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const pixel = await get(
    `${BASE}/${PIXEL_ID}?fields=id,name,is_unavailable,is_consolidated_container,creation_time`,
    ACCESS_TOKEN
  );
  if (pixel.error) {
    const pagePixel = await get(
      `${BASE}/${PIXEL_ID}?fields=id,name,is_unavailable,creation_time`,
      PAGE_TOKEN
    );
    if (pagePixel.error) {
      console.log(`${status(false)} Pixel error: ${pagePixel.error.message}`);
    } else {
      console.log(`${status(!pagePixel.is_unavailable)} Pixel ID: ${pagePixel.id} — ${pagePixel.name}`);
      console.log(`   Available: ${!pagePixel.is_unavailable ? 'Yes' : 'No'}`);
      console.log(`   Created  : ${new Date(pagePixel.creation_time * 1000).toLocaleDateString()}`);
    }
  } else {
    console.log(`${status(!pixel.is_unavailable)} Pixel ID: ${pixel.id} — ${pixel.name}`);
    console.log(`   Available: ${!pixel.is_unavailable ? 'Yes' : 'No'}`);
    console.log(`   Created  : ${new Date(pixel.creation_time * 1000).toLocaleDateString()}`);
  }

  // ── 7. META LEAD FORMS ────────────────────────────────────────
  console.log('\n━━━ 7. META LEAD FORMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const formId of FORM_IDS) {
    if (formId === 'your_form_id_here') continue;
    const form = await get(
      `${BASE}/${formId}?fields=id,name,status,leads_count,created_time,page`,
      PAGE_TOKEN
    );
    if (form.error) {
      console.log(`${status(false)} Form ${formId}: ${form.error.message}`);
    } else {
      const formOk = form.status === 'ACTIVE';
      console.log(`${status(formOk)} ${form.name}`);
      console.log(`   ID       : ${form.id}`);
      console.log(`   Status   : ${form.status}`);
      console.log(`   Leads    : ${(form.leads_count || 0).toLocaleString()}`);
      console.log(`   Created  : ${new Date(form.created_time).toLocaleDateString()}`);
      console.log(`   Page     : ${form.page?.name || 'N/A'}`);
    }
  }

  // Also list all forms on the page
  const allForms = await get(
    `${BASE}/${PAGE_ID}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=10`,
    PAGE_TOKEN
  );
  if (!allForms.error && allForms.data?.length) {
    console.log('\n   All Forms on Page:');
    for (const f of allForms.data) {
      const fOk = f.status === 'ACTIVE';
      console.log(`   ${status(fOk)} ${f.name.padEnd(35)} | ${f.status} | Leads: ${(f.leads_count || 0).toLocaleString()} | ID: ${f.id}`);
    }
  }

  // ── 8. AD CAMPAIGNS ──────────────────────────────────────────
  console.log('\n━━━ 8. AD CAMPAIGNS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  // Try to get ad accounts linked to page
  const adAccounts = await get(
    `${BASE}/${PAGE_ID}/connected_instagram_account,instagram_business_account?fields=id,name,username,biography,followers_count`,
    PAGE_TOKEN
  );
  if (!adAccounts.error) {
    if (adAccounts.instagram_business_account) {
      const ig = adAccounts.instagram_business_account;
      console.log(`${status(true)} Instagram Business Account linked`);
      // Fetch IG details
      const igDetails = await get(
        `${BASE}/${ig.id}?fields=id,name,username,biography,followers_count,media_count,profile_picture_url`,
        PAGE_TOKEN
      );
      if (!igDetails.error) {
        console.log(`   Username   : @${igDetails.username}`);
        console.log(`   Name       : ${igDetails.name}`);
        console.log(`   Followers  : ${(igDetails.followers_count || 0).toLocaleString()}`);
        console.log(`   Posts      : ${(igDetails.media_count || 0).toLocaleString()}`);
        console.log(`   Bio        : ${(igDetails.biography || 'N/A').slice(0, 80)}`);
      }
    } else {
      console.log('   No Instagram Business Account linked to this Page');
    }
  }

  // ── SUMMARY ──────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                  HEALTH SUMMARY                     ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  const items = [
    ['Facebook Page', !page.error],
    ['WABA Review', waba.account_review_status === 'APPROVED'],
    ['WABA Verified', waba.business_verification_status === 'verified'],
    ['WhatsApp Connected', phone.status === 'CONNECTED'],
    ['WA Quality (not RED)', phone.quality_rating !== 'RED'],
    ['Templates Approved', (templates.data || []).filter(t => t.status === 'APPROVED').length > 0],
  ];
  for (const [label, ok] of items) {
    console.log(`  ${status(ok)} ${label}`);
  }
  console.log('');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
