"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { transcribeVideoAction } from "@/app/actions/transcription";

interface TranscriptViewerProps {
  bookmarkId: Id<"bookmarks">;
  videoUrl: string;
  videoType: "youtube" | "instagram";
}

export default function TranscriptViewer({
  bookmarkId,
  videoUrl,
  videoType,
}: TranscriptViewerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  const transcript = useQuery(api.transcripts.getForBookmark, { bookmarkId });
  const createTranscript = useMutation(api.transcripts.create);

  const handleGenerateTranscript = async () => {
    setIsGenerating(true);

    try {
      const result = await transcribeVideoAction(videoUrl, videoType);

      if (result.success && result.data) {
        await createTranscript({
          bookmarkId,
          segments: result.data.segments,
          fullText: result.data.fullText,
          language: result.data.language,
          duration: result.data.duration,
        });
      } else {
        alert(`Failed to generate transcript: ${result.error}`);
      }
    } catch (error) {
      console.error("Error generating transcript:", error);
      alert("Failed to generate transcript");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSeekToSegment = (timestamp: number) => {
    setCurrentTime(timestamp);
    // In a real implementation, this would seek the video player
    // You would need to integrate with YouTube/Instagram player APIs
    console.log(`Seeking to ${timestamp}s`);
  };

  // Update active segment based on current time
  useEffect(() => {
    if (!transcript?.segments) return;

    const index = transcript.segments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    );

    if (index !== -1) {
      setActiveSegmentIndex(index);
    }
  }, [currentTime, transcript]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!transcript) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No Transcript Available</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a transcript to view time-stamped captions for this video.
          </p>
          <button
            type="button"
            onClick={handleGenerateTranscript}
            disabled={isGenerating}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-sm hover:shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate Transcript"}
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Note: This is a placeholder. Actual transcription requires API integration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Transcript
          </h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {transcript.language && (
              <span className="px-2 py-1 bg-secondary rounded-md uppercase">
                {transcript.language}
              </span>
            )}
            {transcript.duration && (
              <span>{formatTime(transcript.duration)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Transcript segments */}
      <div className="max-h-96 overflow-y-auto">
        {transcript.segments.map((segment, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleSeekToSegment(segment.timestamp)}
            className={`w-full text-left p-4 border-b border-border hover:bg-secondary/30 transition-colors ${
              index === activeSegmentIndex ? "bg-primary/10" : ""
            }`}
          >
            <div className="flex gap-4">
              <span className="flex-shrink-0 text-sm font-mono text-primary font-semibold">
                {formatTime(segment.startTime)}
              </span>
              <p
                className={`text-sm leading-relaxed ${
                  index === activeSegmentIndex
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {segment.text}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer with full text option */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2">
            <svg
              className="w-4 h-4 transition-transform group-open:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            View Full Transcript
          </summary>
          <div className="mt-4 p-4 bg-background rounded-xl text-sm leading-relaxed">
            {transcript.fullText}
          </div>
        </details>
      </div>
    </div>
  );
}
