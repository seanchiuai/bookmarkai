# Feature 5: Video Player Integration

## Priority: LOW
Enhances UX by embedding video players with transcript synchronization.

## Overview
Embed YouTube and Instagram players directly in the UI with synchronized transcript highlighting and seeking.

## Dependencies to Install
```bash
npm install react-youtube @types/react-youtube
```

## Implementation Steps

### 5.1 Create Video Player Component (`components/VideoPlayer.tsx` - NEW)

```typescript
"use client";

import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import YouTube, { YouTubePlayer } from "react-youtube";

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
}

interface VideoPlayerProps {
  videoUrl: string;
  videoType: "youtube" | "instagram";
  onTimeUpdate?: (currentTime: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ videoUrl, videoType, onTimeUpdate }, ref) => {
    const [player, setPlayer] = useState<YouTubePlayer | null>(null);
    const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

    // Extract video ID
    const extractYouTubeId = (url: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      return null;
    };

    const videoId = extractYouTubeId(videoUrl);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (player) {
          player.seekTo(seconds, true);
        }
      },
      getCurrentTime: () => {
        if (player) {
          return player.getCurrentTime();
        }
        return 0;
      },
    }));

    const handleReady = (event: { target: YouTubePlayer }) => {
      setPlayer(event.target);
    };

    const handleStateChange = (event: { target: YouTubePlayer; data: number }) => {
      // data: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
      if (event.data === 1) {
        // Playing - start time update polling
        if (timeUpdateInterval.current) {
          clearInterval(timeUpdateInterval.current);
        }

        timeUpdateInterval.current = setInterval(() => {
          if (player && onTimeUpdate) {
            const currentTime = player.getCurrentTime();
            onTimeUpdate(currentTime);
          }
        }, 500); // Update every 500ms
      } else {
        // Not playing - stop polling
        if (timeUpdateInterval.current) {
          clearInterval(timeUpdateInterval.current);
          timeUpdateInterval.current = null;
        }
      }
    };

    if (videoType === "youtube" && videoId) {
      return (
        <div className="aspect-video w-full rounded-lg overflow-hidden">
          <YouTube
            videoId={videoId}
            onReady={handleReady}
            onStateChange={handleStateChange}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                modestbranding: 1,
                rel: 0,
              },
            }}
            className="w-full h-full"
          />
        </div>
      );
    }

    if (videoType === "instagram") {
      return (
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
          <iframe
            src={videoUrl.replace("/reel/", "/p/") + "/embed"}
            className="w-full h-full"
            frameBorder="0"
            scrolling="no"
            allowFullScreen
          />
        </div>
      );
    }

    return (
      <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load video player</p>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
```

---

### 5.2 Update TranscriptViewer to Use Player

Update `components/TranscriptViewer.tsx`:

```typescript
import { VideoPlayer, VideoPlayerRef } from "./VideoPlayer";
import { useRef, useState } from "react";

export default function TranscriptViewer({
  bookmarkId,
  videoUrl,
  videoType,
}: TranscriptViewerProps) {
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  // ... existing state and mutations ...

  const handleSeekToTimestamp = (timestamp: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(timestamp);
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);

    // Update active segment based on current time
    if (transcript?.segments) {
      const index = transcript.segments.findIndex(
        (seg) => time >= seg.startTime && time < seg.endTime
      );
      if (index !== -1) {
        setActiveSegmentIndex(index);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <VideoPlayer
        ref={videoPlayerRef}
        videoUrl={videoUrl}
        videoType={videoType}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Transcript UI */}
      {transcript && (
        <div className="space-y-2">
          <h3 className="font-semibold">Transcript</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transcript.segments.map((segment, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  index === activeSegmentIndex
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-muted hover:bg-muted/80"
                }`}
                onClick={() => handleSeekToTimestamp(segment.timestamp)}
              >
                <div className="flex gap-3">
                  <span className="text-sm text-muted-foreground font-mono">
                    {formatTime(segment.timestamp)}
                  </span>
                  <span className="text-sm">{segment.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Transcript Button */}
      {!transcript && (
        <button
          onClick={handleGenerateTranscript}
          disabled={isGenerating}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          {isGenerating ? "Generating..." : "Generate Transcript"}
        </button>
      )}
    </div>
  );
}
```

---

### 5.3 Create Expanded Bookmark View

Create `components/BookmarkDetailView.tsx`:

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import TranscriptViewer from "./TranscriptViewer";

interface BookmarkDetailViewProps {
  bookmarkId: Id<"bookmarks">;
  onClose: () => void;
}

export default function BookmarkDetailView({
  bookmarkId,
  onClose,
}: BookmarkDetailViewProps) {
  const bookmark = useQuery(api.bookmarks.get, { id: bookmarkId });

  if (!bookmark) {
    return <div>Loading...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{bookmark.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metadata */}
          <div>
            <h3 className="font-semibold mb-2">Details</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">URL: </span>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {bookmark.url}
                </a>
              </div>
              {bookmark.description && (
                <div>
                  <span className="text-muted-foreground">Description: </span>
                  {bookmark.description}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Created: </span>
                {new Date(bookmark.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Video Player + Transcript */}
          {bookmark.isVideo && (
            <TranscriptViewer
              bookmarkId={bookmark._id}
              videoUrl={bookmark.url}
              videoType={bookmark.videoType!}
            />
          )}

          {/* Image Preview */}
          {bookmark.imageUrl && !bookmark.isVideo && (
            <div>
              <h3 className="font-semibold mb-2">Preview</h3>
              <img
                src={bookmark.imageUrl}
                alt={bookmark.title || "Bookmark preview"}
                className="rounded-lg max-h-96 object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 5.4 Add Detail View to BookmarkCard

Update `components/BookmarkCard.tsx`:

```typescript
import { useState } from "react";
import BookmarkDetailView from "./BookmarkDetailView";

export default function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  // ... existing code ...

  return (
    <>
      <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
        {/* ... existing card content ... */}

        {/* Add "View Details" button */}
        {bookmark.isVideo && (
          <button
            onClick={() => setShowDetail(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            View with Player
          </button>
        )}
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <BookmarkDetailView
          bookmarkId={bookmark._id}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  );
}
```

---

## Testing

### YouTube Video Player
1. Create a YouTube bookmark
2. Generate transcript
3. Click "View with Player"
4. Verify video plays
5. Click transcript segments
6. Verify video seeks to timestamp
7. Play video and verify active segment highlights

### Instagram Reel Player
1. Create Instagram Reel bookmark
2. Click "View with Player"
3. Verify player embeds correctly
4. Note: Seeking may not work with Instagram embeds

### Synchronization
1. Play YouTube video
2. Watch transcript highlight move with playback
3. Pause and click different segment
4. Verify video seeks correctly
5. Resume playback
6. Verify highlighting continues

---

## Success Criteria

- ✅ YouTube videos play embedded
- ✅ Instagram Reels play embedded
- ✅ Clicking transcript timestamps seeks video
- ✅ Video playback highlights current transcript segment
- ✅ Detail modal provides clean viewing experience

---

## Files Created

### New Components
- `components/VideoPlayer.tsx` - Player wrapper with ref API
- `components/BookmarkDetailView.tsx` - Expanded view modal

### Modified Files
- `components/TranscriptViewer.tsx` - Integrate player, add seeking
- `components/BookmarkCard.tsx` - Add "View with Player" button

---

## Known Limitations

1. **Instagram Seeking**: Instagram embeds may not support programmatic seeking
2. **Autoplay**: Most browsers block autoplay without user interaction
3. **Mobile**: Player size may need responsive adjustments
4. **Performance**: Multiple players on same page may impact performance

---

## Future Enhancements

1. **Picture-in-Picture**: Allow video to float while browsing
2. **Playback Speed**: Add controls for 1.25x, 1.5x, 2x speed
3. **Keyboard Shortcuts**: Space to play/pause, arrow keys to seek
4. **Transcript Search**: Highlight search terms in transcript
5. **Download Transcript**: Export transcript as text file

---

## Next Steps

After this feature is complete:
1. Test with various video types
2. Gather user feedback on player UX
3. Consider performance optimizations
4. All features complete!
