// Netflix GraphQL API Types
interface NetflixImage {
  __typename: string;
  available: boolean;
  focalPoint: { x: number; y: number } | null;
  height: number;
  key: string;
  status: string;
  url: string;
  width: number;
}

interface ContentAdvisoryReason {
  __typename: string;
  iconId: number;
  level: string;
  text: string;
}

interface ContentAdvisory {
  __typename: string;
  boardId: number;
  boardName: string;
  certificationRatingId: number;
  certificationValue: string;
  i18nReasonsText: string;
  maturityDescription: string;
  maturityLevel: number;
  reasons: ContentAdvisoryReason[];
  videoSpecificRatingReason: string | null;
}

interface TaglineMessage {
  __typename: string;
  ctaMessage?: string | null;
  tagline: string;
  typedClassification: string;
}

interface TextEvidence {
  __typename: string;
  key: string;
  text: string;
}

interface PromoVideo {
  __typename: string;
  computeId: string;
  id: number;
  offset: number;
  video: {
    __typename: string;
    videoId: number;
  };
}

interface NetflixEntity {
  __typename: string;
  videoId: number;
  thumbsRating: string;
  title: string;
  unifiedEntityId: string;
  liveEvent: unknown;
  boxart: NetflixImage;
  boxartHighRes: NetflixImage;
  brandLogoSmall: NetflixImage | null;
  liveNow: unknown;
  storyArt: NetflixImage;
  titleLogoBranded: NetflixImage;
  titleLogoUnbranded: NetflixImage;
  availabilityStartTime: string;
  isAvailable: boolean;
  isPlayable: boolean;
  unplayableCauses: string[];
  bookmark: unknown;
  promoVideo: PromoVideo | null;
  taglineMessages: TaglineMessage[];
  isInPlaylist: boolean;
  isInRemindMeList: boolean;
  playlistActions: string[];
  watchStatus: string;
  runtimeSec: number;
  thumbRating: string;
  contentWarning: string | null;
  textEvidence: TextEvidence[];
  latestYear: number;
  contentAdvisory: ContentAdvisory;
  playbackBadges: string[];
  displayRuntimeSec: number;
  mostLikedMessages: TaglineMessage[];
  badges: string[];
}

interface NetflixGraphQLResponse {
  data: {
    unifiedEntities: NetflixEntity[];
  };
}

// Default cookies - In production, these should be stored in KV
const DEFAULT_COOKIES = ``;

async function getCookies(env: Env): Promise<string> {
  try {
    // Try to get cookies from KV first
    if (env.NETFLIX_KV) {
      const kvCookies = await env.NETFLIX_KV.get('netflix_cookies');
      if (kvCookies) {
        return kvCookies;
      }
    }
  } catch {
    console.log('KV not available, using default cookies');
  }
  return DEFAULT_COOKIES;
}

async function fetchNetflixMetadata(videoId: string, env: Env): Promise<NetflixGraphQLResponse> {
  const cookies = await getCookies(env);
  
  const response = await fetch('https://web.prod.cloud.netflix.com/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Cookie': cookies,
    },
    body: JSON.stringify({
      operationName: 'MiniModalQuery',
      variables: {
        opaqueImageFormat: 'WEBP',
        transparentImageFormat: 'WEBP',
        videoMerchEnabled: true,
        fetchPromoVideoOverride: false,
        hasPromoVideoOverride: false,
        promoVideoId: 0,
        videoMerchContext: 'BROWSE',
        isLiveEpisodic: false,
        artworkContext: {
          groupLoc: 'eyJrLnR5cGUiOiJ3aW5kb3dlZGNvbWluZ3Nvb24iLCJrLnRpbWVXaW5kb3ciOiJuZXh0d2VlayJ9',
        },
        textEvidenceUiContext: 'BOB',
        unifiedEntityIds: [`Video:${videoId}`],
      },
      extensions: {
        persistedQuery: {
          id: '96c87721-2e20-416f-aa6f-87c8a889c955',
          version: 102,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Netflix API error: ${response.status}`);
  }

  return response.json() as Promise<NetflixGraphQLResponse>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API endpoint to fetch Netflix metadata
    if (url.pathname === '/api/metadata' && request.method === 'GET') {
      const videoId = url.searchParams.get('videoId');
      
      if (!videoId) {
        return Response.json(
          { error: 'videoId parameter is required' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate videoId is numeric
      if (!/^\d+$/.test(videoId)) {
        return Response.json(
          { error: 'videoId must be a numeric value' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        const data = await fetchNetflixMetadata(videoId, env);
        return Response.json(data, { headers: corsHeaders });
      } catch (error) {
        console.error('Error fetching Netflix metadata:', error);
        return Response.json(
          { error: 'Failed to fetch metadata from Netflix' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // API endpoint to update cookies in KV (secured with API key)
    if (url.pathname === '/api/cookies' && request.method === 'POST') {
      // Check for API key in header
      const apiKey = request.headers.get('X-API-Key');
      const expectedApiKey = env.API_KEY;
      
      if (!expectedApiKey) {
        return Response.json(
          { error: 'API key not configured on server' },
          { status: 500, headers: corsHeaders }
        );
      }
      
      if (!apiKey || apiKey !== expectedApiKey) {
        return Response.json(
          { error: 'Unauthorized: Invalid or missing API key' },
          { status: 401, headers: corsHeaders }
        );
      }
      
      try {
        const body = await request.json() as { cookies: string };
        
        if (!body.cookies) {
          return Response.json(
            { error: 'cookies field is required' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (env.NETFLIX_KV) {
          await env.NETFLIX_KV.put('netflix_cookies', body.cookies);
          return Response.json(
            { success: true, message: 'Cookies updated successfully' },
            { headers: corsHeaders }
          );
        } else {
          return Response.json(
            { error: 'KV namespace not configured' },
            { status: 500, headers: corsHeaders }
          );
        }
      } catch {
        return Response.json(
          { error: 'Invalid JSON body' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() }, { headers: corsHeaders });
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
