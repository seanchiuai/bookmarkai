"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, MoreVertical, Edit, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { YouTubePreview } from "./youtube-preview";

interface BookmarkCardProps {
  bookmark: Doc<"bookmarks">;
  onEdit: (bookmark: Doc<"bookmarks">) => void;
  onDelete: (id: string) => void;
}

export function BookmarkCard({ bookmark, onEdit, onDelete }: BookmarkCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(bookmark.url);
    toast.success("URL copied to clipboard");
  };

  const handleOpenUrl = () => {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(bookmark.createdAt));

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* YouTube Preview or Regular Preview Image */}
      {bookmark.isYouTubeVideo ? (
        <div className="p-4 pb-0">
          <YouTubePreview
            bookmark={{
              youtubeVideoId: bookmark.youtubeVideoId,
              title: bookmark.title,
              transcript: bookmark.transcript,
              transcriptLanguage: bookmark.transcriptLanguage,
            }}
          />
        </div>
      ) : bookmark.imageUrl && !imageError ? (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={bookmark.imageUrl}
            alt={bookmark.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          {bookmark.faviconUrl ? (
            <div className="relative w-16 h-16">
              <Image
                src={bookmark.faviconUrl}
                alt=""
                fill
                className="object-contain opacity-50"
                onError={() => {}}
              />
            </div>
          ) : (
            <ExternalLink className="w-12 h-12 text-muted-foreground/30" />
          )}
        </div>
      )}

      {/* Content */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="line-clamp-2 text-base mb-1 cursor-pointer hover:text-primary" onClick={handleOpenUrl}>
              {bookmark.title}
            </CardTitle>
            {bookmark.description && (
              <CardDescription className="line-clamp-2 text-sm">
                {bookmark.description}
              </CardDescription>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenUrl}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in new tab
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyUrl}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(bookmark)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(bookmark._id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Tags */}
      {bookmark.tags.length > 0 && (
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-1.5">
            {bookmark.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {bookmark.tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{bookmark.tags.length - 4}
              </Badge>
            )}
          </div>
        </CardContent>
      )}

      {/* Footer */}
      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          {bookmark.notes && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
              Has notes
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
