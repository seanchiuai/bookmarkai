import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    // Get authenticated user from Clerk
    const { userId } = await auth();

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid request: messages array required", { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];

    if (!lastMessage.content) {
      return new Response("Invalid request: message content required", { status: 400 });
    }

    // Get relevant bookmarks and prepared prompt from Convex
    const chatContext = await convex.action(api.aiChat.streamChatResponse, {
      message: lastMessage.content,
      userId,
    });

    // Stream response using Vercel AI SDK with OpenAI GPT-5
    const result = await streamText({
      model: openai("gpt-5"),
      messages: [
        { role: "system", content: chatContext.systemPrompt },
        { role: "user", content: chatContext.userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);

    // Return user-friendly error messages
    if (error.message?.includes("Unauthorized")) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (error.message?.includes("OPENAI_API_KEY")) {
      return new Response("OpenAI API key not configured", { status: 500 });
    }

    return new Response(
      JSON.stringify({ error: "Failed to generate response" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
