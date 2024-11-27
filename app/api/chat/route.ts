import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Check for API key and create OpenAI client only if key exists
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface ChatMessage {
  isSent: boolean;
  text: string;
  image?: {
    url: string;
    detail?: string;
  };
}

export async function POST(req: Request) {
  try {
    // Check if OpenAI client is available
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 501 }
      );
    }

    const { messages } = await req.json();
    
    const completion = await openai.chat.completions.create({
      messages: messages.map((msg: ChatMessage) => ({
        role: msg.isSent ? 'user' : 'assistant',
        content: msg.image ? [
          { type: "text", text: msg.text },
          {
            type: "image_url",
            image_url: {
              url: msg.image.url,
              detail: msg.image.detail || "auto"
            }
          }
        ] : msg.text
      })),
      model: 'gpt-4o-mini',
      max_tokens: 500,
    });

    return NextResponse.json({ 
      response: completion.choices[0].message.content 
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}