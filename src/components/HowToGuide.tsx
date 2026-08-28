import React from 'react';
import { Copy, ArrowDownCircle, CheckCircle } from 'lucide-react';

export const HowToGuide: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: <Copy className="w-5 h-5 text-sky-400" />,
      title: 'Copy X / Twitter Post Link',
      description: 'Open X (Twitter), navigate to the post containing the video or GIF, click the Share icon, and select "Copy Link".',
    },
    {
      step: '02',
      icon: <ArrowDownCircle className="w-5 h-5 text-emerald-400" />,
      title: 'Paste URL & Click Download',
      description: 'Paste the link into the search box above. TweetDownloader instantly fetches the media without re-encoding delays.',
    },
    {
      step: '03',
      icon: <CheckCircle className="w-5 h-5 text-indigo-400" />,
      title: 'Save in 1080p Full HD or MP3',
      description: 'Choose your desired resolution (1080p, 720p, GIF, or MP3 Audio) and click "Save" to download directly to your device.',
    },
  ];

  return (
    <section className="w-full max-w-5xl mx-auto mt-16 px-4">
      <div className="text-center mb-10">
        <h2 className="text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          How to Download Videos from X / Twitter
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-lg mx-auto">
          Save your favorite media in 3 simple steps on mobile, desktop, or tablet.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="relative p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  {s.icon}
                </div>
                <span className="text-2xl font-black text-zinc-200 dark:text-zinc-800">
                  {s.step}
                </span>
              </div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-2">
                {s.title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {s.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
