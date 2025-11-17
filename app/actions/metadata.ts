"use server";

import { extractMetadata } from "@/lib/metadata-extractor";

/**
 * Server action to extract metadata from a URL
 */
export async function extractUrlMetadata(url: string) {
  try {
    const metadata = await extractMetadata(url);
    return { success: true, data: metadata };
  } catch (error) {
    console.error("Error in extractUrlMetadata:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract metadata",
    };
  }
}
