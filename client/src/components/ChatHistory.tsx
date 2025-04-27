import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import ChatMessage from './ChatMessage';

interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Browser Automation</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Enter your automation prompt below to get started. Type detailed instructions for what you want the browser to do.
            </p>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                "Navigate to example.com and extract all product titles from the homepage"
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                "Log into my account at example.com using the credentials in my vault"
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                "Fill out the contact form on example.com with my information"
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {isLoading && (
            <div className="p-4 flex items-center gap-2">
              <div className="animate-pulse flex gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animation-delay-150"></div>
                <div className="w-2 h-2 rounded-full bg-slate-400 animation-delay-300"></div>
              </div>
              <span className="text-sm text-slate-500">Processing your request...</span>
            </div>
          )}
          
          <div ref={endOfMessagesRef} />
        </div>
      )}
    </div>
  );
};

export default ChatHistory;