"use server";

import { transcribeVideo } from "@/lib/video-transcriber";

/**
 * Server action to transcribe a video
 */
export async function transcribeVideoAction(
  url: string,
  videoType: "youtube" | "instagram"
) {
  try {
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
    console.error("Error in transcribeVideoAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to transcribe video",
    };
  }
}
