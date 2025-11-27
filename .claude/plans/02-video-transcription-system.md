# Feature 1: Video Transcription System

## Priority: HIGH
Enables full-text search of video content and enriches embeddings with transcript data.

## Strategy
- **YouTube videos**: Use YouTube Transcript API for existing captions (free, fast)
- **Instagram Reels + YouTube videos under 5 minutes**: Use OpenAI Whisper API
- **Rationale**: Leverages existing captions when available, uses Whisper for quality transcription when needed

## Dependencies to Install
```bash
npm install youtube-transcript ytdl-core
```

## Implementation Steps

### 1.1 Update Video Transcription Logic (`lib/video-transcriber.ts`)

Replace the placeholder functions with real implementations:

#### For YouTube (with captions)

```typescript
import { YoutubeTranscript } from 'youtube-transcript';

async function transcribeYouTubeVideo(videoId: string, _url: string): Promise<VideoTranscript> {
  try {
    // Try to get existing captions first
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    return {
      segments: transcript.map(item => ({
        timestamp: item.offset / 1000,
        text: item.text,
        startTime: item.offset / 1000,
        endTime: (item.offset + item.duration) / 1000,
      })),
      fullText: transcript.map(t => t.text).join(' '),
      language: 'en',
      duration: transcript[transcript.length - 1].offset / 1000,
    };
  } catch (error) {
    console.error('YouTube captions not available:', error);
    // No captions available, fall back to Whisper for videos under 5 min
    return await transcribeWithWhisper(videoId, 'youtube');
  }
}
```

#### For Whisper fallback

```typescript
import OpenAI from 'openai';
import ytdl from 'ytdl-core';
import { Readable } from 'stream';

async function transcribeWithWhisper(
  videoIdOrUrl: string,
  videoType: 'youtube' | 'instagram'
): Promise<VideoTranscript> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    // 1. Get video info and check duration
    let audioBuffer: Buffer;
    let duration: number;

    if (videoType === 'youtube') {
      const videoUrl = `https://www.youtube.com/watch?v=${videoIdOrUrl}`;
      const info = await ytdl.getInfo(videoUrl);
      duration = parseInt(info.videoDetails.lengthSeconds);

      // Reject if > 5 minutes (300 seconds)
      if (duration > 300) {
        throw new Error('Video is longer than 5 minutes. Whisper transcription not available.');
      }

      // 2. Extract audio
      audioBuffer = await extractAudioFromYouTube(videoIdOrUrl);
    } else {
      // Instagram Reel
      audioBuffer = await extractAudioFromInstagram(videoIdOrUrl);
      duration = 0; // We'll get this from Whisper
    }

    // 3. Create a File-like object for Whisper API
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });

    // 4. Send to Whisper API with timestamp option
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });

    // 5. Format response into VideoTranscript structure
    const segments = transcription.segments?.map((seg: any) => ({
      timestamp: seg.start,
      text: seg.text,
      startTime: seg.start,
      endTime: seg.end,
    })) || [];

    return {
      segments,
      fullText: transcription.text,
      language: transcription.language || 'en',
      duration: duration || segments[segments.length - 1]?.endTime || 0,
    };
  } catch (error) {
    console.error('Whisper transcription failed:', error);
    throw error;
  }
}
```

#### Helper: Extract audio from YouTube

```typescript
async function extractAudioFromYouTube(videoId: string): Promise<Buffer> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    ytdl(videoUrl, {
      filter: 'audioonly',
      quality: 'lowestaudio',
    })
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
}
```

#### Helper: Extract audio from Instagram

```typescript
async function extractAudioFromInstagram(reelId: string): Promise<Buffer> {
  // Note: Instagram doesn't provide a public API for downloading reels
  // You'll need to use a third-party service or library
  // For now, return a placeholder that throws an error

  throw new Error('Instagram Reel audio extraction not yet implemented. Please use a service like rapidapi.com/instagram-scraper');

  // Future implementation would use something like:
  // - RapidAPI Instagram Scraper
  // - instagram-scraper npm package
  // - Custom solution with puppeteer
}
```

#### For Instagram Reels

```typescript
async function transcribeInstagramReel(reelId: string, url: string): Promise<VideoTranscript> {
  // Instagram requires audio extraction, then Whisper
  return await transcribeWithWhisper(reelId, 'instagram');
}
```

---

### 1.2 Update Transcription Status Flow (`convex/transcripts.ts`)

The schema already supports status tracking. Just ensure the `updateStatus` mutation exists:

```typescript
export const updateStatus = mutation({
  args: {
    id: v.id("transcripts"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const transcript = await ctx.db.get(args.id);
    if (!transcript || transcript.userId !== identity.subject) {
      throw new Error("Transcript not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Trigger embedding generation when transcript is complete
    if (args.status === "completed") {
      await ctx.scheduler.runAfter(0, api.embeddings.generateEmbeddingForBookmark, {
        bookmarkId: transcript.bookmarkId
      });
    }
  },
});
```

---

### 1.3 Update Server Action (`app/actions/transcription.ts`)

Ensure the action handles status updates:

```typescript
"use server";

import { transcribeVideo } from "@/lib/video-transcriber";

export async function transcribeVideoAction(
  url: string,
  videoType: "youtube" | "instagram"
) {
  try {
    // Validate inputs
    if (!url || !videoType) {
      return {
        success: false,
        error: "URL and video type are required",
      };
    }

    // Set status to processing (handled by UI)

    // Perform transcription
    const transcript = await transcribeVideo(url, videoType);

    if (!transcript) {
      return {
        success: false,
        error: "Failed to transcribe video",
      };
    }

    return {
      success: true,
      data: transcript,
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to transcribe video",
    };
  }
}
```

---

### 1.4 Update UI for Processing States (`components/TranscriptViewer.tsx`)

Add better loading states and error handling:

```typescript
// Add loading state
{isGenerating && (
  <div className="flex items-center gap-2 text-muted-foreground">
    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
    <span>Generating transcript...</span>
  </div>
)}

// Add error state
{transcript?.status === "failed" && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-red-800 font-medium">Transcription failed</p>
    <button
      onClick={handleGenerateTranscript}
      className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
    >
      Retry
    </button>
  </div>
)}

// Add processing state
{transcript?.status === "processing" && (
  <div className="flex items-center gap-2 text-blue-600">
    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
    <span>Processing transcript...</span>
  </div>
)}
```

---

### 1.5 Add Background Processing (Optional)

Create `convex/http.ts` and add:

```typescript
http.route({
  path: "/process-transcriptions",
  method: "POST",
  handler: httpAction(async (ctx) => {
    // Find video bookmarks without transcripts
    const bookmarks = await ctx.runQuery(api.bookmarks.list, {});

    const pendingVideos = bookmarks.filter((b: any) =>
      b.isVideo && !b.transcriptId
    );

    // Process up to 5 at a time
    const toProcess = pendingVideos.slice(0, 5);

    // Note: Actual transcription should happen via the UI action
    // This endpoint is for checking status and triggering retries

    return new Response(JSON.stringify({
      pendingCount: pendingVideos.length,
      processed: toProcess.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }),
});
```

---

## Testing

### YouTube with Captions
1. Find a YouTube video with captions (most popular videos)
2. Create bookmark with the URL
3. Click "Generate Transcript"
4. Verify transcript appears in <5 seconds
5. Verify segments are clickable

### YouTube without Captions (under 5 min)
1. Find a short YouTube video without captions
2. Create bookmark
3. Generate transcript
4. Verify Whisper fallback is used
5. Verify transcript completes in ~30 seconds

### YouTube over 5 minutes
1. Find a long YouTube video without captions
2. Generate transcript
3. Verify error message about video length

### Instagram Reels
1. Create bookmark with Instagram Reel URL
2. Generate transcript
3. Currently will fail with "not implemented" error
4. Future: Implement Instagram audio extraction

---

## Success Criteria

- ✅ YouTube videos with captions get transcripts in <5 seconds
- ✅ YouTube videos without captions (under 5 min) get Whisper transcripts in <30 seconds
- ✅ Transcripts have accurate timestamps
- ✅ Failed transcriptions show error messages
- ✅ Retry button works for failed transcriptions

---

## Files Modified

### New Dependencies
- `youtube-transcript` - Fetch YouTube captions
- `ytdl-core` - Download YouTube audio

### Modified Files
- `lib/video-transcriber.ts` - Replace placeholders with real APIs
- `app/actions/transcription.ts` - Add status handling
- `components/TranscriptViewer.tsx` - Add loading/error states
- `convex/transcripts.ts` - Ensure updateStatus mutation exists
- `convex/http.ts` - Add batch processing endpoint (optional)

---

## Cost Impact

### YouTube Transcript API
- **Free** - Uses existing captions

### Whisper API
- ~$0.006 per minute of audio
- 100 videos @ 3 min avg = $1.80
- Only charged for videos without captions

**Estimated monthly cost:** $1-3 for moderate usage

---

## Known Limitations

1. **Instagram Reels**: Audio extraction not implemented yet
   - Requires third-party service or puppeteer
   - Recommend using RapidAPI Instagram Scraper

2. **YouTube > 5 minutes**: Not supported for Whisper fallback
   - To reduce costs
   - Most videos have captions anyway

3. **Language Support**: Currently defaults to English
   - YouTube API provides language
   - Whisper auto-detects but we hardcode 'en'

---

## Next Steps

After this feature is complete:
1. Test with various YouTube videos
2. Verify embeddings include transcript text
3. Consider implementing Instagram Reel support
4. Move to Feature 3 (Metadata Extraction Robustness)
