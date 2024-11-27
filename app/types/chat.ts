export interface Message {
  id: number;
  text: string;
  isSent: boolean;
  isLoading?: boolean;
  image?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
  messages: Message[];
} 