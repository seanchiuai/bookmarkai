"use node";

import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { YoutubeTranscript } from "youtube-transcript";

/**
 * Helper function to detect if a URL is a YouTube video
 * Supports various YouTube URL formats
 */
export function isYouTubeUrl(url: string): boolean {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];

  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Helper function to extract video ID from YouTube URL
 * Returns the 11-character video ID or null if not found
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Action to fetch transcript from YouTube video
 * Uses youtube-transcript npm package
 * Includes 15-second timeout for safety
 */
export const fetchTranscript = action({
  args: {
    videoId: v.string(),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    try {
      // Create a promise that rejects after 15 seconds
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Transcript fetch timeout")), 15000)
      );

      // Fetch transcript with preferred language
      const transcriptPromise = YoutubeTranscript.fetchTranscript(args.videoId, {
        lang: args.preferredLanguage || "en",
      });

      // Race between fetch and timeout
      const transcriptData = await Promise.race([transcriptPromise, timeoutPromise]);

      // Combine all text segments into full transcript
      const fullTranscript = transcriptData.map((segment: any) => segment.text).join(" ");

      return {
        transcript: fullTranscript,
        language: args.preferredLanguage || "en",
      };
    } catch (error: any) {
      console.error("Transcript extraction failed:", error);

      // Provide more specific error messages
      if (error.message.includes("timeout")) {
        throw new Error("Transcript fetch timed out. Please try again.");
      }
      if (error.message.includes("disabled") || error.message.includes("unavailable")) {
        throw new Error("Transcripts are disabled for this video");
      }

      // Return null for graceful handling
      throw new Error("Failed to fetch transcript. The video may not have captions available.");
    }
  },
});

/**
 * Action to process YouTube bookmark with transcript extraction
 * This action detects YouTube URLs and extracts transcripts automatically
 * Falls back gracefully if transcript extraction fails
 */
export const processYouTubeBookmark = action({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    let transcript: string | undefined;
    let transcriptLanguage: string | undefined;
    let isYouTubeVideo = false;
    let youtubeVideoId: string | undefined;

    // Check if URL is YouTube
    if (isYouTubeUrl(args.url)) {
      isYouTubeVideo = true;
      const videoId = extractVideoId(args.url);

      if (videoId) {
        youtubeVideoId = videoId;

        try {
          // Attempt to fetch transcript
          const transcriptData = await ctx.runAction(internal.youtube.fetchTranscript, {
            videoId,
            preferredLanguage: "en",
          });

          transcript = transcriptData.transcript;
          transcriptLanguage = transcriptData.language;
        } catch (error) {
          console.error("Failed to fetch transcript, continuing without it:", error);
          // Don't fail the entire bookmark creation if transcript fails
        }
      }
    }

    // Create bookmark with enhanced data
    const bookmarkId = await ctx.runMutation(internal.bookmarks.createBookmarkInternal, {
      userId: identity.subject,
      url: args.url,
      title: args.title || args.url,
      description: args.description,
      imageUrl: args.imageUrl,
      faviconUrl: args.faviconUrl,
      collectionId: args.collectionId,
      tags: args.tags || [],
      notes: args.notes,
      transcript,
      transcriptLanguage,
      isYouTubeVideo,
      youtubeVideoId,
    });

    return bookmarkId;
  },
});

/**
 * Query to list all YouTube bookmarks for the authenticated user
 * Filtered by isYouTubeVideo flag
 */
export const getYouTubeBookmarks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_isYouTubeVideo", (q) =>
        q.eq("userId", userId).eq("isYouTubeVideo", true)
      )
      .order("desc")
      .take(args.limit || 50);

    return bookmarks;
  },
});
