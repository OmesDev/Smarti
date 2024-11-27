"use client";
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Error signing in with Google');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md p-8 space-y-6 bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-900/30 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <h1 className="text-2xl font-bold text-center text-white">Welcome to Smarti AI</h1>
        <p className="text-gray-400 text-center">Sign in to start chatting with Smarti</p>
        
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
} 