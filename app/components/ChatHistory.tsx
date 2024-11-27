import React from 'react';

interface Message {
  id: number;
  text: string;
  isSent: boolean;
  isLoading?: boolean;
  image?: { url: string };
  status?: 'sent' | 'delivered' | 'seen';
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  preview: string;
  messages: Message[];
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

export default function ChatHistory({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession
}: ChatHistoryProps) {
  return (
    <div className="w-[280px] h-full bg-gray-900/80 border-r border-gray-800 flex flex-col">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 p-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200
              ${currentSessionId === session.id 
                ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20' 
                : 'hover:bg-gray-800/50 text-gray-300 border border-transparent'
              }`}
            onClick={() => onSelectSession(session.id)}
          >
            <div className="flex-1 min-w-0 pr-8">
              <div className={`font-medium text-sm truncate ${
                currentSessionId === session.id ? 'text-blue-400' : 'text-gray-300'
              }`}>
                {session.title}
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5">
                {session.preview}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className={`absolute right-2 p-1.5 rounded-md transition-all duration-200
                ${currentSessionId === session.id
                  ? 'text-blue-400 hover:text-white hover:bg-blue-500/20'
                  : 'text-gray-500 hover:text-white hover:bg-gray-700'
                }
                opacity-0 group-hover:opacity-100`}
            >
              <svg 
                className="w-4 h-4"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 