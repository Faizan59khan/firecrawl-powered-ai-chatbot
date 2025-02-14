"use client";
import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  content: string;
  isUser: boolean;
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
    description: "Most capable model for diverse tasks",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: "meta-llama/Llama-3.3-13B-Instruct",
    name: "Llama 3.3 13B",
    description: "Faster, more focused responses",
    icon: <Zap className="w-5 h-5" />,
  },
];

const helperPrompts = [
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

// Function to format the message content with markdown-like styling
const formatMessage = (content: string) => {
  // Convert the string content to JSX with proper formatting
  const formattedContent = content?.split("\n")?.map((line, index) => {
    // Handle headings
    if (line.startsWith("# ")) {
      return <h1 key={index}>{line.slice(2)}</h1>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={index}>{line.slice(3)}</h2>;
    }
    if (line.startsWith("### ")) {
      return <h3 key={index}>{line.slice(4)}</h3>;
    }

    // Handle bold text
    line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Handle lists
    if (line?.match(/^\d+\./)) {
      return (
        <ol key={index} className="list-decimal ml-6">
          <li
            dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, "") }}
          />
        </ol>
      );
    }
    if (line.match(/^\* /)) {
      return (
        <ul key={index} className="list-disc ml-6">
          <li dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
        </ul>
      );
    }

    // Handle regular paragraphs
    return line ? (
      <p key={index} dangerouslySetInnerHTML={{ __html: line }} />
    ) : (
      <br key={index} />
    );
  });

  return <div className="markdown-content">{formattedContent}</div>;
};

export default function Index() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models?.[0]?.id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("chatSessions");
    if (savedSessions) {
      setChatSessions(JSON.parse(savedSessions));
    }
  }, []);

  // Load current chat
  useEffect(() => {
    if (currentChatId) {
      const currentChat = chatSessions.find(
        (chat) => chat.id === currentChatId
      );
      if (currentChat) {
        setMessages(currentChat.messages);
        setSelectedModel(currentChat.model);
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
    const newChatId = Date.now().toString();
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
  };

  const updateCurrentChat = (messages: Message[]) => {
    if (!currentChatId) return;

    setChatSessions((prev) =>
      prev.map((chat) => {
        if (chat.id === currentChatId) {
          const title =
            messages[0]?.content?.slice(0, 30) + "..." || "New Chat";
          return {
            ...chat,
            messages,
            title: chat.messages.length === 0 ? title : chat.title,
            model: selectedModel,
          };
        }
        return chat;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("yes");
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = { content: input, isUser: true };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    updateCurrentChat(updatedMessages);
    setInput("");
    setIsLoading(true);
    console.log("1");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user_123",
          message: input,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      console.log(data, "2");
      const aiMessage =
        data?.choices?.[0]?.message?.content || data?.response || data?.error;
      const finalMessages = [
        ...updatedMessages,
        { content: aiMessage, isUser: false },
      ];
      console.log(data);
      setMessages(finalMessages);
      updateCurrentChat(finalMessages);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log(error.message);
      } else {
        console.log("Unexpected error:", error);
      }
      const errorMessages = [
        ...updatedMessages,
        {
          content: "Error fetching response",
          isUser: false,
        },
      ];
      setMessages(errorMessages);
      updateCurrentChat(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId("");
      setMessages([]);
    }
  };

  const renameChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chat = chatSessions.find((c) => c.id === chatId);
    if (!chat) return;

    const newTitle = prompt("Enter new chat name:", chat.title);
    if (!newTitle) return;

    setChatSessions((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
    );
  };

  console.log("Rendering...");
  console.log("Messages:", messages);

  return (
    <div className="min-h-screen bg-[#343541] text-gray-100 flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 bg-[#202123] transition-transform duration-300 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } w-64 p-4 flex flex-col z-10`}
      >
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
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
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
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="max-w-4xl mx-auto p-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[300px] bg-[#40414f] border-0 text-white">
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
            <div className="flex items-center gap-2 text-2xl font-bold text-violet-400">
              <Flame className="w-8 h-8" />
              FireChat AI
            </div>
          </div>

          {messages?.length === 0 && (
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 text-violet-400">
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

          <div className="mb-4 space-y-4 h-[calc(100vh-240px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {messages?.map((msg, i) => (
              <div
                key={i}
                className={`message-animation flex items-start gap-4 p-4 ${
                  msg?.isUser ? "bg-[#343541]" : "bg-[#444654]"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.isUser ? "bg-violet-500" : "bg-teal-500"
                  }`}
                >
                  {msg.isUser ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 space-y-2 overflow-hidden">
                  {formatMessage(msg?.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-animation flex items-start gap-4 p-4 bg-[#444654]">
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

          <div className="mt-4 mb-4 text-center text-sm text-gray-400">
            FireChat AI can help you with various tasks including web crawling,
            coding, writing, and analysis.
          </div>

          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-[#40414f] text-white rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
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
  );
}
