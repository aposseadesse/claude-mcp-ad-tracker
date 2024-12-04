const { MCPServer } = require('@modelcontextprotocol/server');
const axios = require('axios');
const cheerio = require('cheerio');

const trackerSignatures = {
  google_ads: {
    patterns: [
      'googletag',
      'google-analytics.com',
      'doubleclick.net',
      'googleadservices.com'
    ],
    type: 'advertising'
  },
  facebook: {
    patterns: [
      'connect.facebook.net',
      'facebook.com/tr',
      'fbevents.js'
    ],
    type: 'advertising'
  },
  twitter: {
    patterns: [
      'static.ads-twitter.com',
      'analytics.twitter.com'
    ],
    type: 'advertising'
  },
  linkedin: {
    patterns: [
      'platform.linkedin.com',
      'ads.linkedin.com'
    ],
    type: 'advertising'
  },
  microsoft: {
    patterns: [
      'bat.bing.com',
      'clarity.ms'
    ],
    type: 'advertising'
  }
};

async function detectTrackers(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const trackers_found = [];
    const ad_networks = new Set();

    $('script').each((_, element) => {
      const src = $(element).attr('src');
      if (!src) return;

      for (const [trackerName, trackerInfo] of Object.entries(trackerSignatures)) {
        for (const pattern of trackerInfo.patterns) {
          if (src.toLowerCase().includes(pattern)) {
            trackers_found.push({
              name: trackerName,
              type: trackerInfo.type,
              script_url: src
            });
            if (trackerInfo.type === 'advertising') {
              ad_networks.add(trackerName);
            }
            break;
          }
        }
      }
    });

    return {
      trackers_found,
      summary: {
        total_trackers: trackers_found.length,
        ad_networks: Array.from(ad_networks)
      }
    };
  } catch (error) {
    return {
      error: `Failed to fetch URL: ${error.message}`,
      trackers_found: [],
      summary: { total_trackers: 0, ad_networks: [] }
    };
  }
}

const server = new MCPServer({
  tools: {
    detect_trackers: {
      description: 'Analyzes a website for common advertising and tracking scripts',
      parameters: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            description: 'Website URL to analyze'
          }
        }
      },
      handler: async ({ url }) => {
        return await detectTrackers(url);
      }
    }
  }
});

server.listen();