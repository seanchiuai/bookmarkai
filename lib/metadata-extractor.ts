/**
 * Metadata Extractor for Bookmark AI
 * Extracts title, description, images, and favicon from URLs
 */

export interface ExtractedMetadata {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
  isVideo: boolean;
  videoType?: "youtube" | "instagram";
}

/**
 * Extract metadata from a URL
 */
export async function extractMetadata(url: string): Promise<ExtractedMetadata> {
  try {
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);

    // Detect video type
    const isVideo = isVideoUrl(normalizedUrl);
    const videoType = getVideoType(normalizedUrl);

    // Fetch the HTML content
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BookmarkAI/1.0; +https://bookmark.ai)",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Extract metadata from HTML
    const metadata = parseHtmlMetadata(html, normalizedUrl);

    return {
      url: normalizedUrl,
      title: metadata.title || extractTitleFromUrl(normalizedUrl),
      description: metadata.description,
      imageUrl: metadata.imageUrl,
      faviconUrl: metadata.faviconUrl || getFaviconUrl(normalizedUrl),
      isVideo,
      videoType,
    };
  } catch (error) {
    console.error("Error extracting metadata:", error);

    // Return basic metadata on error
    return {
      url,
      title: extractTitleFromUrl(url),
      isVideo: isVideoUrl(url),
      videoType: getVideoType(url),
      faviconUrl: getFaviconUrl(url),
    };
  }
}

/**
 * Parse HTML to extract Open Graph and standard meta tags
 */
function parseHtmlMetadata(
  html: string,
  baseUrl: string
): {
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
} {
  const metadata: {
    title?: string;
    description?: string;
    imageUrl?: string;
    faviconUrl?: string;
  } = {};

  // Extract Open Graph title
  let match = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (match) metadata.title = decodeHtml(match[1]);

  // Extract Twitter title if OG not found
  if (!metadata.title) {
    match = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i);
    if (match) metadata.title = decodeHtml(match[1]);
  }

  // Extract regular title tag if still not found
  if (!metadata.title) {
    match = html.match(/<title>([^<]+)<\/title>/i);
    if (match) metadata.title = decodeHtml(match[1]);
  }

  // Extract Open Graph description
  match = html.match(
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
  );
  if (match) metadata.description = decodeHtml(match[1]);

  // Extract Twitter description if OG not found
  if (!metadata.description) {
    match = html.match(
      /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i
    );
    if (match) metadata.description = decodeHtml(match[1]);
  }

  // Extract meta description if still not found
  if (!metadata.description) {
    match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (match) metadata.description = decodeHtml(match[1]);
  }

  // Extract Open Graph image
  match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (match) metadata.imageUrl = resolveUrl(match[1], baseUrl);

  // Extract Twitter image if OG not found
  if (!metadata.imageUrl) {
    match = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (match) metadata.imageUrl = resolveUrl(match[1], baseUrl);
  }

  // Extract favicon
  match = html.match(/<link\s+[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i);
  if (match) {
    metadata.faviconUrl = resolveUrl(match[1], baseUrl);
  }

  return metadata;
}

/**
 * Normalize URL (add protocol if missing, etc.)
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Add protocol if missing
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

/**
 * Check if URL is a video URL
 */
function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|instagram\.com\/reel/i.test(url);
}

/**
 * Get video type from URL
 */
function getVideoType(url: string): "youtube" | "instagram" | undefined {
  if (/youtube\.com|youtu\.be/i.test(url)) {
    return "youtube";
  }
  if (/instagram\.com\/reel/i.test(url)) {
    return "instagram";
  }
  return undefined;
}

/**
 * Extract a title from the URL itself
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Get favicon URL from domain
 */
function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
  } catch {
    return "";
  }
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Decode HTML entities
 */
function decodeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
