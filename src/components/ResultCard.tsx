import React, { useState } from 'react';
import { TweetMediaResult, DownloadOption } from '../types';
import {
  Download,
  CheckCircle2,
  FileVideo,
  FileAudio,
  Image as ImageIcon,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Film,
} from 'lucide-react';

interface ResultCardProps {
  result: TweetMediaResult;
  onDownloadSuccess: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onDownloadSuccess }) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Custom Filename State
  const defaultBaseName = `${result.author.username || 'x'}_${result.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40)}`;
  const [customFilename, setCustomFilename] = useState(defaultBaseName);

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(result.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (opt: DownloadOption) => {
    try {
      setDownloadingId(opt.id);
      setDownloadError(null);

      // Trigger proxy download API
      const safeName = encodeURIComponent(customFilename.trim() || defaultBaseName);
      const isAudio = opt.type === 'audio' ? '1' : '0';
      const isGif = opt.type === 'gif' ? '1' : '0';
      const quality = encodeURIComponent(opt.quality || '1080');
      const directUrl = encodeURIComponent(opt.url);

      const downloadEndpoint = `/api/proxy-download?url=${directUrl}&quality=${quality}&filename=${safeName}&ext=${opt.extension}&isAudio=${isAudio}&isGif=${isGif}`;

      // Create hidden anchor to initiate native browser download
      const link = document.createElement('a');
      link.href = downloadEndpoint;
      link.setAttribute('download', `${customFilename || defaultBaseName}.${opt.extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onDownloadSuccess();
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err?.message || 'Failed to download file. Please try again.');
    } finally {
      setTimeout(() => setDownloadingId(null), 2500);
    }
  };

  return (
    <div id="extraction-result-section" className="w-full max-w-4xl mx-auto mt-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-2xl transition-all">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 p-[1.5px] shrink-0">
            {result.author.avatarUrl ? (
              <img src={result.author.avatarUrl} alt={result.author.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-white font-bold text-sm">
                {result.author.name[0] || 'X'}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                {result.author.name}
              </h3>
              {result.author.verified && (
                <span className="text-sky-500 text-xs font-bold" title="Verified">✓</span>
              )}
            </div>
            <a
              href={result.author.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-sky-500 transition-colors flex items-center gap-1"
            >
              <span>@{result.author.username}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCaption}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Tweet Body / Content Preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5">
        {/* Left Column: Video Preview */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="relative w-full aspect-[9/16] max-h-[380px] rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-md group">
            {isPlaying ? (
              <video
                src={result.downloads[0]?.url || result.originalUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <img
                  src={result.cover}
                  alt={result.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="w-14 h-14 rounded-full bg-sky-500/90 hover:bg-sky-500 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                    title="Play Video Preview"
                  >
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  </button>
                </div>
              </>
            )}
          </div>
          {result.title && (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 text-center px-2">
              "{result.title}"
            </p>
          )}
        </div>

        {/* Right Column: Download Options */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              Available Formats &amp; Resolutions
            </h4>

            {/* Standardized Fixed-Height Download Cards */}
            <div className="space-y-2.5">
              {result.downloads.map((opt) => {
                const isDownloading = downloadingId === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`h-[72px] sm:h-[76px] flex items-center justify-between p-3 sm:px-4 rounded-2xl border transition-all ${
                      opt.recommend
                        ? 'border-sky-500/50 bg-sky-500/5 dark:bg-sky-500/10 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          opt.type === 'audio'
                            ? 'bg-purple-500/10 text-purple-500'
                            : opt.type === 'gif'
                            ? 'bg-amber-500/10 text-amber-500'
                            : opt.type === 'thumbnail'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-sky-500/10 text-sky-500'
                        }`}
                      >
                        {opt.type === 'audio' ? (
                          <FileAudio className="w-5 h-5" />
                        ) : opt.type === 'gif' ? (
                          <Film className="w-5 h-5" />
                        ) : opt.type === 'thumbnail' ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileVideo className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {opt.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(opt)}
                      disabled={!!downloadingId}
                      className={`min-w-[92px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0 ${
                        opt.recommend
                          ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white'
                          : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                      } disabled:opacity-50`}
                    >
                      {isDownloading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Filename Presets */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
              <span>Custom Filename:</span>
              <button
                onClick={() => setCustomFilename(defaultBaseName)}
                className="hover:text-sky-500 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              className="w-full text-xs bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {downloadError && (
            <p className="text-xs text-rose-500 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
              {downloadError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
