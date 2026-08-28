import React, { useState } from 'react';
import { Search, Clipboard, X, Loader2, ArrowRight } from 'lucide-react';

interface UrlInputBarProps {
  onExtract: (url: string) => void;
  isLoading: boolean;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({ onExtract, isLoading }) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || isLoading) return;
    onExtract(inputUrl.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
        if (text.includes('x.com') || text.includes('twitter.com')) {
          onExtract(text.trim());
        }
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        {/* Glow effect on hover/focus */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-sky-500 via-emerald-400 to-indigo-600 opacity-30 group-hover:opacity-60 blur-md transition duration-300 pointer-events-none" />

        <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-1.5 sm:p-2 transition-all">
          <div className="pl-3 sm:pl-4 pr-2 text-zinc-400 dark:text-zinc-500 flex items-center justify-center">
            <Search className="w-5 h-5" />
          </div>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Paste X / Twitter post link (e.g., https://x.com/username/status/...)"
            disabled={isLoading}
            className="w-full bg-transparent py-2.5 sm:py-3 text-sm sm:text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none disabled:opacity-50"
          />

          <div className="flex items-center gap-1.5 sm:gap-2 pr-1">
            {inputUrl ? (
              <button
                type="button"
                onClick={() => setInputUrl('')}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 rounded-xl transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!inputUrl.trim() || isLoading}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-sky-500 via-emerald-500 to-indigo-600 hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Extracting...</span>
                </>
              ) : (
                <>
                  <span>Download</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
