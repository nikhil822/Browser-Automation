import { ApiResponse } from '../types';

// Real API service for interacting with backend automation
export const sendPrompt = async (prompt: string): Promise<ApiResponse> => {
  try {
    const response = await fetch('https://browser-automation-backend.vercel.app/interact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command: prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get a valid response from automation API.');
    }

    const data = await response.json();
    // You can shape the returned object as needed for your chat UI
    return {
      message: data.automationResult || JSON.stringify(data),
      status: 'success',
      ...data,
    };
  } catch (error: any) {
    return {
      message: error.message || 'Unknown error occurred while contacting automation API.',
      status: 'error',
    };
  }
};