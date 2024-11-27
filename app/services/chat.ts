import { Message } from '../types/chat';

export async function getChatCompletion(messages: Message[]) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();
    return data.response;
    
  } catch (error) {
    console.error('Error getting chat completion:', error);
    throw error;
  }
} 