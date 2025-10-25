"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCollectionDialog({ open, onOpenChange }: CreateCollectionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("📁");

  const createCollection = useMutation(api.collections.createCollection);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    try {
      await createCollection({
        name,
        description: description || undefined,
        color,
        icon,
      });

      toast.success("Collection created successfully");
      onOpenChange(false);
      // Reset form
      setName("");
      setDescription("");
      setColor("#6366f1");
      setIcon("📁");
    } catch (error: any) {
      toast.error(error.message || "Failed to create collection");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work, Learning, Recipes"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this collection"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10"
              />
            </div>
            <div>
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📁"
                maxLength={2}
              />
            </div>
          </div>
          <div className="p-4 border rounded-lg" style={{ borderColor: color }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="font-semibold">{name || "Collection Name"}</div>
                <div className="text-sm text-muted-foreground">
                  {description || "Collection description"}
                </div>
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full">
            Create Collection
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
