"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog";
import { useRouter } from "next/navigation";

export default function CollectionsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const collections = useQuery(api.collections.listCollections);
  const router = useRouter();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground mt-1">
            Organize your bookmarks into themed collections
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      {collections === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold mb-2">No collections yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first collection to start organizing your bookmarks
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection._id}
              id={collection._id}
              name={collection.name}
              description={collection.description}
              color={collection.color}
              icon={collection.icon}
              bookmarkCount={collection.bookmarkCount}
              onClick={() => {
                router.push(`/dashboard/bookmarks?collection=${collection._id}`);
              }}
            />
          ))}
        </div>
      )}

      <CreateCollectionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
