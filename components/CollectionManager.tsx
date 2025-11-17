"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export default function CollectionManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📁");
  const [newColor, setNewColor] = useState("#C85A3C");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<Id<"collections"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const collections = useQuery(api.collections.list, {});
  const createCollection = useMutation(api.collections.create);
  const updateCollection = useMutation(api.collections.update);
  const removeCollection = useMutation(api.collections.remove);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await createCollection({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        icon: newIcon,
        color: newColor,
      });

      // Reset form
      setNewName("");
      setNewDescription("");
      setNewIcon("📁");
      setNewColor("#C85A3C");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating collection:", error);
      alert("Failed to create collection");
    }
  };

  const handleStartEdit = (collection: {
    _id: Id<"collections">;
    name: string;
    icon?: string;
    color?: string;
    description?: string;
  }) => {
    setEditingId(collection._id);
    setEditName(collection.name);
    setEditIcon(collection.icon || "📁");
    setEditColor(collection.color || "#C85A3C");
    setEditDescription(collection.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      await updateCollection({
        id: editingId,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        icon: editIcon,
        color: editColor,
      });

      setEditingId(null);
      setEditName("");
      setEditIcon("");
      setEditColor("");
      setEditDescription("");
    } catch (error) {
      console.error("Error updating collection:", error);
      alert("Failed to update collection");
    }
  };

  const handleDelete = async (id: Id<"collections">) => {
    if (!confirm("Delete this collection? Bookmarks will be moved to uncategorized.")) {
      return;
    }

    try {
      await removeCollection({ id });
    } catch (error) {
      console.error("Error deleting collection:", error);
      alert("Failed to delete collection");
    }
  };

  const iconOptions = ["📁", "💼", "🎯", "🎨", "📚", "🎵", "🎮", "💡", "🔖", "⭐"];

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Collections</h3>
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:bg-primary-hover transition-all duration-200 font-medium"
          >
            + New Collection
          </button>
        )}
      </div>

      {/* Create form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-secondary/30 rounded-xl space-y-3">
          <div className="flex gap-3">
            <select
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="w-16 px-2 py-2 bg-white border border-border rounded-xl text-center text-xl"
            >
              {iconOptions.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name"
              className="flex-1 px-4 py-2 bg-white border border-border rounded-xl outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-4 py-2 bg-white border border-border rounded-xl outline-none focus:border-primary transition-colors text-sm"
          />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Color:</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-12 h-8 rounded-lg border border-border cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:bg-primary-hover transition-all duration-200 font-medium"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewName("");
                setNewDescription("");
                setNewIcon("📁");
                setNewColor("#C85A3C");
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Collections list */}
      <div className="space-y-2">
        {!collections ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : collections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No collections yet
          </div>
        ) : (
          collections.map((collection) => (
            <div
              key={collection._id}
              className="p-4 border border-border rounded-xl hover:border-primary/30 transition-all duration-200"
            >
              {editingId === collection._id ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <select
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="w-16 px-2 py-2 bg-white border border-border rounded-xl text-center text-xl"
                    >
                      {iconOptions.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white border border-border rounded-xl outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-4 py-2 bg-white border border-border rounded-xl outline-none focus:border-primary transition-colors text-sm"
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium">Color:</label>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-12 h-8 rounded-lg border border-border cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:bg-primary-hover transition-all duration-200 font-medium"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{collection.icon}</span>
                      <h4 className="font-semibold">{collection.name}</h4>
                      {collection.color && (
                        <div
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: collection.color }}
                        />
                      )}
                    </div>
                    {collection.description && (
                      <p className="text-sm text-muted-foreground">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(collection)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all duration-200"
                      title="Edit collection"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(collection._id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
                      title="Delete collection"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
