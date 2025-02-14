import { NextResponse } from "next/server";
import axios from "axios";
import { rateLimiter } from "../../../lib/rate-limiter";

// export const runtime = 'edge';

const detectDomain = (text: string): string | null => {
  const domainRegex =
    /\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?\b/;
  const match = text.match(domainRegex);
  return match ? match[1] : null;
};

const fetchWithFirecrawl = async (url: string) => {
  console.log(process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY);
  console.log(url, "url");
  try {
    const response = await axios.post(
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
    return response.data.content;
  } catch (error) {
    console.error("Firecrawl error:", error);
    return null;
  }
};

const getLLMResponse = async (prompt: string, model: string) => {
  try {
    const response = await axios.post(
      "https://api.together.xyz/v1/chat/completions",
      {
        model,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_LLM_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("LLM API error:", error);
    return null;
  }
};

export async function POST(req: Request) {
  const { userId, message, model } = await req.json();

  // Rate limiting
  // const { success } = await rateLimiter.limit(userId);
  // if (!success) {
  //   return NextResponse.json(
  //     {
  //       error:
  //         "You've reached the maximum request limit. Please try again later.",
  //     },
  //     { status: 429 }
  //   );
  // }

  // Website detection
  const domain = detectDomain(message);
  let context = message;

  if (domain) {
    const websiteContent = await fetchWithFirecrawl(`https://${domain}`);
    if (websiteContent) {
      context = `Website content for ${domain}:\n${websiteContent}\n\nQuestion: ${message}`;
    }
  }

  // Get LLM response
  const response = await getLLMResponse(context, model);

  console.log("response", response);

  return NextResponse.json({
    response: response || "Sorry, I couldn't process that request.",
  });
}
