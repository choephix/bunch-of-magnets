import { NextResponse } from "next/server";
import { parseMagnetLinks } from "@/app/utils/magnet";
import { chromium, Browser } from "playwright";

const TORRENT_PATHS = ["/torrent", "/download"]; // Add more paths as needed

// Enhanced browser configuration to bypass Cloudflare
const getBrowserConfig = () => ({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--no-zygote",
    "--disable-gpu",
    "--disable-web-security",
    "--disable-features=VizDisplayCompositor",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-ipc-flooding-protection",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-plugins",
    "--disable-sync",
    "--disable-translate",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-default-browser-check",
    "--safebrowsing-disable-auto-update",
    "--disable-client-side-phishing-detection",
    "--disable-component-update",
    "--disable-domain-reliability",
    "--disable-features=TranslateUI",
    "--disable-ignore-certificate-errors",
    "--disable-single-click-autofill",
    "--disable-web-resources",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-site-isolation-trials",
    "--disable-features=VizDisplayCompositor",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-ipc-flooding-protection",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-plugins",
    "--disable-sync",
    "--disable-translate",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-default-browser-check",
    "--safebrowsing-disable-auto-update",
    "--disable-client-side-phishing-detection",
    "--disable-component-update",
    "--disable-domain-reliability",
    "--disable-features=TranslateUI",
    "--disable-ignore-certificate-errors",
    "--disable-single-click-autofill",
    "--disable-web-resources",
  ],
  ignoreDefaultArgs: [
    '--enable-automation',
    '--enable-blink-features=AutomationControlled'
  ],
});

// Realistic user agents to rotate
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0",
];

// Additional configuration for different scenarios
const CONFIG = {
  maxRetries: 3,
  defaultTimeout: 30000,
  cloudflareWaitTime: 10000,
  rateLimitWaitTime: 15000,
  humanBehaviorDelay: {
    min: 500,
    max: 2000,
  },
  viewport: {
    width: 1920,
    height: 1080,
  },
  geolocation: {
    latitude: 40.7128,
    longitude: -74.0060,
  },
};

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    console.log("🌐 Fetching URL:", url);

    // Retry mechanism for failed requests
    const maxRetries = CONFIG.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
        
        const result = await attemptExtraction(url);
        return NextResponse.json({ magnetLinks: result });
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw lastError || new Error("All extraction attempts failed");
  } catch (error) {
    console.error("❌ Error extracting magnet links:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract magnet links",
      },
      { status: 500 },
    );
  }
}

async function attemptExtraction(url: string): Promise<any[]> {
  const browser = await chromium.launch(getBrowserConfig());
      const context = await browser.newContext({
      userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      viewport: CONFIG.viewport,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      geolocation: CONFIG.geolocation,
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    },
  });

  const page = await context.newPage();
  
  // Set additional page properties to appear more human-like
  await page.addInitScript(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    
    // Override permissions
    Object.defineProperty(navigator, 'permissions', {
      get: () => ({
        query: () => Promise.resolve({ state: 'granted' }),
      }),
    });

    // Override chrome runtime
    if ('chrome' in window && window.chrome) {
      Object.defineProperty((window as any).chrome, 'runtime', {
        get: () => undefined,
      });
    }

    // Override automation properties
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 1,
    });

    // Override connection
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
      }),
    });

    // Override hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });

    // Override device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });

    // Override platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    });

    // Override vendor
    Object.defineProperty(navigator, 'vendor', {
      get: () => 'Google Inc.',
    });
  });

      // Add random delay before navigation to appear more human-like
    await page.waitForTimeout(Math.random() * 2000 + 1000);
    
    // Set referrer to appear more legitimate
    await page.setExtraHTTPHeaders({
      'Referer': 'https://www.google.com/',
    });
    
    await page.goto(url, { 
      waitUntil: "domcontentloaded",
      timeout: CONFIG.defaultTimeout 
    });

      // Wait for potential anti-bot challenges to complete
    await page.waitForTimeout(5000);

        // Handle various anti-bot challenges
    await handleAntiBotChallenges(page);

    // Add human-like behavior
    await addHumanLikeBehavior(page);

    console.log("🔍 Page loaded", page.url());

  let magnetUrls: string[] = [];

  const bodyText = await page.evaluate(() => document.body.innerText);
  try {
    const json = JSON.parse(bodyText);
    console.log("📦 Detected JSON response");
    magnetUrls = await handleUserJsonUrl(json, browser);
  } catch {
    console.log("📄 Treating response as HTML/text");
    const html = await page.content();
    magnetUrls = await handleUserHtmlUrl(url, html, browser);
  }

  await page.close();
  await context.close();
  await browser.close();

  const magnetLinks = parseMagnetLinks(magnetUrls.join("\n"));
  console.log("🔍 Found magnet links:", magnetLinks.length);

  return magnetLinks;
}

/**
 * Handles various anti-bot challenges including Cloudflare
 */
async function handleAntiBotChallenges(page: any): Promise<void> {
  // Check for Cloudflare challenge
  const isCloudflareChallenge = await page.evaluate(() => {
    return document.title.includes('Cloudflare') || 
           document.body.textContent?.includes('Checking your browser') ||
           document.body.textContent?.includes('Please wait while we verify') ||
           document.querySelector('iframe[src*="cloudflare"]') !== null;
  });

  if (isCloudflareChallenge) {
    console.log("🛡️ Detected Cloudflare challenge, waiting for completion...");
    await page.waitForTimeout(CONFIG.cloudflareWaitTime);
    
    try {
      await page.waitForFunction(() => {
        return !document.title.includes('Cloudflare') && 
               !document.body.textContent?.includes('Checking your browser') &&
               !document.body.textContent?.includes('Please wait while we verify');
      }, { timeout: CONFIG.defaultTimeout });
    } catch (error) {
      console.warn("⚠️ Cloudflare challenge may not have completed, proceeding anyway");
    }
  }

  // Check for other common anti-bot challenges
  const hasAntiBotChallenge = await page.evaluate(() => {
    return document.body.textContent?.includes('Please verify you are human') ||
           document.body.textContent?.includes('Security check') ||
           document.body.textContent?.includes('Captcha') ||
           document.querySelector('iframe[src*="captcha"]') !== null ||
           document.querySelector('iframe[src*="recaptcha"]') !== null;
  });

  if (hasAntiBotChallenge) {
    console.log("🤖 Detected anti-bot challenge, waiting...");
    await page.waitForTimeout(5000);
  }

  // Check for rate limiting
  const isRateLimited = await page.evaluate(() => {
    return document.body.textContent?.includes('Too many requests') ||
           document.body.textContent?.includes('Rate limit exceeded') ||
           document.body.textContent?.includes('Please try again later') ||
           document.body.textContent?.includes('429') ||
           document.body.textContent?.includes('503');
  });

  if (isRateLimited) {
    console.log("⏱️ Detected rate limiting, waiting longer...");
    await page.waitForTimeout(CONFIG.rateLimitWaitTime);
  }
}

/**
 * Adds human-like behavior to the page
 */
async function addHumanLikeBehavior(page: any): Promise<void> {
  // Random mouse movements (simulated)
  await page.mouse.move(
    Math.random() * 800 + 100,
    Math.random() * 600 + 100
  );
  
  // Random scroll
  await page.evaluate(() => {
    window.scrollTo(0, Math.random() * 100);
  });
  
  // Random delay
  await page.waitForTimeout(Math.random() * (CONFIG.humanBehaviorDelay.max - CONFIG.humanBehaviorDelay.min) + CONFIG.humanBehaviorDelay.min);
}

/**
 * Extracts magnet URLs from an HTML string using regex pattern matching
 * @param html - The HTML string to search for magnet URLs
 * @returns Array of magnet URLs found in the HTML
 */
function extractMagnetUrls(html: string): string[] {
  const magnetRegex = /href="(magnet:\?xt=urn:btih:[^"]+)"/g;
  const matches = [...html.matchAll(magnetRegex)];
  const urls = matches.map((match) => match[1]);
  const uniqueUrls = [...new Set(urls)];
  return uniqueUrls;
}

/**
 * Recursively extracts magnet URLs from a JSON object
 * @param obj - The JSON object to search
 * @returns Array of magnet URLs found in the JSON
 */
function extractMagnetUrlsFromJson(obj: any): string[] {
  const magnetUrls: string[] = [];
  const magnetRegex = /magnet:\?xt=urn:btih:[^"]+/g;

  function traverse(current: any) {
    if (typeof current === "string") {
      const matches = current.match(magnetRegex);
      if (matches) {
        magnetUrls.push(...matches);
      }
    } else if (Array.isArray(current)) {
      current.forEach(traverse);
    } else if (typeof current === "object" && current !== null) {
      Object.values(current).forEach(traverse);
    }
  }

  traverse(obj);
  return [...new Set(magnetUrls)];
}

/**
 * Recursively extracts HTTP(S) URLs from a JSON object
 * @param obj - The JSON object to search
 * @returns Array of HTTP(S) URLs found in the JSON
 */
function extractHttpUrlsFromJson(obj: any): string[] {
  const httpUrls: string[] = [];
  const httpRegex = /https?:\/\/[^\s"']+/g;

  function traverse(current: any) {
    if (typeof current === "string") {
      const matches = current.match(httpRegex);
      if (matches) {
        httpUrls.push(...matches);
      }
    } else if (Array.isArray(current)) {
      current.forEach(traverse);
    } else if (typeof current === "object" && current !== null) {
      Object.values(current).forEach(traverse);
    }
  }

  traverse(obj);
  return [...new Set(httpUrls)];
}

/**
 * Handles a JSON response from the user's URL
 * @param json - The JSON object to process
 * @returns Array of magnet URLs found
 */
async function handleUserJsonUrl(
  json: any,
  browser: Browser,
): Promise<string[]> {
  console.log("📦 Processing JSON response");
  let magnetUrls = extractMagnetUrlsFromJson(json);

  if (magnetUrls.length === 0) {
    console.log(
      "🔍 No direct magnet links found in JSON, searching for HTTP URLs...",
    );
    const httpUrls = extractHttpUrlsFromJson(json);
    console.log("🔗 Found HTTP URLs:", httpUrls.length);
    magnetUrls = await extractMagnetLinksFromAllHtmlUrls(httpUrls, browser);
  }

  return magnetUrls;
}

/**
 * Handles an HTML response from the user's URL
 * @param url - The original URL
 * @param html - The HTML content
 * @returns Array of magnet URLs found
 */
async function handleUserHtmlUrl(
  url: string,
  html: string,
  browser: Browser,
): Promise<string[]> {
  let magnetUrls = extractMagnetUrls(html);

  if (magnetUrls.length === 0) {
    console.log("🔍 No direct magnet links found, performing deeper search...");
    magnetUrls = await performDeeperSearchOnHTML(url, html, browser);
  }

  return magnetUrls;
}

/**
 * Performs a deeper search on HTML content by following torrent page links
 */
async function performDeeperSearchOnHTML(
  originalUrl: string,
  html: string,
  browser: Browser,
): Promise<string[]> {
  const originalUrlObj = new URL(originalUrl);
  const baseUrl = `${originalUrlObj.protocol}//${originalUrlObj.host}`;

  // Extract all href URLs
  const hrefRegex = /href="([^"]+)"/g;
  const hrefMatches = [...html.matchAll(hrefRegex)];
  const allUrls = hrefMatches.map((match) => match[1]);

  console.log("🔗 All links found on page:", allUrls);

  return extractMagnetLinksFromAllHtmlUrls(
    allUrls,
    browser,
    baseUrl,
    originalUrlObj.host,
  );
}

/**
 * Extracts magnet links from a list of HTML URLs
 * @param urls - List of URLs to process
 * @param baseUrl - Base URL for resolving relative URLs
 * @param originalHost - Original host for filtering
 * @returns Array of magnet URLs found
 */
async function extractMagnetLinksFromAllHtmlUrls(
  urls: string[],
  browser: Browser,
  baseUrl?: string,
  originalHost?: string,
): Promise<string[]> {
  // Filter URLs by same host and torrent paths
  const torrentUrls = urls
    .map((href) => {
      try {
        // Handle relative URLs if baseUrl is provided
        const absoluteUrl = baseUrl ? new URL(href, baseUrl) : new URL(href);
        return absoluteUrl.toString();
      } catch {
        return null;
      }
    })
    .filter((url): url is string => {
      if (!url) return false;
      try {
        const urlObj = new URL(url);
        return (
          !originalHost || // If no originalHost provided, accept all URLs
          (urlObj.host === originalHost &&
            TORRENT_PATHS.some((path) => urlObj.pathname.startsWith(path)))
        );
      } catch {
        return false;
      }
    });

  console.log("🔗 Found potential torrent pages:", torrentUrls.length);

  const context = await browser.newContext({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    viewport: CONFIG.viewport,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: ['geolocation'],
    geolocation: CONFIG.geolocation,
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
    },
  });

  const magnetPromises = torrentUrls.map(async (url) => {
    const page = await context.newPage();
    try {
      // Set additional page properties to appear more human-like
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
        Object.defineProperty(navigator, 'permissions', {
          get: () => ({
            query: () => Promise.resolve({ state: 'granted' }),
          }),
        });
      });

      // Random delay to appear more human-like
      await page.waitForTimeout(Math.random() * 1500 + 500);
      
      // Set referrer to appear more legitimate
      await page.setExtraHTTPHeaders({
        'Referer': 'https://www.google.com/',
      });
      
      console.log("📥 Fetching torrent page:", url);
      await page.goto(url, { 
        waitUntil: "domcontentloaded",
        timeout: CONFIG.defaultTimeout 
      });
      
      // Wait for potential anti-bot challenges
      await page.waitForTimeout(3000);
      
      // Handle various anti-bot challenges
      await handleAntiBotChallenges(page);
      
      // Add human-like behavior
      await addHumanLikeBehavior(page);
      
      const pageHtml = await page.content();
      const magnets = extractMagnetUrls(pageHtml);

      if (magnets.length > 1) {
        console.warn("⚠️ Multiple magnet links found on page:", magnets);
      }

      return magnets[0];
    } catch (error) {
      console.error("❌ Error fetching torrent page:", url, error);
      return null;
    } finally {
      await page.close();
    }
  });

  const results = await Promise.all(magnetPromises);
  await context.close();
  return results.filter((magnet): magnet is string => magnet !== null);
}
