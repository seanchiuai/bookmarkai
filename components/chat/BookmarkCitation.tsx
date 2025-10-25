"use client";

import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface Bookmark {
  id: string;
  title: string;
  description?: string;
  url: string;
  citationNumber: number;
}

interface BookmarkCitationProps {
  bookmark: Bookmark;
}

export function BookmarkCitation({ bookmark }: BookmarkCitationProps) {
  return (
    <Card
      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => window.open(bookmark.url, "_blank")}
    >
      <div className="flex items-start gap-3">
        {/* Citation Number Badge */}
        <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
          {bookmark.citationNumber}
        </div>

        {/* Bookmark Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium line-clamp-1">{bookmark.title}</h4>
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
          {bookmark.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {bookmark.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{bookmark.url}</p>
        </div>
      </div>
    </Card>
  );
}
