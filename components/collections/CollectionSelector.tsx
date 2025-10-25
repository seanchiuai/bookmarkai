"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Id } from "@/convex/_generated/dataModel";

interface CollectionSelectorProps {
  value?: Id<"collections">;
  onChange: (value: Id<"collections"> | undefined) => void;
  allowNone?: boolean;
  onCreateNew?: () => void;
}

export function CollectionSelector({
  value,
  onChange,
  allowNone = true,
  onCreateNew,
}: CollectionSelectorProps) {
  const [open, setOpen] = useState(false);
  const collections = useQuery(api.collections.listCollections);

  const selectedCollection = collections?.find((c) => c._id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCollection ? (
            <span className="flex items-center gap-2">
              <span>{selectedCollection.icon}</span>
              <span>{selectedCollection.name}</span>
            </span>
          ) : (
            "Select collection..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search collections..." />
          <CommandList>
            <CommandEmpty>No collection found.</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="none"
                  onSelect={() => {
                    onChange(undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === undefined ? "opacity-100" : "opacity-0"
                    )}
                  />
                  None
                </CommandItem>
              )}
              {collections?.map((collection) => (
                <CommandItem
                  key={collection._id}
                  value={collection.name}
                  onSelect={() => {
                    onChange(collection._id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === collection._id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2">{collection.icon}</span>
                  <span>{collection.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {collection.bookmarkCount}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create new collection
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
