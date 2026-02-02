import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Verify admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await verifyToken(authHeader.split(' ')[1]);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { platform, accountId, accessToken } = body;

    if (!platform || !accessToken) {
      return NextResponse.json({ error: 'Platform and access token required' }, { status: 400 });
    }

    let result: { success: boolean; message?: string; error?: string; data?: Record<string, unknown> };

    switch (platform) {
      case 'facebook':
        result = await testFacebookConnection(accountId, accessToken);
        break;
      case 'instagram':
        result = await testInstagramConnection(accountId, accessToken);
        break;
      case 'youtube':
        result = await testYouTubeConnection(accountId, accessToken);
        break;
      case 'x':
        result = await testXConnection(accessToken);
        break;
      case 'linkedin':
        result = await testLinkedInConnection(accountId, accessToken);
        break;
      default:
        result = { success: false, error: 'Unknown platform' };
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection test failed' 
    }, { status: 500 });
  }
}

async function testFacebookConnection(pageId: string, accessToken: string) {
  try {
    // Test by fetching page info
    const url = `https://graph.facebook.com/v24.0/${pageId}?fields=id,name,fan_count&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      // Parse common Facebook errors
      const errorMsg = data.error.message || 'Unknown error';
      if (errorMsg.includes('expired')) {
        return { success: false, error: 'Token expired. Please generate a new long-lived token.' };
      }
      if (errorMsg.includes('Invalid OAuth')) {
        return { success: false, error: 'Invalid token. Make sure you\'re using a Page Access Token, not an App token.' };
      }
      if (errorMsg.includes('does not exist')) {
        return { success: false, error: 'Page ID not found. Make sure you entered a numeric Page ID.' };
      }
      return { success: false, error: errorMsg };
    }

    return { 
      success: true, 
      message: `Connected to "${data.name}" (${data.fan_count?.toLocaleString() || 0} followers)`,
      data: { pageName: data.name, pageId: data.id, followers: data.fan_count }
    };
  } catch (error) {
    return { success: false, error: 'Failed to connect to Facebook API' };
  }
}

async function testInstagramConnection(accountId: string, accessToken: string) {
  try {
    // Test by fetching Instagram business account info
    const url = `https://graph.facebook.com/v24.0/${accountId}?fields=id,username,followers_count,media_count&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      const errorMsg = data.error.message || 'Unknown error';
      if (errorMsg.includes('expired')) {
        return { success: false, error: 'Token expired. Please generate a new long-lived token.' };
      }
      if (errorMsg.includes('Invalid user id')) {
        return { success: false, error: 'Invalid Instagram Business Account ID. Use Graph API Explorer to find the correct ID.' };
      }
      if (errorMsg.includes('permission')) {
        return { success: false, error: 'Missing permissions. Make sure your token has instagram_basic and instagram_content_publish scopes.' };
      }
      return { success: false, error: errorMsg };
    }

    return { 
      success: true, 
      message: `Connected to @${data.username} (${data.followers_count?.toLocaleString() || 0} followers, ${data.media_count || 0} posts)`,
      data: { username: data.username, accountId: data.id, followers: data.followers_count }
    };
  } catch (error) {
    return { success: false, error: 'Failed to connect to Instagram API' };
  }
}

async function testYouTubeConnection(channelId: string, apiKey: string) {
  try {
    // Test by fetching channel info
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      const errorMsg = data.error.message || 'Unknown error';
      if (errorMsg.includes('API key not valid')) {
        return { success: false, error: 'Invalid API key. Make sure you copied the full key from Google Cloud Console.' };
      }
      if (errorMsg.includes('has not been used')) {
        return { success: false, error: 'YouTube Data API v3 is not enabled. Enable it in Google Cloud Console.' };
      }
      return { success: false, error: errorMsg };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Channel not found. Make sure the Channel ID starts with "UC" and is 24 characters.' };
    }

    const channel = data.items[0];
    return { 
      success: true, 
      message: `Connected to "${channel.snippet.title}" (${parseInt(channel.statistics.subscriberCount).toLocaleString()} subscribers)`,
      data: { 
        channelName: channel.snippet.title, 
        channelId: channel.id, 
        subscribers: parseInt(channel.statistics.subscriberCount) 
      }
    };
  } catch (error) {
    return { success: false, error: 'Failed to connect to YouTube API' };
  }
}

async function testXConnection(bearerToken: string) {
  try {
    // Validate token format
    if (!bearerToken.startsWith('AAAA')) {
      return { success: false, error: 'Invalid Bearer Token format. It should start with "AAAA..."' };
    }

    // Test by fetching authenticated user info
    const url = 'https://api.twitter.com/2/users/me';
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${bearerToken}` }
    });
    const data = await response.json();

    if (data.errors || response.status === 401) {
      return { success: false, error: 'Invalid or expired token. Generate a new Bearer Token from the X Developer Portal.' };
    }

    if (response.status === 403) {
      return { success: false, error: 'Access forbidden. You may need a paid X API plan to post. Free tier is read-only.' };
    }

    if (data.data) {
      return { 
        success: true, 
        message: `Connected to @${data.data.username}`,
        data: { username: data.data.username, userId: data.data.id }
      };
    }

    return { success: false, error: 'Unexpected response from X API' };
  } catch (error) {
    return { success: false, error: 'Failed to connect to X API' };
  }
}

async function testLinkedInConnection(organizationId: string, accessToken: string) {
  try {
    // Test by fetching organization info
    const url = `https://api.linkedin.com/v2/organizations/${organizationId}`;
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    if (response.status === 401) {
      return { success: false, error: 'Invalid or expired token. LinkedIn tokens expire after 60 days.' };
    }

    if (response.status === 403) {
      return { success: false, error: 'Access denied. Make sure you have w_organization_social permission and are a Page admin.' };
    }

    if (response.status === 404) {
      return { success: false, error: 'Organization not found. Make sure you entered the correct Organization ID from the page URL.' };
    }

    const data = await response.json();
    
    if (data.localizedName) {
      return { 
        success: true, 
        message: `Connected to "${data.localizedName}"`,
        data: { organizationName: data.localizedName, organizationId }
      };
    }

    return { success: false, error: 'Unexpected response from LinkedIn API' };
  } catch (error) {
    return { success: false, error: 'Failed to connect to LinkedIn API' };
  }
}
