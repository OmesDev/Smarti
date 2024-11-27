"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { getChatCompletion } from "../services/chat";
import { IconCamera, IconSend } from "./icons";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypePrism from 'rehype-prism-plus';
import ChatHistory from '../components/ChatHistory';
import FileAttachment from '../components/FileAttachment';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/AuthModal';
import UserProfile from '../components/UserProfile';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';

interface Message {
  id: number;
  text: string;
  isSent: boolean;
  isLoading?: boolean;
  image?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
  file?: {
    name: string;
    type: string;
    size: number;
    url: string;
  };
  status?: 'sent' | 'delivered' | 'seen';
  metadata?: {
    timestamp: number;
    type?: 'code' | 'math' | 'general' | 'error' | 'warning';
    confidence?: number;
    processingTime?: number;
    suggestedFollowUps?: string[];
    codeLanguage?: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
  messages: Message[];
}

export default function Dashboard() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      text: "Hey! I'm Smarti. I can help answer your questions about your homework and schoolwork.", 
      isSent: false,
      status: 'seen'
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stagedImage, setStagedImage] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'New Chat',
      timestamp: new Date(),
      preview: 'Hey! I\'m Smarti...',
      messages: [
        { 
          id: 1, 
          text: "Hey! I'm Smarti. I can help answer your questions about your homework and schoolwork.", 
          isSent: false,
          status: 'seen'
        },
      ]
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState('1');
  const [stagedFile, setStagedFile] = useState<{
    name: string;
    type: string;
    size: number;
    url: string;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  }, []);

  // Update the useEffect to handle both messages and loading state changes
  useEffect(() => {
    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, isLoading, scrollToBottom]);

  // Add an additional scroll when images/files load
  useEffect(() => {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', scrollToBottom);
      return () => img.removeEventListener('load', scrollToBottom);
    });
  }, [messages, scrollToBottom]);

  // Keep input focused after loading state changes
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      alert('Image size must be less than 20MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      
      // Always stage the image instead of sending
      setStagedImage({
        url: base64Image,
        file: file
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    
    if (!items) return;

    const imageItem = Array.from(items).find(item => 
      item.type.indexOf('image') !== -1
    );

    if (imageItem) {
      e.preventDefault(); // Prevent pasting into input
      const file = imageItem.getAsFile();
      if (file) {
        await handleImageUpload(file); // Pass false to prevent auto-sending
      }
    }
  }, [handleImageUpload]);

  const handleFileUpload = useCallback(async (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB limit
    
    if (file.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64File = e.target?.result as string;
      
      setStagedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        url: base64File
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const sendAIRequest = async (messagesToSend: Message[]) => {
    const startTime = performance.now();
    
    // Add typing indicator with smart delay based on message length
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      text: "...",
      isSent: false,
      isLoading: true,
      metadata: {
        timestamp: Date.now(),
        type: 'general'
      }
    }]);

    setIsLoading(true);

    try {
      // Calculate dynamic delay based on previous message length
      const lastMessage = messagesToSend[messagesToSend.length - 1];
      const baseDelay = 500;
      const charDelay = Math.min(lastMessage.text.length * 2, 1000);
      const delay = baseDelay + charDelay;
      await new Promise(resolve => setTimeout(resolve, delay));

      const response = await getChatCompletion(messagesToSend);
      const contentType = detectContentType(response);
      const codeLanguage = contentType === 'code' ? detectCodeLanguage(response) : undefined;
      const suggestedFollowUps = generateFollowUpQuestions(response);
      
      const processingTime = performance.now() - startTime;
      const confidence = calculateConfidence(response);

      setMessages(prev => prev.slice(0, -1).concat({
        id: prev.length,
        text: response || "Sorry, I couldn't process that.",
        isSent: false,
        metadata: {
          timestamp: Date.now(),
          type: contentType,
          confidence,
          processingTime,
          suggestedFollowUps,
          codeLanguage
        }
      }));
    } catch (error) {
      setMessages(prev => prev.slice(0, -1).concat({
        id: prev.length,
        text: generateErrorMessage(error),
        isSent: false,
        metadata: {
          timestamp: Date.now(),
          type: 'error',
          confidence: 0,
          processingTime: performance.now() - startTime
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Add helper functions for enhanced processing
  const detectCodeLanguage = (text: string): string | undefined => {
    const languages = {
      javascript: ['const', 'let', 'var', 'function', '=>'],
      python: ['def', 'import', 'class', 'if __name__'],
      java: ['public class', 'private', 'protected'],
      typescript: ['interface', 'type', 'enum'],
      html: ['<html>', '<div>', '<body>'],
      css: ['{', 'margin:', 'padding:', '@media']
    };

    for (const [lang, patterns] of Object.entries(languages)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return lang;
      }
    }
    return undefined;
  };

  const calculateConfidence = (text: string): number => {
    // Sophisticated confidence calculation based on multiple factors
    let confidence = 0.95; // Base confidence

    // Reduce confidence for uncertain language
    const uncertaintyPhrases = ['might', 'maybe', 'possibly', 'I think', 'could be'];
    const hasUncertainty = uncertaintyPhrases.some(phrase => text.toLowerCase().includes(phrase));
    if (hasUncertainty) confidence -= 0.15;

    // Reduce confidence for very short responses
    if (text.length < 50) confidence -= 0.1;

    // Reduce confidence for responses with questions
    const questionCount = (text.match(/\?/g) || []).length;
    confidence -= questionCount * 0.05;

    return Math.max(0.5, Math.min(0.95, confidence));
  };

  const generateFollowUpQuestions = (text: string): string[] => {
    // Generate contextual follow-up questions based on the response
    const questions: string[] = [];
    
    if (text.includes('code')) {
      questions.push('Explain this code in more detail?');
      questions.push('Show an example of how to use this code?');
    }
    
    if (text.includes('error')) {
      questions.push('See common solutions for this error?');
      questions.push('Explain how to debug this issue?');
    }

    return questions.slice(0, 2); // Return max 2 questions
  };

  const generateErrorMessage = (error: any): string => {
    const errorMessages = {
      NetworkError: "I'm having trouble connecting to the server. Please check your internet connection and try again.",
      TimeoutError: "The request took too long to process. Please try again with a simpler question.",
      default: "I encountered an unexpected error. Could you please rephrase your question?"
    };

    const errorType = error?.name || 'default';
    return errorMessages[errorType as keyof typeof errorMessages] || errorMessages.default;
  };

  // Add helper function to detect content type
  const detectContentType = (text: string): 'code' | 'math' | 'general' => {
    const codeIndicators = ['```', 'function', 'const', 'let', 'var', 'class', 'import', 'export'];
    const mathIndicators = ['=', '+', '-', '*', '/', '^', 'sqrt', 'sum', 'pi', '∫', '∑'];

    const hasCode = codeIndicators.some(indicator => text.includes(indicator));
    const hasMath = mathIndicators.some(indicator => text.includes(indicator));

    if (hasCode) return 'code';
    if (hasMath) return 'math';
    return 'general';
  };

  const generateChatTitle = (message: string): string => {
    // Remove any code blocks
    const cleanMessage = message.replace(/```[\s\S]*?```/g, '');
    
    // Get first line or first X characters
    const title = cleanMessage.split('\n')[0].trim();
    
    // Truncate and clean up
    return title.length > 40 
      ? title.slice(0, 40) + '...'
      : title || 'New Chat';
  };

  const handleSend = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if ((newMessage.trim() || stagedImage || stagedFile) && !isLoading) {
      const userMessage = newMessage.trim();
      setNewMessage("");
      
      inputRef.current?.focus();
      
      const messageToAdd: Message = {
        id: messages.length + 1,
        text: userMessage,
        isSent: true,
      };

      if (stagedImage) {
        messageToAdd.image = { url: stagedImage.url };
      }

      if (stagedFile) {
        messageToAdd.file = stagedFile;
      }

      if (messageToAdd.text || messageToAdd.image || messageToAdd.file) {
        const updatedMessages = [...messages, messageToAdd];
        setMessages(updatedMessages);
        setStagedImage(null);
        setStagedFile(null);

        // Update session title if this is the first user message
        if (messages.length === 1) {
          setSessions(prev => prev.map(session => 
            session.id === currentSessionId
              ? {
                  ...session,
                  title: generateChatTitle(userMessage),
                }
              : session
          ));
        }

        await sendAIRequest(updatedMessages);
      }
    }
  };

  const handleNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat', // This will be updated after first message
      timestamp: new Date(),
      preview: "Hey! I'm Smarti...",
      messages: [
        { 
          id: 1, 
          text: "Hey! I'm Smarti. I can help answer your questions about your homework and schoolwork.", 
          isSent: false,
          status: 'seen'
        },
      ]
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
    }
  }, [sessions]);

  // Update the session when messages change
  useEffect(() => {
    setSessions(prev => prev.map(session => 
      session.id === currentSessionId
        ? {
            ...session,
            messages,
            preview: messages[messages.length - 1]?.text.slice(0, 50) + '...',
          }
        : session
    ));
  }, [messages, currentSessionId]);

  // Add this new handler function near your other handlers
  const handleDeleteSession = useCallback((sessionId: string) => {
    // Don't allow deleting the last session
    if (sessions.length <= 1) {
      return;
    }

    // Remove the session
    setSessions(prev => prev.filter(session => session.id !== sessionId));

    // If we're deleting the current session, switch to another one
    if (sessionId === currentSessionId) {
      const remainingSessions = sessions.filter(session => session.id !== sessionId);
      const newCurrentSession = remainingSessions[0];
      if (newCurrentSession) {
        setCurrentSessionId(newCurrentSession.id);
        setMessages(newCurrentSession.messages);
      }
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowAuthModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-blue-950/30 to-gray-950 p-1 sm:p-2">
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      <div className="w-full max-w-[1200px] h-[98vh] sm:h-[92vh] bg-gray-900/80 backdrop-blur-sm rounded-xl sm:rounded-3xl shadow-2xl flex flex-col border border-blue-900/30">
        <div className="flex-1 flex overflow-hidden rounded-xl sm:rounded-3xl">
          {/* ChatHistory with responsive visibility */}
          <div className="hidden md:block">
            <ChatHistory
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
              onDeleteSession={handleDeleteSession}
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            {/* Enhanced Header with responsive padding */}
            <div className="relative z-50 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm rounded-t-xl sm:rounded-t-3xl">
              <div className="flex items-center justify-between gap-3">
                {/* Mobile menu button - only show on mobile */}
                <button className="md:hidden p-2 hover:bg-blue-500/10 rounded-lg transition-colors">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <div className="flex-1 flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-semibold text-blue-100">
                    Smarti AI
                  </h1>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-xs">Online</span>
                  </div>
                </div>
                {user && <UserProfile user={user} />}
              </div>
            </div>

            {/* Messages container with responsive padding */}
            <div className="relative z-0 flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.isSent ? "justify-end" : "justify-start"} ${
                    index === messages.length - 1 ? "animate-fade-in" : ""
                  }`}
                >
                  {!message.isSent && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs sm:text-sm font-medium mr-2 mt-2 shadow-lg">
                      SM
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] sm:max-w-[85%] rounded-xl sm:rounded-2xl px-3 sm:px-5 py-2 sm:py-3 shadow-sm ${
                      message.isSent
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm"
                        : "bg-gray-800 border border-gray-700 rounded-tl-sm"
                    } ${message.isLoading ? "animate-pulse" : ""}`}
                  >
                    {message.image && (
                      <div className="mb-3 rounded-lg overflow-hidden shadow-md max-w-[300px]">
                        <Image 
                          src={message.image.url} 
                          alt="Uploaded content"
                          width={300}
                          height={300}
                          className="w-full h-auto hover:opacity-95 transition-opacity object-contain"
                        />
                      </div>
                    )}
                    {message.file && (
                      <div className="mb-3">
                        <FileAttachment
                          file={message.file}
                          className="max-w-sm"
                        />
                      </div>
                    )}
                    <div className={`text-[16px] leading-relaxed prose dark:prose-invert max-w-none 
                      [&>p]:mb-6 [&>p:last-child]:mb-0
                      [&>ul]:mb-6 [&>ol]:mb-6
                      [&>pre]:mb-6
                      [&>blockquote]:mb-6
                      [&>h1]:mt-8 [&>h1]:mb-6 [&>h1]:text-2xl [&>h1]:font-bold
                      [&>h2]:mt-7 [&>h2]:mb-5 [&>h2]:text-xl [&>h2]:font-bold
                      [&>h3]:mt-6 [&>h3]:mb-4 [&>h3]:text-lg [&>h3]:font-bold
                      [&>ul]:list-disc [&>ul]:pl-6
                      [&>ol]:list-decimal [&>ol]:pl-6
                      [&>li]:mb-3
                      [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:dark:border-gray-600 
                      [&>blockquote]:pl-6 [&>blockquote]:italic
                      [&>pre]:bg-gray-800/60 [&>pre]:backdrop-blur-sm
                      [&>pre]:border [&>pre]:border-gray-700/50
                      [&>pre]:p-5 [&>pre]:rounded-lg
                      [&>code]:text-blue-300
                      [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg
                      [&>p]:text-[16px] [&>li]:text-[16px]
                      [&>pre]:text-[15px] [&>code]:text-[15px]
                      [&>*]:leading-loose
                      ${message.metadata?.type === 'error' ? 'text-red-400' : ''}
                      ${message.metadata?.type === 'warning' ? 'text-yellow-400' : ''}
                      ${message.metadata?.confidence && message.metadata.confidence < 0.8 ? 'opacity-90' : ''}
                    `}>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex, rehypePrism]}
                      >
                        {message.text}
                      </ReactMarkdown>
                      {message.metadata?.suggestedFollowUps && message.metadata.suggestedFollowUps.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm text-gray-400">Suggested follow-up questions:</div>
                          {message.metadata.suggestedFollowUps.map((question, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setNewMessage(question);
                                inputRef.current?.focus();
                              }}
                              className="block text-[15px] text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.isSent && message.status && (
                      <div className="text-[11px] mt-1 text-blue-100 flex items-center gap-1">
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'seen' && (
                          <span className="text-blue-200">✓✓</span>
                        )}
                      </div>
                    )}
                  </div>
                  {message.isSent && (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium ml-2 mt-2 shadow-lg">
                      You
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Input Area with responsive padding */}
            <div className="p-2 sm:p-3 md:p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm rounded-b-xl sm:rounded-b-3xl">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.type.startsWith('image/')) {
                      handleImageUpload(file);
                    } else {
                      handleFileUpload(file);
                    }
                  }
                }}
              />
              
              {stagedImage && (
                <div className="mb-3 relative group">
                  <Image 
                    src={stagedImage.url} 
                    alt="Staged upload" 
                    width={300}
                    height={300}
                    className="w-32 h-32 object-cover rounded-lg border border-gray-700 shadow-md transition-transform hover:scale-105"
                  />
                  <button
                    onClick={() => setStagedImage(null)}
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-gray-900/70 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-900"
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              )}
              {stagedFile && (
                <div className="mt-3">
                  <FileAttachment
                    file={stagedFile}
                    onRemove={() => setStagedFile(null)}
                    className="max-w-sm"
                  />
                </div>
              )}
              <div className="flex gap-2 sm:gap-3 items-center bg-gray-800/80 p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-md border border-gray-700 transition-all duration-200 focus-within:shadow-lg focus-within:border-blue-500/50">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg transition-all disabled:opacity-50 group"
                  title="Upload image"
                >
                  <IconCamera className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                </button>
                
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  onPaste={handlePaste}
                  placeholder="Type or paste an image..."
                  disabled={isLoading}
                  className="flex-1 text-sm sm:text-[15px] bg-transparent focus:outline-none text-gray-200 placeholder-gray-400"
                />
                
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!newMessage.trim() && !stagedImage && !stagedFile)}
                  className="p-1.5 sm:p-2 text-blue-500 hover:bg-gray-700 rounded-lg transition-all disabled:opacity-50 group"
                  title="Send message"
                >
                  <IconSend className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              
              <div className="text-[10px] sm:text-xs text-center mt-2 text-gray-500">
                {stagedImage ? "Image ready to send • " : ""}
                {stagedFile ? "File ready to send • " : ""}
                Press Enter to send
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
