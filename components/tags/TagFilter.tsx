"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface TagFilterProps {
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  matchMode?: "all" | "any";
  onMatchModeChange?: (mode: "all" | "any") => void;
}

export function TagFilter({
  selectedTags,
  onSelectedTagsChange,
  matchMode = "all",
  onMatchModeChange,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const allTags = useQuery(api.tags.getAllTags);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectedTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  const clearAll = () => {
    onSelectedTagsChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter by Tags
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Filter by Tags</h4>
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-auto p-0 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            {onMatchModeChange && selectedTags.length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Match mode</Label>
                <ToggleGroup
                  type="single"
                  value={matchMode}
                  onValueChange={(value) => {
                    if (value) onMatchModeChange(value as "all" | "any");
                  }}
                  className="justify-start"
                >
                  <ToggleGroupItem value="all" size="sm">
                    Match All
                  </ToggleGroupItem>
                  <ToggleGroupItem value="any" size="sm">
                    Match Any
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allTags && allTags.length > 0 ? (
                allTags.map(({ tag, count }) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    <Label
                      htmlFor={tag}
                      className="flex items-center justify-between flex-1 cursor-pointer"
                    >
                      <span className="text-sm">{tag}</span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tags found
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="ml-1 hover:text-destructive"
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
