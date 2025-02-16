"use client";
import { useState, useEffect, useRef, JSX } from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream";
import {
  MessageCircle,
  User,
  Send,
  Loader,
  Sparkles,
  Zap,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Flame,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { getQueryParam } from "@/lib/util";

export interface Message {
  content: string;
  isUser: boolean;
  fireCrawlErrorMessage?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
}

interface Model {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const models: Model[] = [
  {
    id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    name: "Llama 3.3 70B Turbo",
    description: "Most capable model",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    name: "Llama 3.1 8B Turbo",
    description: "Optimized for speed and efficiency",
    icon: <Zap className="w-5 h-5" />,
  },
];

interface HelperPrompt {
  title: string;
  prompt: string;
}

const helperPrompts: HelperPrompt[] = [
  {
    title: "Crawl a Website",
    prompt:
      "Use Firecrawl to extract data from a website. Just provide the URL and I'll help you scrape the content.",
  },
  {
    title: "Ask Questions",
    prompt:
      "Feel free to ask me anything! I can help with coding, writing, analysis, and more.",
  },
  {
    title: "Get Creative",
    prompt:
      "Need creative ideas? I can help with brainstorming, story writing, or content creation.",
  },
];

// Format content sections (LLM response into JSX)
const formatMessage = (content: string) => {
  if (!content) return null;

  const inlineCodeRegex = /`([^`]+)`/g;
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  const sections = content.split(codeBlockRegex);

  return sections.map((section, index) => {
    if (index % 3 === 2) {
      // Code block processing
      return (
        <pre
          key={index}
          className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-3"
        >
          <code className="block font-mono text-sm">{section}</code>
        </pre>
      );
    }

    // Text content processing
    const lines = section?.split("\n");
    const elements: JSX.Element[] = [];

    for (let i = 0; i < lines?.length; i++) {
      const line = lines?.[i]?.trim();
      // console.log(line, "line");
      if (!line) continue;

      // Handle underline-style headers
      if (i < lines?.length - 1) {
        if (line.match(/^=+$/) || line.match(/^-+$/)) {
          i++; // Skip the underline
          continue;
        }
      }

      // Handle different header types
      if (
        (line.startsWith("#") || line.startsWith("*")) &&
        line.length < 40 &&
        (line.endsWith("#") || line.endsWith("*") || line.endsWith(":"))
      ) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold my-4">
            {line.slice(2, line?.endsWith(":") ? -3 : -2).trim()}
          </h1>
        );
        continue;
      }

      if (
        (line.startsWith("##") || line.startsWith("**")) &&
        line.length < 40 &&
        (line.endsWith("#") || line.endsWith("*") || line.endsWith(":"))
      ) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-semibold my-3">
            {line.slice(3, line?.endsWith(":") ? -4 : -3).trim()}
          </h2>
        );
        continue;
      }

      if (
        (line.startsWith("###") || line.startsWith("***")) &&
        line.length < 40 &&
        (line.endsWith("#") || line.endsWith("*") || line.endsWith(":"))
      ) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-medium my-2">
            {line.slice(4, line?.endsWith(":") ? -5 : -4).trim()}
          </h3>
        );
        continue;
      }

      // Process inline code and lists
      const processedLine = line.replace(
        inlineCodeRegex,
        "<code class='bg-gray-800 text-yellow-300 px-1.5 py-0.5 rounded-md font-mono text-sm'>$1</code>"
      );

      if (/^\d+\.\s/.test(processedLine)) {
        elements.push(
          <ol key={`ol-${i}`} className="list-decimal ml-6 mb-3">
            <li
              dangerouslySetInnerHTML={{
                __html: processedLine.replace(/^\d+\.\s/, ""),
              }}
            />
          </ol>
        );
        continue;
      }

      if (/^\*\s/.test(processedLine)) {
        elements.push(
          <ul key={`ul-${i}`} className="list-disc ml-6 mb-3">
            <li dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }} />
          </ul>
        );
        continue;
      }

      // Handle regular paragraphs
      elements.push(
        <p
          key={`p-${i}`}
          className="mb-3 text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    }

    return <div key={index}>{elements}</div>;
  });
};

export default function Index() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models?.[0]?.id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    window.innerWidth < 768 ? false : true
  );
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const chatIdFromUrl = getQueryParam("chatId");
    if (chatIdFromUrl) {
      setCurrentChatId(chatIdFromUrl);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load chat sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("chatSessions");
    if (savedSessions) {
      const parsedSessions = JSON.parse(savedSessions);
      setChatSessions(parsedSessions);

      // if (parsedSessions.length === 0) {
      //   // Perform your action here
      //   console.log("There are saved chat sessions:", parsedSessions);
      //   createNewChat();
      // }
    }
  }, []);

  // Load current chat
  useEffect(() => {
    if (currentChatId) {
      const currentChat = chatSessions?.find(
        (chat) => chat?.id === currentChatId
      );
      if (currentChat) {
        setMessages(currentChat?.messages);
        setSelectedModel(currentChat?.model);
      }
    }
  }, [currentChatId, chatSessions]);

  // Save chat sessions to localStorage
  useEffect(() => {
    localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
  }, [chatSessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewChat = () => {
    const newChatId = uuidv4();
    const newChat: ChatSession = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      model: models[0].id,
      createdAt: Date.now(),
    };
    setChatSessions((prev) => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([]);
    router.push(`/?chatId=${newChatId}`);
  };

  const createNewChatWithMessage = (messages: Message[]) => {
    // If there's no currentChatId, create a new chat
    const newChatId = uuidv4();
    const newChat: ChatSession = {
      id: newChatId,
      title: messages?.[0]?.content?.slice(0, 30) + "..." || "New Chat",
      messages,
      model: selectedModel,
      createdAt: Date.now(),
    };

    setChatSessions((prev) => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages(messages);
    setTimeout(() => {
      router.push(`/?chatId=${newChatId}`);
    });
  };

  const updateCurrentChat = (messages: Message[]) => {
    if (!currentChatId) return;

    // If chat exists, update it
    setChatSessions((prev) =>
      prev?.map((chat) => {
        if (chat?.id === currentChatId) {
          const title =
            messages?.[0]?.content?.slice(0, 30) + "..." || "New Chat";
          return {
            ...chat,
            messages,
            title: chat?.messages?.length === 0 ? title : chat?.title,
            model: selectedModel,
          };
        }
        return chat;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { content: input, isUser: true };
    const aiMessage: Message = { content: "", isUser: false };
    const newMessages = [...messages, userMessage, aiMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    if (!currentChatId) {
      createNewChatWithMessage(newMessages);
    } else {
      updateCurrentChat(newMessages);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user_123",
          messages: newMessages,
          model: selectedModel,
        }),
      });
      if (!response.body) throw new Error("No response body");

      if (response.status === 429) {
        throw new Error("Too many requests. Please try again later.");
      }

      const fireCrawlError = response.headers.get("X-Firecrawl-Error");

      console.log(fireCrawlError, "fireCrawlError");

      const stream = ChatCompletionStream.fromReadableStream(response.body);

      stream.on("content", (delta) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;

          if (lastIndex >= 0 && !newMessages?.[lastIndex]?.isUser) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: newMessages?.[lastIndex]?.content + delta,
              fireCrawlErrorMessage: fireCrawlError || "",
              isUser: false,
            };
          }

          updateCurrentChat(newMessages);
          return newMessages;
        });
      });

      stream.on("end", () => {
        setIsLoading(false);
      });

      stream.on("error", (error) => {
        console.error("Stream error:", error);
        setIsLoading(false);
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && !newMessages[lastIndex].isUser) {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content:
                newMessages[lastIndex].content + "\nError: Stream interrupted",
            };
          }
          updateCurrentChat(newMessages);
          return newMessages;
        });
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setIsLoading(false);
        const errorMessage: Message = {
          content: error?.message || "Error Fetching Response",
          isUser: false,
        };
        setMessages([...newMessages, errorMessage]);
        updateCurrentChat([...newMessages, errorMessage]);
      }
    }
  };

  const resetStates = () => {
    setMessages([]);
    setCurrentChatId("");
    setTimeout(() => {
      router.push(`/`);
    }, 0);
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setChatSessions((prev) => {
      const updatedChats = prev?.filter((chat) => chat?.id !== chatId) || [];

      if (currentChatId === chatId) {
        if (updatedChats.length > 0) {
          setCurrentChatId(updatedChats[0].id);
          setMessages(updatedChats[0].messages || []);
          setTimeout(() => {
            router.push(`/?chatId=${updatedChats[0].id}`);
          }, 0);
        } else {
          resetStates();
        }
      }

      return updatedChats;
    });
  };

  const renameChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chat = chatSessions?.find((c) => c?.id === chatId);
    if (!chat) return;

    const newTitle = prompt("Enter new chat name:", chat?.title);
    if (!newTitle) return;

    setChatSessions((prev) =>
      prev?.map((c) => (c?.id === chatId ? { ...c, title: newTitle } : c))
    );
  };

  const handleChatSelection = (chat: ChatSession) => {
    setCurrentChatId(chat?.id);
    router.push(`/?chatId=${chat?.id}`);
  };

  return (
    <div className="relative min-h-screen bg-[#343541] text-gray-100 flex">
      {/* Mobile Backdrop */}
      {isSidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 bg-[#202123] transition-transform duration-300 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-full md:w-64 p-4 flex flex-col z-30`}
      >
        <div className="flex items-center justify-between mb-4 md:hidden">
          <div className="flex items-center gap-2 text-xl font-bold text-violet-400">
            <Flame className="w-6 h-6" />
            FireChat AI
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <button
          onClick={createNewChat}
          className="flex items-center gap-2 w-full p-3 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors mb-4"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto space-y-2">
          {chatSessions?.map((chat) => (
            <div
              key={chat?.id}
              onClick={() => handleChatSelection(chat)}
              className={`w-full p-3 rounded-lg text-left hover:bg-gray-700 transition-colors flex items-center gap-2 group cursor-pointer ${
                currentChatId === chat.id ? "bg-gray-700" : ""
              }`}
            >
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate flex-1">{chat.title}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    renameChat(chat.id, e);
                  }}
                  className="p-1 hover:text-violet-400 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id, e);
                  }}
                  className="p-1 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Logo */}
      {!isMobile ? (
        <div className="absolute right-10 top-6 flex items-center gap-2 text-2xl font-bold text-violet-400">
          <Flame className="w-8 h-8" />
          FireChat AI
        </div>
      ) : null}

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className={`fixed ${
          isSidebarOpen ? "left-64" : "left-0"
        } top-4 z-20 p-2 bg-[#202123] rounded-r-lg hover:bg-gray-700 transition-all`}
      >
        {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
      </button>

      {/* Main Content */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "md:ml-64" : "ml-0"
        }`}
      >
        <div
          className={`${
            isMobile ? "max-w-[360px]" : "max-w-4xl"
          } mx-auto h-full flex flex-col`}
        >
          {/* Model Selector */}
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-8">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full sm:w-[300px] h-auto bg-[#40414f] border-0 text-white">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="bg-[#40414f] border-gray-700">
                  {models?.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className="text-white hover:bg-[#2A2B32] focus:bg-[#2A2B32]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 text-violet-400">
                          {model?.icon}
                        </div>
                        <div>
                          <div className="font-medium">{model?.name}</div>
                          <div className="text-sm text-gray-400">
                            {model?.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Messages & Helper Prompts */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6">
            {messages?.length === 0 && (
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-violet-400">
                  Welcome to FireChat AI
                </h1>
                <p className="text-gray-400 mb-8">
                  Your intelligent assistant powered by Llama 3.3. Ask me
                  anything, from coding to creative writing!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {helperPrompts?.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(prompt?.prompt)}
                      className="p-4 rounded-lg bg-[#40414f] hover:bg-[#2A2B32] transition-colors text-left"
                    >
                      <h3 className="font-medium mb-2">{prompt?.title}</h3>
                      <p className="text-sm text-gray-400">{prompt?.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pb-4">
              {messages?.map((msg, i) =>
                msg?.content || msg?.fireCrawlErrorMessage ? (
                  <div
                    key={i}
                    className={`message-animation flex items-start gap-4 p-4 ${
                      msg?.isUser ? "bg-[#343541]" : "bg-[#444654]"
                    } rounded-lg`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        msg?.isUser ? "bg-violet-500" : "bg-teal-500"
                      }`}
                    >
                      {msg?.isUser ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2 overflow-hidden">
                      {formatMessage(msg?.content)}
                      {msg?.fireCrawlErrorMessage && (
                        <span className="block text-red-500">
                          {msg?.fireCrawlErrorMessage}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null
              )}
              {isLoading && (
                <div className="message-animation flex items-start gap-4 p-4 bg-[#444654] rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="sticky bottom-0 bg-[#343541] pt-4 pb-6 px-4 sm:px-6">
            <div className="mb-2 text-center text-sm text-gray-400">
              FireChat AI can help you with various tasks including web
              crawling, coding, writing, and analysis.
            </div>

            <form onSubmit={handleSubmit} className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                className="w-full bg-[#40414f] text-white rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="Type your message..."
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !input.trim()}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
