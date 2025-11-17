"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

type Tab = "all" | "pending" | "completed";

export default function TodoDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDescription, setNewTodoDescription] = useState("");
  const [editingId, setEditingId] = useState<Id<"todos"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const todos = useQuery(api.todos.list);
  const createTodo = useMutation(api.todos.create);
  const toggleComplete = useMutation(api.todos.toggleComplete);
  const removeTodo = useMutation(api.todos.remove);
  const updateTodo = useMutation(api.todos.update);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    await createTodo({
      title: newTodoTitle.trim(),
      description: newTodoDescription.trim() || undefined,
    });

    setNewTodoTitle("");
    setNewTodoDescription("");
  };

  const handleStartEdit = (todo: { _id: Id<"todos">; title: string; description?: string }) => {
    setEditingId(todo._id);
    setEditTitle(todo.title);
    setEditDescription(todo.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    await updateTodo({
      id: editingId,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    });

    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const filteredTodos = todos?.filter((todo) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return todo.status === "pending";
    if (activeTab === "completed") return todo.status === "completed";
    return true;
  });

  const pendingCount = todos?.filter((t) => t.status === "pending").length || 0;
  const completedCount = todos?.filter((t) => t.status === "completed").length || 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-semibold mb-2 tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">Keep track of what matters</p>
      </div>

      <div className="mb-8 bg-card rounded-2xl p-6 border border-border shadow-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <form onSubmit={handleCreateTodo} className="space-y-3">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-4 py-3 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground focus:bg-secondary/30 rounded-xl transition-colors"
          />
          {newTodoTitle && (
            <div className="animate-fade-in space-y-3">
              <textarea
                value={newTodoDescription}
                onChange={(e) => setNewTodoDescription(e.target.value)}
                placeholder="Add details (optional)"
                className="w-full px-4 py-3 bg-secondary/30 border-none outline-none text-sm placeholder:text-muted-foreground resize-none rounded-xl"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-primary-foreground text-sm rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-sm hover:shadow font-medium"
                >
                  Add Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTodoTitle("");
                    setNewTodoDescription("");
                  }}
                  className="px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="flex gap-2 mb-8 border-b-2 border-border animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-5 py-3 text-sm font-medium transition-all duration-200 relative ${
            activeTab === "all"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
          {activeTab === "all" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`px-5 py-3 text-sm font-medium transition-all duration-200 relative ${
            activeTab === "pending"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pending
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-semibold">
              {pendingCount}
            </span>
          )}
          {activeTab === "pending" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`px-5 py-3 text-sm font-medium transition-all duration-200 relative ${
            activeTab === "completed"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Completed
          {completedCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-chart-2/10 text-chart-2 rounded-full font-semibold">
              {completedCount}
            </span>
          )}
          {activeTab === "completed" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      <div className="space-y-3">
        {!filteredTodos ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
            {activeTab === "completed"
              ? "No completed tasks yet"
              : activeTab === "pending"
              ? "No pending tasks"
              : "No tasks yet. Add one above!"}
          </div>
        ) : (
          filteredTodos.map((todo, index) => (
            <div
              key={todo._id}
              className="group bg-card rounded-2xl p-5 border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200 animate-slide-in"
              style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}
            >
              {editingId === todo._id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-secondary/30 border-none outline-none rounded-xl focus:bg-secondary/50 transition-colors"
                    autoFocus
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-4 py-2 bg-secondary/30 border-none outline-none text-sm resize-none rounded-xl focus:bg-secondary/50 transition-colors"
                    rows={2}
                  />
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
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleComplete({ id: todo._id })}
                    className={`mt-1.5 w-6 h-6 rounded-lg border-2 flex-shrink-0 transition-all duration-200 ${
                      todo.status === "completed"
                        ? "bg-primary border-primary shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    {todo.status === "completed" && (
                      <svg
                        className="w-full h-full text-primary-foreground p-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <h3
                      className={`text-base font-medium leading-relaxed ${
                        todo.status === "completed"
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {todo.title}
                    </h3>
                    {todo.description && (
                      <p
                        className={`text-sm mt-2 leading-relaxed ${
                          todo.status === "completed"
                            ? "line-through text-muted-foreground/60"
                            : "text-muted-foreground"
                        }`}
                      >
                        {todo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(todo.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {todo.completedAt && (
                        <span className="text-xs text-chart-2 font-medium">
                          ✓ Completed {new Date(todo.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button
                      onClick={() => handleStartEdit(todo)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all duration-200"
                      title="Edit task"
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
                      onClick={() => removeTodo({ id: todo._id })}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
                      title="Delete task"
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