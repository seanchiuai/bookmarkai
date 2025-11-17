"use server";

import { transcribeVideo } from "@/lib/video-transcriber";

/**
 * Server action to transcribe a video
 */
export async function transcribeVideoAction(
  url: string,
  videoType: "youtube" | "instagram"
) {
  // Validate URL input
  const trimmedUrl = url?.trim();

  if (!trimmedUrl) {
    return {
      success: false,
      error: "URL is required",
    };
  }

  // Validate URL format
  try {
    new URL(trimmedUrl);
  } catch {
    return {
      success: false,
      error: "Invalid URL format. Please enter a valid URL.",
    };
  }

  // Validate videoType
  if (videoType !== "youtube" && videoType !== "instagram") {
    return {
      success: false,
      error: "Invalid video type. Must be 'youtube' or 'instagram'.",
    };
  }

  try {
    const transcript = await transcribeVideo(trimmedUrl, videoType);

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
    console.error("Error in transcribeVideoAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to transcribe video",
    };
  }
}
