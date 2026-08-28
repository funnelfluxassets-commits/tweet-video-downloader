import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How do I download videos from X (Twitter) on iPhone or iPad?',
      a: 'Open the X app or Safari, tap Share on any tweet, and tap "Copy Link". Paste the link into TweetDownloader and tap Download. When the video is saved, it will appear in your Safari Downloads and can be saved directly to your iOS Photos app.',
    },
    {
      q: 'Can I download animated GIFs as MP4 video files?',
      a: 'Yes! X (Twitter) converts all animated GIFs into looping MP4 videos. TweetDownloader lets you save them as clean high-definition MP4 videos or GIFs without any quality loss.',
    },
    {
      q: 'Does TweetDownloader support both x.com and twitter.com links?',
      a: 'Yes, TweetDownloader fully supports both modern x.com links and legacy twitter.com URLs, as well as mobile t.co and mobile.twitter.com links.',
    },
    {
      q: 'Is there a limit on how many videos I can download?',
      a: 'Free guest visitors get 3 free downloads. After that, you can quickly create a free account with Google or email for unlimited 100% free downloads forever.',
    },
    {
      q: 'Will the downloaded video have a watermark?',
      a: 'No. All videos, GIFs, and audio files downloaded via TweetDownloader are 100% clean and free of watermarks or added logos.',
    },
    {
      q: 'How do I extract audio or voice clips from tweets as MP3?',
      a: 'Simply paste the tweet URL into TweetDownloader and select the "Download Audio (MP3)" option to extract a crystal-clear 320kbps MP3 audio file.',
    },
  ];

  return (
    <section className="w-full max-w-4xl mx-auto mt-16 px-4 mb-16">
      <div className="text-center mb-10">
        <h2 className="text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Everything you need to know about downloading X and Twitter media.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 hover:text-sky-500 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                    isOpen ? 'rotate-180 text-sky-500' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/50">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
