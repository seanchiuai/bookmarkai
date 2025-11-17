"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export default function TagManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#C85A3C");
  const [editingId, setEditingId] = useState<Id<"tags"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const tags = useQuery(api.tags.list, {});
  const createTag = useMutation(api.tags.create);
  const updateTag = useMutation(api.tags.update);
  const removeTag = useMutation(api.tags.remove);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await createTag({
        name: newName.trim(),
        color: newColor,
      });

      // Reset form
      setNewName("");
      setNewColor("#C85A3C");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating tag:", error);
      alert("Failed to create tag. Tag name might already exist.");
    }
  };

  const handleStartEdit = (tag: {
    _id: Id<"tags">;
    name: string;
    color?: string;
  }) => {
    setEditingId(tag._id);
    setEditName(tag.name);
    setEditColor(tag.color || "#C85A3C");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      await updateTag({
        id: editingId,
        name: editName.trim(),
        color: editColor,
      });

      setEditingId(null);
      setEditName("");
      setEditColor("");
    } catch (error) {
      console.error("Error updating tag:", error);
      alert("Failed to update tag. Tag name might already exist.");
    }
  };

  const handleDelete = async (id: Id<"tags">) => {
    if (!confirm("Delete this tag? It will be removed from all bookmarks.")) {
      return;
    }

    try {
      await removeTag({ id });
    } catch (error) {
      console.error("Error deleting tag:", error);
      alert("Failed to delete tag");
    }
  };

  const colorPresets = [
    "#C85A3C", // Primary
    "#7A9D87", // Green
    "#E8A87C", // Orange
    "#D4A574", // Yellow
    "#8B8682", // Gray
    "#6B7280", // Blue-gray
    "#DC2626", // Red
    "#059669", // Emerald
    "#7C3AED", // Purple
    "#DB2777", // Pink
  ];

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Tags</h3>
        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-xl hover:bg-primary-hover transition-all duration-200 font-medium"
          >
            + New Tag
          </button>
        )}
      </div>

      {/* Create form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-secondary/30 rounded-xl space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tag name"
            className="w-full px-4 py-2 bg-white border border-border rounded-xl outline-none focus:border-primary transition-colors"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium mb-2">Color:</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    newColor === color ? "border-foreground scale-110" : "border-border"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-full h-10 rounded-lg border border-border cursor-pointer"
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
                setNewColor("#C85A3C");
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tags list */}
      <div className="flex flex-wrap gap-2">
        {!tags ? (
          <div className="text-center w-full py-8 text-muted-foreground">Loading...</div>
        ) : tags.length === 0 ? (
          <div className="text-center w-full py-8 text-muted-foreground">
            No tags yet
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag._id}
              className="group relative"
            >
              {editingId === tag._id ? (
                <div className="p-4 border border-border rounded-xl bg-card space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-border rounded-xl outline-none focus:border-primary transition-colors"
                  />
                  <div>
                    <label className="block text-sm font-medium mb-2">Color:</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            editColor === color ? "border-foreground scale-110" : "border-border"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-full h-10 rounded-lg border border-border cursor-pointer"
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
                <div
                  className="px-4 py-2 rounded-xl font-medium text-white flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                  style={{ backgroundColor: tag.color || "#C85A3C" }}
                >
                  <span>{tag.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(tag)}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                      title="Edit tag"
                    >
                      <svg
                        className="w-3 h-3"
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
                      onClick={() => handleDelete(tag._id)}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                      title="Delete tag"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
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
