"use client";

import { useChat } from "ai/react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Card } from "@/components/ui/card";
import { MessageSquare, Sparkles } from "lucide-react";

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">AI Chat</h1>
        </div>
        <p className="text-muted-foreground">
          Search your bookmarks using natural language. Ask questions and get AI-powered answers
          with citations.
        </p>
      </div>

      {/* Chat Interface */}
      <Card className="shadow-lg">
        <ChatInterface
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </Card>

      {/* Info Footer */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>
          Powered by OpenAI GPT-4. Responses are based only on your saved bookmarks.
        </p>
      </div>
    </div>
  );
}
