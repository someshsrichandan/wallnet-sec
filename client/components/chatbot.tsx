"use client";

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, Shield, Lock, Eye, Zap, Headset, Banknote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const Chatbot: React.FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Define allowed paths where the chatbot should be visible
  const allowedPaths = [
    '/',
    '/how-it-works',
    '/developers',
    '/docs',
    '/contact'
  ];

  // Check if current path is allowed or starts with /admin (to include login/signup)
  const isVisible = allowedPaths.includes(pathname) || pathname.startsWith('/admin/');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m the WallNet-Sec Security Assistant. I can help with integration, API technicalities, and platform security. How can I assist you?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "How does it work?",
    "API integration",
    "Security formula",
    "Pricing & Custom",
    "Demo links"
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  // Don't render if not on an allowed path
  if (!isVisible) return null;

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    // Use setTimeout to ensure the input state is updated before sending
    setTimeout(() => {
      const sendBtn = document.getElementById('chat-send-btn');
      sendBtn?.click();
    }, 100);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInput }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ ${error instanceof Error ? error.message : 'Connection error.'}`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full w-14 h-14 p-0 bg-gradient-to-r from-blue-600 to-slate-700 hover:from-blue-700 hover:to-slate-800 border-2 border-slate-600 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {isOpen ? <X size={24} /> : <Shield size={24} />}
        </Button>
        {!isOpen && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        )}
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-slate-900 dark:bg-slate-950 rounded-lg shadow-2xl border border-slate-700 z-50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-blue-900 to-slate-800 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-none flex items-center gap-1.5 pt-1">
                    WallNet-Sec Assistant
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 opacity-80">
                    <span className="text-[10px] flex items-center gap-0.5"><Zap className="w-3 h-3 text-yellow-400" /> AI-Fast</span>
                    <span className="text-[10px] flex items-center gap-0.5"><Headset className="w-3 h-3 text-blue-300" /> 24/7</span>
                    <span className="text-[10px] flex items-center gap-0.5"><Banknote className="w-3 h-3 text-emerald-400" /> Pricing</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-slate-700"
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-800" ref={scrollAreaRef} style={{ scrollBehavior: 'smooth' }}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl shadow-md ${
                      message.isUser
                        ? 'bg-blue-600 text-white rounded-br-none border border-blue-500'
                        : 'bg-slate-700 text-slate-100 rounded-bl-none border border-slate-600'
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-500/50 underline-offset-2" />,
                          ul: ({node, ...props}) => <ul {...props} className="list-disc ml-4 mt-2 space-y-1" />,
                          ol: ({node, ...props}) => <ol {...props} className="list-decimal ml-4 mt-2 space-y-1" />,
                          li: ({node, ...props}) => <li {...props} className="mb-1" />,
                          strong: ({node, ...props}) => <strong {...props} className="font-bold text-white" />,
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                    <p className="text-[10px] opacity-40 mt-2 flex items-center">
                      {message.isUser ? (
                        <Lock className="w-2.5 h-2.5 mr-1" />
                      ) : (
                        <Shield className="w-2.5 h-2.5 mr-1" />
                      )}
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 p-3 rounded-2xl rounded-bl-none border border-slate-600 shadow-md">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1 rounded-full border border-blue-900/50 transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95"
                disabled={isLoading}
              >
                {suggestion === "Pricing & Custom" && <Banknote className="w-3 h-3 text-emerald-400" />}
                {suggestion === "Security formula" && <Zap className="w-3 h-3 text-yellow-400" />}
                {suggestion === "API integration" && <Lock className="w-3 h-3 text-blue-300" />}
                {suggestion}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-900">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about security..."
                className="flex-1 h-9 bg-slate-800 border-slate-600 text-[13px] text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none rounded-xl"
                disabled={isLoading}
              />
              <Button
                id="chat-send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-xl"
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;