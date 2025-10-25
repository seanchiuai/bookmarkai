"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Folder } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CollectionCardProps {
  id: Id<"collections">;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  bookmarkCount: number;
  onClick: () => void;
  onEdit?: () => void;
}

export function CollectionCard({
  id,
  name,
  description,
  color = "#6366f1",
  icon = "📁",
  bookmarkCount,
  onClick,
  onEdit,
}: CollectionCardProps) {
  const deleteCollection = useMutation(api.collections.deleteCollection);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async (orphanAction: "unassign" | "delete") => {
    try {
      const result = await deleteCollection({ id, orphanAction });
      toast.success(`Collection deleted. ${result.orphanedCount} bookmark(s) ${orphanAction === "delete" ? "deleted" : "unassigned"}.`);
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete collection");
    }
  };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow group relative"
        onClick={onClick}
        style={{ borderLeftColor: color, borderLeftWidth: "4px" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              {name}
            </span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description || "No description"}</p>
          <div className="flex items-center gap-2 mt-3">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{bookmarkCount} bookmark{bookmarkCount !== 1 ? "s" : ""}</p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              This collection contains {bookmarkCount} bookmark{bookmarkCount !== 1 ? "s" : ""}. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete("unassign")}>
              Keep Bookmarks
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleDelete("delete")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
