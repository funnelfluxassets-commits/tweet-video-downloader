import React, { useState, useEffect } from 'react';
import { TweetMediaResult, HistoryItem, UserAccount } from './types';
import { Navbar } from './components/Navbar';
import { UrlInputBar } from './components/UrlInputBar';
import { ResultCard } from './components/ResultCard';
import { FeatureHighlights } from './components/FeatureHighlights';
import { HowToGuide } from './components/HowToGuide';
import { FaqSection } from './components/FaqSection';
import { AuthModal } from './components/AuthModal';
import { HistoryModal } from './components/HistoryModal';
import { Sparkles, Heart, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TweetMediaResult | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);

  // Persistent User & History State
  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('tweet_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('tweet_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleExtract = async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Could not extract media from this X / Twitter link. Please make sure the post is public.');
      }

      setResult(json.data);

      // Save to local history (deduplicated)
      const updated = [json.data, ...history.filter((h) => h.id !== json.data.id)].slice(0, 20);
      setHistory(updated);
      localStorage.setItem('tweet_history', JSON.stringify(updated));
    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err?.message || 'Failed to extract media. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulDownload = () => {
    const newCount = downloadCount + 1;
    setDownloadCount(newCount);
    localStorage.setItem('tweet_downloads', String(newCount));

    // Prompt auth modal on 3rd download if user is not logged in
    if (!user && newCount >= 3) {
      setTimeout(() => setIsAuthOpen(true), 1500);
    }
  };

  const handleLoginSuccess = (account: UserAccount) => {
    setUser(account);
    localStorage.setItem('tweet_user', JSON.stringify(account));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tweet_user');
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('tweet_history');
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 selection:bg-sky-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
      />

      {/* Main Container */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-12 pb-8 sm:pt-16 sm:pb-12 px-4 text-center overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] bg-gradient-to-tr from-sky-500/15 via-emerald-500/10 to-indigo-500/15 blur-3xl pointer-events-none rounded-full" />

          <div className="relative max-w-4xl mx-auto space-y-4">
            {/* Header Badges */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-500 dark:text-sky-400 text-xs font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free X &amp; Twitter Video Downloader</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-900 dark:text-white leading-[1.15]">
              Download X &amp; Twitter{' '}
              <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                Videos &amp; GIFs
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
              Save original 1080p Full HD MP4 videos, animated GIFs, and 320kbps MP3 audio from any X or Twitter post. Fast, free, and zero watermarks.
            </p>

            {/* URL Input Form */}
            <div className="pt-4">
              <UrlInputBar onExtract={handleExtract} isLoading={isLoading} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="max-w-xl mx-auto mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Result Card Section */}
        {result && (
          <section className="px-4 pb-8">
            <ResultCard result={result} onDownloadSuccess={handleSuccessfulDownload} />
          </section>
        )}

        {/* Feature Highlights */}
        <FeatureHighlights />

        {/* Step-by-Step How-To Guide */}
        <HowToGuide />

        {/* FAQ Accordion */}
        <FaqSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-950/50 py-8 px-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-emerald-400 to-indigo-600 p-[1.5px] shadow-sm flex items-center justify-center">
                <div className="w-full h-full bg-zinc-950 rounded-[6.5px] flex items-center justify-center p-1.5">
                  <svg viewBox="0 0 24 24" className="w-full h-full text-sky-400 fill-none stroke-current" xmlns="http://www.w3.org/2000/svg" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v13M7 11l5 5 5-5" />
                    <path d="M5 20h14" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-1.5 whitespace-nowrap text-center">
                <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white tracking-tight">TweetDownloader</span>
                <span className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">• Zero Watermarks • 100% Free</span>
              </div>
            </div>
            <p className="flex items-center gap-1">
              Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" /> for content creators
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed text-center sm:text-left">
            <p>
              <strong>Disclaimer:</strong> TweetDownloader is an independent utility tool and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with X Corp., Twitter, Inc., or any of their subsidiaries or affiliates. The official X website can be found at <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">x.com</a>. The names "X", "Twitter", and "Tweet" as well as related names, marks, emblems, and images are registered trademarks of their respective owners.
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={user}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectResult={(r) => setResult(r)}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
};

export default App;
