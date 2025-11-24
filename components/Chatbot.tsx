"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  bookmarks?: any[];
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hi! I'm your bookmark assistant. Ask me anything about your saved bookmarks, and I'll help you find relevant information!",
      role: "assistant",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const chatWithBookmarks = useAction(api.ragBookmarks.chatWithBookmarks);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await chatWithBookmarks({
        message: input.trim(),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: result.response,
        role: "assistant",
        timestamp: Date.now(),
        bookmarks: result.bookmarks,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        role: "assistant",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatBookmarkLink = (bookmark: any) => {
    const title = bookmark.title || new URL(bookmark.url).hostname;
    return (
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline inline-flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {bookmark.faviconUrl && (
          <img
            src={bookmark.faviconUrl}
            alt=""
            className="w-4 h-4"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        {title}
      </a>
    );
  };

  const renderMessage = (message: Message) => {
    return (
      <div
        key={message.id}
        className={`flex gap-3 ${
          message.role === "user" ? "justify-end" : "justify-start"
        }`}
      >
        {message.role === "assistant" && (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
        )}

        <div
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>

          {/* Display related bookmarks if available */}
          {message.bookmarks && message.bookmarks.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs opacity-75 font-medium">Related bookmarks:</div>
              {message.bookmarks.map((bookmark, index) => (
                <div
                  key={bookmark._id}
                  className="bg-background/50 rounded-lg p-2 border border-border/50"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground">
                      [{index + 1}]
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {formatBookmarkLink(bookmark)}
                      </div>
                      {bookmark.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {bookmark.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs opacity-75 mt-2">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        {message.role === "user" && (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-secondary-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isMinimized ? "w-80 h-14" : "w-96 h-[600px]"
    }`}>
      <div className="h-full bg-background border border-border rounded-2xl shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Bookmark Assistant</h3>
              <p className="text-xs text-muted-foreground">Ask about your bookmarks</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-secondary rounded-lg transition-colors"
            >
              {isMinimized ? (
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
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              ) : (
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
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(renderMessage)}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-muted/30">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your bookmarks..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-xl resize-none outline-none focus:border-primary transition-colors text-sm"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  ) : (
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}