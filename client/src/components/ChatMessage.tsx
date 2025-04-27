import React from 'react';
import { Message } from '../types';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.type === 'user';
  
  return (
    <div 
      className={`flex items-start gap-3 p-4 animate-fadeIn ${
        isUser ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-700'
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500' : 'bg-slate-700 dark:bg-slate-900'
      }`}>
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="font-medium text-sm mb-1">
          {isUser ? 'You' : 'System'}
        </div>
        <div className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
};

export default ChatMessage;