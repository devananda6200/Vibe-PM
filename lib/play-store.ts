"use server";

export interface PlayStoreScrapeResult {
  success?: boolean;
  error?: string;
  status?: number;
  packageName?: string;
  name?: string;
  reviews?: string[];
  screenshots?: string[];
  icon?: string | null;
  platform?: "android";
}

export async function scrapePlayStoreAction(
  packageNameOrUrl: string,
  hl = "en",
  gl = "US"
): Promise<PlayStoreScrapeResult> {
  const packageName = extractPackageName(packageNameOrUrl);

  if (!packageName) {
    return { error: "Package name or Play Store URL is required" };
  }

  try {
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}&hl=${hl}&gl=${gl}`;

    const response = await fetch(playStoreUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return {
        error: `Failed to fetch app page: ${response.status}`,
        status: response.status
      };
    }

    const html = await response.text();
    const name = extractAppName(html, packageName);
    const icon = extractIcon(html);
    const screenshots = extractScreenshots(html, icon);
    const pageReviews = extractReviewSnippets(html);
    const batchReviews = await fetchBatchReviews(packageName, hl, gl, 80);
    const reviews = dedupe([...batchReviews, ...pageReviews]).slice(0, 120);

    return {
      success: true,
      packageName,
      name,
      reviews,
      screenshots: screenshots.slice(0, 10),
      icon,
      platform: "android"
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to scrape Play Store";
    return { error: errorMessage };
  }
}

async function fetchBatchReviews(
  packageName: string,
  hl: string,
  gl: string,
  count: number
) {
  const payload = [
    [
      [
        "oCPfdb",
        JSON.stringify([
          null,
          [2, 2, [count], null, [null, null, null, null, null, null, null, null, 2]],
          [packageName, 7]
        ]),
        null,
        "generic"
      ]
    ]
  ];
  const response = await fetch(
    `https://play.google.com/_/PlayStoreUi/data/batchexecute?rpcids=oCPfdb&source-path=/store/apps/details&hl=${hl}&gl=${gl}`,
    {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      body: new URLSearchParams({ "f.req": JSON.stringify(payload) }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return [];
  }

  const raw = await response.text();
  const jsonText = raw.match(/\)\]}'\n\n([\s\S]+)/)?.[1] ?? raw;

  try {
    const outer = JSON.parse(jsonText) as unknown[];
    const innerText = Array.isArray(outer[0]) ? outer[0][2] : null;

    if (typeof innerText !== "string") {
      return [];
    }

    const inner = JSON.parse(innerText) as unknown[];
    const reviews = Array.isArray(inner[0]) ? inner[0] : [];

    return reviews
      .map((review) =>
        Array.isArray(review) && typeof review[4] === "string"
          ? cleanReviewText(review[4])
          : ""
      )
      .filter(isUsefulReview);
  } catch {
    return [];
  }
}

function extractPackageName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("id")?.trim() ?? "";
  } catch {
    return trimmed
      .replace(/^id=/, "")
      .replace(/[?#].*$/, "")
      .trim();
  }
}

function extractAppName(html: string, fallback: string) {
  const metaPatterns = [
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i,
    /<meta[^>]+name="twitter:title"[^>]+content="([^"]+)"/i,
    /<h1[^>]*>\s*<span[^>]*>([^<]+)<\/span>\s*<\/h1>/i
  ];

  for (const pattern of metaPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return cleanAppName(match[1], fallback);
    }
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

  if (!titleMatch) {
    return fallback;
  }

  return cleanAppName(titleMatch[1], fallback);
}

function cleanAppName(value: string, fallback: string) {
  const name = decodeHtml(value)
    .replace(" - Apps on Google Play", "")
    .replace(" - Google Play", "")
    .trim();

  return name || fallback;
}

function extractScreenshots(html: string, icon: string | null) {
  const screenshots: string[] = [];
  const specificScreenshots: string[] = [];
  let match: RegExpExecArray | null;

  const srcsetRegex =
    /srcset="([^"]*play-lh\.googleusercontent\.com[^"]+)"/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const urls = match[1].split(",").map((item) => item.trim().split(" ")[0]);

    for (const url of urls) {
      addScreenshot(screenshots, url);
    }
  }

  const imgRegex =
    /(?:src|data-src)="(https:\/\/play-lh\.googleusercontent\.com\/[^"]+)"/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    addScreenshot(screenshots, match[1]);
  }

  const specificScreenshotRegex =
    /<img[^>]+src="([^"]+)"[^>]+itemprop="screenshot"[^>]*>/gi;
  while ((match = specificScreenshotRegex.exec(html)) !== null) {
    addScreenshot(specificScreenshots, match[1]);
  }

  const sourceScreenshots = specificScreenshots.length
    ? specificScreenshots
    : screenshots;

  return sourceScreenshots.filter((url) => {
    if (!icon) {
      return true;
    }

    return !url.includes(icon.split("=")[0]);
  });
}

function addScreenshot(screenshots: string[], rawUrl: string) {
  if (!rawUrl.includes("play-lh.googleusercontent.com")) {
    return;
  }

  if (
    rawUrl.includes("=s48") ||
    rawUrl.includes("=s72") ||
    rawUrl.includes("=s96") ||
    rawUrl.includes("=s180")
  ) {
    return;
  }

  if (!isLikelyScreenshot(rawUrl)) {
    return;
  }

  let url = rawUrl;

  if (url.includes("=w")) {
    url = url.replace(/=w\d+-h\d+/, "=w1920-h1080");
  } else if (url.includes("=s")) {
    url = url.replace(/=s\d+/, "=s1920");
  }

  if (!screenshots.includes(url)) {
    screenshots.push(url);
  }
}

function isLikelyScreenshot(url: string) {
  if (url.includes("=w") && url.includes("-h")) {
    const wMatch = url.match(/=w(\d+)/);
    const hMatch = url.match(/-h(\d+)/);

    if (wMatch && hMatch) {
      const width = Number.parseInt(wMatch[1], 10);
      const height = Number.parseInt(hMatch[1], 10);

      if (width === height) {
        return false;
      }

      if (width < 400 && height < 400) {
        return false;
      }
    }
  } else if (url.includes("=s")) {
    const sizeMatch = url.match(/=s(\d+)/);

    if (sizeMatch && Number.parseInt(sizeMatch[1], 10) < 400) {
      return false;
    }
  }

  return true;
}

function extractIcon(html: string) {
  let icon: string | null = null;

  const iconRegex = /<img[^>]+src="([^"]+)"[^>]+itemprop="image"[^>]*>/i;
  const iconMatch = html.match(iconRegex);

  if (iconMatch) {
    icon = iconMatch[1];
  } else {
    const classRegex =
      /<img[^>]+src="([^"]+)"[^>]+class="T75of [^"]+"[^>]*>/i;
    const classMatch = html.match(classRegex);

    if (classMatch) {
      icon = classMatch[1];
    }
  }

  if (!icon) {
    const imgTagRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    let imgMatch: RegExpExecArray | null;

    while ((imgMatch = imgTagRegex.exec(html)) !== null) {
      const imgTag = imgMatch[0];
      const src = imgMatch[1];
      const wMatch = imgTag.match(/width="(\d+)"/);
      const hMatch = imgTag.match(/height="(\d+)"/);

      if (wMatch && hMatch) {
        const width = Number.parseInt(wMatch[1], 10);
        const height = Number.parseInt(hMatch[1], 10);

        if (
          width === height &&
          width > 64 &&
          src.includes("play-lh.googleusercontent.com")
        ) {
          icon = src;
          break;
        }
      }
    }
  }

  if (!icon) {
    return null;
  }

  if (icon.includes("=s")) {
    return icon.replace(/=s\d+/, "=s512");
  }

  if (icon.includes("=w")) {
    return icon.replace(/=w\d+-h\d+/, "=s512");
  }

  return `${icon}=s512`;
}

function extractReviewSnippets(html: string) {
  const candidates: string[] = [];
  const decodedHtml = decodeEscapedJson(decodeHtml(html));

  collectReviewPattern(
    candidates,
    decodedHtml,
    /<div[^>]+class="[^"]*\bh3YV2d\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  );
  collectReviewPattern(
    candidates,
    decodedHtml,
    /<span[^>]+jsname="bN97Pc"[^>]*>([\s\S]*?)<\/span>/gi
  );
  collectReviewPattern(
    candidates,
    decodedHtml,
    /"reviewText"\s*:\s*"((?:\\"|[^"])*)"/gi
  );
  collectReviewPattern(
    candidates,
    decodedHtml,
    /\[\s*"((?:\\"|[^"]){35,600})"\s*,\s*\d(?:\.\d+)?\s*,/gi
  );

  return dedupe(
    candidates
      .map((candidate) => cleanReviewText(candidate))
      .filter(isLikelyReview)
  ).slice(0, 80);
}

function collectReviewPattern(
  candidates: string[],
  html: string,
  pattern: RegExp
) {
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    candidates.push(match[1]);
  }
}

function cleanReviewText(value: string) {
  return decodeEscapedJson(stripTags(value))
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function isLikelyReview(value: string) {
  if (value.length < 25 || value.length > 700) {
    return false;
  }

  if (!/[.!?]/.test(value)) {
    return false;
  }

  if (/^(privacy policy|terms of service|google play|sign in|loading)/i.test(value)) {
    return false;
  }

  if (/(play\.google|googleusercontent|schema\.org|javascript:)/i.test(value)) {
    return false;
  }

  const words = value.split(/\s+/);
  return words.length >= 5;
}

function isUsefulReview(value: string) {
  if (value.length < 12 || value.length > 900) {
    return false;
  }

  if (/(play\.google|googleusercontent|schema\.org|javascript:)/i.test(value)) {
    return false;
  }

  return value.split(/\s+/).length >= 3;
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeEscapedJson(value: string) {
  return value
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ");
}

function dedupe(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}
