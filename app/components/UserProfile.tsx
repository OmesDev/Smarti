"use client";
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from '@supabase/supabase-js';

interface UserProfileProps {
  user: User;
}

export default function UserProfile({ user }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (!user) return null;

  const firstName = user.user_metadata?.full_name?.split(' ')[0] || 
                   user.user_metadata?.name?.split(' ')[0] ||
                   user.email?.split('@')[0];
  
  const initial = firstName.charAt(0).toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-2 hover:bg-blue-500/10 rounded-lg transition-colors h-9"
      >
        {avatarUrl ? (
          <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-blue-500/20">
            <Image
              src={avatarUrl}
              alt={firstName}
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium ring-2 ring-blue-500/20">
            {initial}
          </div>
        )}
        <span className="hidden sm:flex items-center gap-2 text-sm text-gray-300">
          {firstName}
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 animate-fade-in">
          <div className="px-4 py-2 border-b border-gray-700/50">
            <div className="text-sm font-medium text-gray-200">
              {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
            </div>
            <div className="text-xs text-gray-400 truncate mt-0.5">
              {user.email}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2.5 mt-1 text-left text-sm text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2 group"
          >
            <svg 
              className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
} 