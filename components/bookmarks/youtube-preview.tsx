"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Youtube, FileText } from "lucide-react";

interface YouTubePreviewProps {
  bookmark: {
    youtubeVideoId?: string;
    title: string;
    transcript?: string;
    transcriptLanguage?: string;
  };
}

export function YouTubePreview({ bookmark }: YouTubePreviewProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!bookmark.youtubeVideoId) return null;

  const thumbnailUrl = `https://img.youtube.com/vi/${bookmark.youtubeVideoId}/maxresdefault.jpg`;
  const wordCount = bookmark.transcript ? bookmark.transcript.split(" ").length : 0;

  return (
    <div className="space-y-2">
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        {!imageError ? (
          <Image
            src={thumbnailUrl}
            alt={bookmark.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/10 to-red-600/10">
            <Youtube className="h-16 w-16 text-red-500/30" />
          </div>
        )}
        <Badge className="absolute top-2 right-2 bg-red-600 hover:bg-red-700">
          <Youtube className="h-3 w-3 mr-1" />
          YouTube
        </Badge>
      </div>

      {bookmark.transcript && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {wordCount.toLocaleString()} words
            {bookmark.transcriptLanguage && ` (${bookmark.transcriptLanguage})`}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTranscript(true)}
          >
            View Transcript
          </Button>
        </div>
      )}

      {!bookmark.transcript && (
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <FileText className="h-4 w-4" />
          No transcript available
        </div>
      )}

      <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-600" />
              {bookmark.title} - Transcript
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] prose prose-sm dark:prose-invert">
            <p className="whitespace-pre-wrap">{bookmark.transcript}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
