"use client";

import { Message } from "ai/react";
import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { BookmarkCitation } from "./BookmarkCitation";
import { Card } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Bookmark {
  id: string;
  title: string;
  description?: string;
  url: string;
  citationNumber: number;
}

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  bookmarks?: Bookmark[];
}

export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  bookmarks = [],
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="max-w-md space-y-4">
              <h2 className="text-2xl font-semibold text-muted-foreground">
                Search Your Bookmarks
              </h2>
              <p className="text-muted-foreground">
                Ask questions about your saved bookmarks and get AI-powered answers with citations.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium">Try asking:</p>
                <ul className="space-y-1">
                  <li>"Show me articles about React performance"</li>
                  <li>"What have I saved about machine learning?"</li>
                  <li>"Find resources on Next.js deployment"</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">
                    {message.role === "user" ? "You" : "AI Assistant"}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="h-8 w-8 p-0"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-muted">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bookmark Citations */}
      {bookmarks.length > 0 && (
        <div className="border-t px-4 py-4">
          <div className="text-sm font-medium mb-2">Referenced Bookmarks</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {bookmarks.map((bookmark) => (
              <BookmarkCitation key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t px-4 py-4">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
