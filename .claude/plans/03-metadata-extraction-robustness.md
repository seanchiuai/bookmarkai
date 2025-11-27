# Feature 3: Metadata Extraction Robustness

## Priority: MEDIUM
Improves data quality and reduces failed metadata extractions.

## Current Issues
- No retry logic for failed fetches
- Single timeout leads to failures
- No fallback strategies when metadata is incomplete
- No quality validation

## Implementation Steps

### 3.1 Add Retry Logic (`lib/metadata-extractor.ts`)

Add a retry wrapper with exponential backoff:

```typescript
async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  timeout = 10000
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error);

      if (i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }

  throw new Error('Failed to fetch after retries');
}
```

Then use this in `extractUrlMetadata`:
```typescript
export async function extractUrlMetadata(url: string) {
  try {
    const response = await fetchWithRetry(url);
    // ... rest of extraction logic
  } catch (error) {
    // ... error handling
  }
}
```

---

### 3.2 Add Fallback Metadata Sources

Enhance extraction to try multiple sources:

```typescript
interface ExtractedMetadata {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
  quality?: number; // 0-100 score
}

async function extractMetadata(html: string, url: string): Promise<ExtractedMetadata> {
  // 1. Try Open Graph tags (primary)
  let title = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i)?.[1];
  let description = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i)?.[1];
  let imageUrl = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i)?.[1];

  // 2. Fallback to Twitter Card tags
  if (!title) {
    title = html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"[^>]*>/i)?.[1];
  }
  if (!description) {
    description = html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"[^>]*>/i)?.[1];
  }
  if (!imageUrl) {
    imageUrl = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"[^>]*>/i)?.[1];
  }

  // 3. Fallback to standard meta tags
  if (!title) {
    title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  }
  if (!description) {
    description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)?.[1];
  }

  // 4. Last resort: Extract from page content
  if (!title) {
    title = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)?.[1]?.trim();
  }
  if (!description) {
    const firstP = html.match(/<p[^>]*>([^<]{10,200})<\/p>/i)?.[1]?.trim();
    if (firstP) {
      description = firstP.substring(0, 200);
    }
  }
  if (!imageUrl) {
    const firstImg = html.match(/<img[^>]*src="([^"]*)"[^>]*>/i)?.[1];
    if (firstImg && !firstImg.includes('icon') && !firstImg.includes('logo')) {
      imageUrl = firstImg;
    }
  }

  // Get favicon
  let faviconUrl = html.match(/<link[^>]*rel="(?:shortcut )?icon"[^>]*href="([^"]*)"[^>]*>/i)?.[1];
  if (!faviconUrl) {
    const urlObj = new URL(url);
    faviconUrl = `${urlObj.origin}/favicon.ico`;
  }

  // Make URLs absolute
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = new URL(imageUrl, url).href;
  }
  if (faviconUrl && !faviconUrl.startsWith('http')) {
    faviconUrl = new URL(faviconUrl, url).href;
  }

  return {
    url,
    title: title?.trim(),
    description: description?.trim(),
    imageUrl,
    faviconUrl,
  };
}
```

---

### 3.3 Add Metadata Quality Validation

```typescript
interface ValidationResult {
  isValid: boolean;
  issues: string[];
  quality: number; // 0-100
}

function validateMetadata(metadata: ExtractedMetadata): ValidationResult {
  const issues: string[] = [];
  let qualityScore = 100;

  // Title validation
  if (!metadata.title) {
    issues.push("missing_title");
    qualityScore -= 40;
  } else if (metadata.title.length < 3) {
    issues.push("title_too_short");
    qualityScore -= 20;
  } else if (metadata.title.length > 200) {
    issues.push("title_too_long");
    qualityScore -= 10;
  }

  // Description validation
  if (!metadata.description) {
    issues.push("missing_description");
    qualityScore -= 30;
  } else if (metadata.description.length < 10) {
    issues.push("description_too_short");
    qualityScore -= 15;
  }

  // Image validation
  if (!metadata.imageUrl) {
    issues.push("no_image");
    qualityScore -= 20;
  }

  // Favicon validation
  if (!metadata.faviconUrl) {
    issues.push("no_favicon");
    qualityScore -= 10;
  }

  return {
    isValid: qualityScore >= 50,
    issues,
    quality: Math.max(0, qualityScore),
  };
}

// Use in extractUrlMetadata
export async function extractUrlMetadata(url: string) {
  try {
    const response = await fetchWithRetry(url);
    const html = await response.text();
    const metadata = await extractMetadata(html, url);
    const validation = validateMetadata(metadata);

    return {
      success: true,
      data: {
        ...metadata,
        quality: validation.quality,
        issues: validation.issues,
      },
    };
  } catch (error) {
    // ...
  }
}
```

---

### 3.4 Add Metadata Refresh Capability

#### In `convex/bookmarks.ts`:

```typescript
export const refreshMetadata = mutation({
  args: {
    id: v.id("bookmarks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    // Reset metadata status to trigger re-extraction
    await ctx.db.patch(args.id, {
      metadataStatus: "pending",
      updatedAt: Date.now(),
    });

    // Note: The actual re-extraction should be triggered via the UI
    // by calling extractUrlMetadata server action again
  },
});
```

#### In UI - Add to `components/BookmarkCard.tsx`:

```typescript
const refreshMetadata = useMutation(api.bookmarks.refreshMetadata);

const handleRefreshMetadata = async () => {
  try {
    // Reset status
    await refreshMetadata({ id: bookmark._id });

    // Re-extract metadata
    const result = await extractUrlMetadata(bookmark.url);

    if (result.success && result.data) {
      // Update bookmark with new metadata
      await updateBookmark({
        id: bookmark._id,
        title: result.data.title,
        description: result.data.description,
        imageUrl: result.data.imageUrl,
        faviconUrl: result.data.faviconUrl,
      });
    }
  } catch (error) {
    console.error('Failed to refresh metadata:', error);
  }
};

// Add button to UI
<button
  onClick={handleRefreshMetadata}
  className="text-sm text-muted-foreground hover:text-foreground"
>
  Refresh Metadata
</button>
```

---

### 3.5 Add Better Error Messages

Update `app/actions/metadata.ts`:

```typescript
export async function extractUrlMetadata(url: string) {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return {
        success: false,
        error: "Invalid URL format",
      };
    }

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch (${response.status}): ${response.statusText}`,
      };
    }

    const html = await response.text();
    const metadata = await extractMetadata(html, url);
    const validation = validateMetadata(metadata);

    if (!validation.isValid) {
      console.warn('Low quality metadata:', validation.issues);
      // Still return success but with quality score
    }

    return {
      success: true,
      data: {
        ...metadata,
        quality: validation.quality,
      },
    };
  } catch (error) {
    console.error("Metadata extraction failed:", error);

    let errorMessage = "Failed to extract metadata";
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = "Request timeout - site took too long to respond";
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = "Site not found - check the URL";
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = "Connection refused - site may be down";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

---

## Testing

### Test Retry Logic
1. Use a slow/unreliable URL
2. Verify multiple retry attempts
3. Check exponential backoff timing

### Test Fallback Metadata
1. Find a site with no Open Graph tags
2. Verify fallback to Twitter Card or standard tags
3. Check that title/description are extracted

### Test Quality Validation
1. Create bookmark with rich metadata
2. Verify high quality score (90-100)
3. Create bookmark with minimal metadata
4. Verify low quality score and issues list

### Test Metadata Refresh
1. Create bookmark with poor metadata
2. Click "Refresh Metadata"
3. Verify metadata is re-extracted

---

## Success Criteria

- ✅ Metadata extraction success rate >95%
- ✅ Retry logic handles temporary failures
- ✅ Quality validation flags poor metadata
- ✅ Fallback strategies provide title/description even when primary methods fail
- ✅ Users can manually refresh metadata

---

## Files Modified

- `lib/metadata-extractor.ts` - Add retry, fallback, validation
- `app/actions/metadata.ts` - Better error messages
- `convex/bookmarks.ts` - Add refreshMetadata mutation
- `components/BookmarkCard.tsx` - Add refresh button

---

## Cost Impact

No additional costs - just improves reliability of existing functionality.

---

## Next Steps

After this feature is complete:
1. Monitor metadata extraction success rate
2. Collect examples of sites with poor metadata
3. Move to Feature 4 (RAG Management UI)
