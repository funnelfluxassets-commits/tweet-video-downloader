import React from 'react';
import { Sparkles, Zap, ShieldCheck, Film, Music, Download } from 'lucide-react';

export const FeatureHighlights: React.FC = () => {
  const features = [
    {
      icon: <Sparkles className="w-5 h-5 text-sky-400" />,
      title: '1080p Full HD & 4K',
      description: 'Download original, high-bitrate X / Twitter videos in crystal-clear MP4 format with zero compression artifacts.',
    },
    {
      icon: <Film className="w-5 h-5 text-emerald-400" />,
      title: 'Animated GIF Saver',
      description: 'Save looping animated GIFs directly from tweets as high-quality MP4 or GIF files with a single tap.',
    },
    {
      icon: <Music className="w-5 h-5 text-purple-400" />,
      title: '320kbps MP3 Audio',
      description: 'Extract speeches, podcasts, Spaces audio clips, and music tracks as pristine 320kbps MP3 files.',
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      title: 'Instant Direct Downloads',
      description: 'Fast streaming proxy saves videos straight to your device Downloads folder without waiting or third-party ads.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
      title: 'Zero Watermarks & 100% Free',
      description: 'Clean video downloads without any added logos or watermarks. Unlimited downloads for all registered users.',
    },
    {
      icon: <Download className="w-5 h-5 text-indigo-400" />,
      title: 'Works on All Devices',
      description: 'Optimized for iPhone Safari, Android Chrome, Mac, Windows, and iPad. No extensions or apps required.',
    },
  ];

  return (
    <section className="w-full max-w-5xl mx-auto mt-16 px-4">
      <div className="text-center mb-10">
        <h2 className="text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Why Content Creators Choose{' '}
          <span className="bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
            TweetDownloader
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl mx-auto">
          The fastest and cleanest tool for archiving and repurposing high-definition media from X (Twitter).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {features.map((f, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:border-sky-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              {f.icon}
            </div>
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 mb-1">
              {f.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
