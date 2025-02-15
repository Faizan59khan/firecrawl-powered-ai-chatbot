import { NextResponse } from "next/server";
import axios from "axios";
import { Message } from "@/app/page";
import { Ratelimit } from "@upstash/ratelimit";
import Together from "together-ai";
import redis from "@/lib/redis";

const together = new Together({ apiKey: process.env.NEXT_PUBLIC_LLM_API_KEY! });

interface FirecrawlResponse<T extends object = {}> {
  success: boolean;
  data: {
    markdown: string;
    metadata: T;
    html: string;
  };
}

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
  tool_calls?: unknown[];
}

interface LLMChoice<T = unknown> {
  finish_reason: string;
  seed: number;
  logprobs: T | null;
  index: number;
  message: LLMMessage;
}

interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface LLMResponse<T = unknown> {
  id: string;
  object: string;
  created: number;
  model: string;
  prompt: string[];
  choices: LLMChoice<T>[];
  usage: LLMUsage;
}

export const runtime = "edge";

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(
    Number(process.env.MAX_WINDOW_REQUEST_COUNT) || 5,
    Number(process?.env.WINDOW_SIZE_IN_SECONDS)
      ? `${Number(process?.env.WINDOW_SIZE_IN_SECONDS)} s`
      : "60 s"
  ),
});

const detectDomain = (text: string): string | null => {
  const domainRegex =
    /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?\b/;
  const match = text.match(domainRegex);
  return match ? match[1] : null;
};

const fetchWithFirecrawl = async <T extends object = {}>(
  url: string
): Promise<FirecrawlResponse<T> | null> => {
  try {
    const response = await axios.post<FirecrawlResponse<T>>(
      "https://api.firecrawl.dev/v1/scrape",
      {
        url,
        formats: ["markdown", "html"],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Firecrawl error:", error);
    return null;
  }
};

export async function POST(req: Request) {
  const { userId, messages: chatMessages, model } = await req.json();

  // Rate limiting
  const { success } = await ratelimit.limit(userId);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Process latest user message
  const latestMessage = chatMessages?.[chatMessages?.length - 1];
  const processedMessage: Message = { ...latestMessage };

  let siteAccessError = null;

  // Website detection and content fetching
  const domain = detectDomain(processedMessage?.content);
  if (domain) {
    const websiteContent = await fetchWithFirecrawl(`https://${domain}`);
    if (websiteContent) {
      processedMessage.content = `Website content for ${domain}:\n${websiteContent?.data?.markdown}\n\nQuestion: ${processedMessage.content}`;
    } else {
      siteAccessError = `The site ${domain} could not be accessed. The response is based on general knowledge.`;
    }
  }

  console.log(processedMessage?.content, "processedMessage?.content");

  const formattedMessages = chatMessages
    ?.slice(0, -1)
    ?.concat(processedMessage)
    ?.map((msg: Message) => ({
      role: msg?.isUser ? "user" : "assistant",
      content: msg?.content,
    }));

  // Get LLM response as a stream
  const res = await together.chat.completions.create({
    model,
    messages: formattedMessages,
    stream: true,
  });

  const responseStream = res.toReadableStream();

  //Send fireCrawlError as a custom header
  const headers = new Headers();
  if (siteAccessError) {
    headers.set("X-Firecrawl-Error", siteAccessError);
  }

  return new Response(responseStream, { headers });
}
