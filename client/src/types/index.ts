export interface Message {
    id: string;
    content: string;
    type: 'user' | 'system';
    timestamp: Date;
  }
  
  export interface ApiResponse {
    message: string;
    status: 'success' | 'error' | 'processing';
  }