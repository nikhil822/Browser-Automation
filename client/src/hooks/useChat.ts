import { useState } from 'react';
import { Message } from '../types';
import { sendPrompt } from '../services/api';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (content: string, type: 'user' | 'system') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      type,
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    return newMessage;
  };

  const handleSendPrompt = async (prompt: string) => {
    if (!prompt.trim()) return;
    
    // Add user message
    addMessage(prompt, 'user');
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Send prompt to API
      const response = await sendPrompt(prompt);
      
      // Add system response
      addMessage(response.message, 'system');
    } catch (error) {
      // Handle error
      addMessage('Sorry, there was an error processing your request.', 'system');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    handleSendPrompt,
  };
};