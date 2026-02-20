import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateAppSecretProof(accessToken: string, appSecret: string | undefined): string {
  if (!appSecret) return '';
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(accessToken);
  return hmac.digest('hex');
}

/**
 * GET /api/admin/crm/analytics/meta-status
 * Fetch Meta WhatsApp Business account status including quality rating
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp credentials not configured',
      }, { status: 400 });
    }

    const proof = generateAppSecretProof(accessToken, appSecret);
    const graphVersion = 'v24.0';

    // Fetch phone number info (quality rating, limits, etc.)
    let phoneInfo: any = null;
    try {
      let phoneUrl = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,is_official_business_account,account_mode,status,current_limit,name_status,code_verification_status,platform_type`;
      if (proof) phoneUrl += `&appsecret_proof=${proof}`;
      phoneUrl += `&access_token=${accessToken}`;

      const phoneRes = await fetch(phoneUrl, { method: 'GET', cache: 'no-store' });
      phoneInfo = await phoneRes.json();
      
      if (phoneInfo.error) {
        console.error('[META STATUS] Phone info error:', phoneInfo.error);
      }
    } catch (e) {
      console.error('[META STATUS] Phone fetch error:', e);
    }

    // Fetch WABA info
    let wabaInfo: any = null;
    if (wabaId) {
      try {
        let wabaUrl = `https://graph.facebook.com/${graphVersion}/${wabaId}?fields=id,name,account_review_status,business_verification_status,ownership_type,timezone_id`;
        if (proof) wabaUrl += `&appsecret_proof=${proof}`;
        wabaUrl += `&access_token=${accessToken}`;

        const wabaRes = await fetch(wabaUrl, { method: 'GET', cache: 'no-store' });
        wabaInfo = await wabaRes.json();
        
        if (wabaInfo.error) {
          console.error('[META STATUS] WABA info error:', wabaInfo.error);
        }
      } catch (e) {
        console.error('[META STATUS] WABA fetch error:', e);
      }
    }

    // Fetch template counts
    let templateStats: any = null;
    if (wabaId) {
      try {
        let templateUrl = `https://graph.facebook.com/${graphVersion}/${wabaId}/message_templates?fields=name,status,category&limit=500`;
        if (proof) templateUrl += `&appsecret_proof=${proof}`;
        templateUrl += `&access_token=${accessToken}`;

        const templateRes = await fetch(templateUrl, { method: 'GET', cache: 'no-store' });
        const templateData = await templateRes.json();
        
        if (templateData.data) {
          const templates = templateData.data;
          templateStats = {
            total: templates.length,
            approved: templates.filter((t: any) => t.status === 'APPROVED').length,
            pending: templates.filter((t: any) => t.status === 'PENDING').length,
            rejected: templates.filter((t: any) => t.status === 'REJECTED').length,
            byCategory: {
              marketing: templates.filter((t: any) => t.category === 'MARKETING').length,
              utility: templates.filter((t: any) => t.category === 'UTILITY').length,
              authentication: templates.filter((t: any) => t.category === 'AUTHENTICATION').length,
            },
          };
        }
      } catch (e) {
        console.error('[META STATUS] Template fetch error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        phone: phoneInfo?.error ? null : {
          id: phoneInfo?.id,
          displayNumber: phoneInfo?.display_phone_number,
          verifiedName: phoneInfo?.verified_name,
          qualityRating: phoneInfo?.quality_rating, // HIGH, MEDIUM, LOW
          messagingLimitTier: phoneInfo?.messaging_limit_tier, // TIER_1K, TIER_10K, TIER_100K, UNLIMITED
          currentLimit: phoneInfo?.current_limit,
          isOfficialBusinessAccount: phoneInfo?.is_official_business_account,
          accountMode: phoneInfo?.account_mode, // LIVE, SANDBOX
          status: phoneInfo?.status, // CONNECTED, DISCONNECTED, etc.
          nameStatus: phoneInfo?.name_status,
          codeVerificationStatus: phoneInfo?.code_verification_status,
          platformType: phoneInfo?.platform_type,
        },
        waba: wabaInfo?.error ? null : {
          id: wabaInfo?.id,
          name: wabaInfo?.name,
          accountReviewStatus: wabaInfo?.account_review_status,
          businessVerificationStatus: wabaInfo?.business_verification_status,
          ownershipType: wabaInfo?.ownership_type,
          timezoneId: wabaInfo?.timezone_id,
        },
        templates: templateStats,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[META STATUS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Meta status',
    }, { status: 500 });
  }
}
