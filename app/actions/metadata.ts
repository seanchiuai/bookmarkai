"use server";

import { extractMetadata } from "@/lib/metadata-extractor";

/**
 * Server action to extract metadata from a URL
 */
export async function extractUrlMetadata(url: string) {
  // Validate input URL
  const trimmedUrl = url?.trim();

  if (!trimmedUrl) {
    return {
      success: false,
      error: "URL is required",
    };
  }

  // Validate URL format
  try {
    new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
  } catch {
    return {
      success: false,
      error: "Invalid URL format. Please enter a valid URL.",
    };
  }

  try {
    const metadata = await extractMetadata(trimmedUrl);
    return { success: true, data: metadata };
  } catch (error) {
    console.error("Error in extractUrlMetadata:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract metadata",
    };
  }
}
