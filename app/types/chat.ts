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