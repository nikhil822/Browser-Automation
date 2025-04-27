import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface PromptInputProps {
  onSendPrompt: (prompt: string) => void;
  isLoading: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSendPrompt, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus the input on component mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (prompt.trim() && !isLoading) {
      onSendPrompt(prompt);
      setPrompt('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="relative border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm dark:shadow-none transition-all focus-within:shadow-md focus-within:border-blue-300 dark:focus-within:border-blue-400"
    >
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your browser automation prompt..."
        className="w-full resize-none p-4 pr-14 max-h-32 focus:outline-none rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800"
        rows={1}
        disabled={isLoading}
        style={{
          minHeight: '56px',
          height: 'auto',
        }}
      />
      
      <button
        type="submit"
        disabled={!prompt.trim() || isLoading}
        className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${
          prompt.trim() && !isLoading
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
        }`}
        aria-label="Send prompt"
      >
        <Send size={18} />
      </button>
    </form>
  );
};

export default PromptInput;