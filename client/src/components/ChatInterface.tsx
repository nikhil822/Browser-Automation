import React from 'react';
import ChatHistory from './ChatHistory';
import { useChat } from '../hooks/useChat';
import PromptInput from './PromptInput';

const ChatInterface: React.FC = () => {
  const { messages, isLoading, handleSendPrompt } = useChat();

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      <ChatHistory messages={messages} isLoading={isLoading} />
      
      <div className="p-4 border-t border-slate-200">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            onSendPrompt={handleSendPrompt} 
            isLoading={isLoading} 
          />
          
          <div className="mt-2 text-xs text-center text-slate-400">
            Press Enter to submit • Shift+Enter for a new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;