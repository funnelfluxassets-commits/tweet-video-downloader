import React, { useState, useMemo, useEffect } from 'react';
import { TweetMediaResult, DownloadOption } from '../types';
import {
  Download,
  Play,
  Copy,
  Check,
  Sparkles,
  Film,
  FileVideo,
  FileAudio,
  ImageIcon,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface ResultCardProps {
  result: TweetMediaResult;
  onDownloadSuccess: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onDownloadSuccess }) => {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [selectedDownloadId, setSelectedDownloadId] = useState<string | null>(
    () => result.downloads.find((d) => d.recommend)?.id || result.downloads[0]?.id || null
  );

  const cleanForFilename = (str: string): string => {
    return str
      .replace(/[^\w\s-]/gi, '')
      .replace(/[\s_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  };

  const titleSlug = useMemo(() => {
    const raw = result.title || '';
    const cleaned = cleanForFilename(raw);
    return cleaned || 'tweet_video';
  }, [result.title]);

  const authorSlug = useMemo(() => {
    return cleanForFilename(result.author.username || result.author.name || 'x_creator');
  }, [result.author.username, result.author.name]);

  const presetCreatorCaption = useMemo(() => {
    return `${authorSlug}_${titleSlug}`;
  }, [authorSlug, titleSlug]);

  const presetCaptionOnly = useMemo(() => {
    return titleSlug;
  }, [titleSlug]);

  const presetCreatorId = useMemo(() => {
    return `${authorSlug}_${result.tweetId || result.id}`;
  }, [authorSlug, result.tweetId, result.id]);

  const [customFilename, setCustomFilename] = useState<string>(presetCreatorCaption);

  useEffect(() => {
    setCustomFilename(presetCreatorCaption);
  }, [presetCreatorCaption]);

  const handleCopyCaption = () => {
    if (result.title) {
      navigator.clipboard.writeText(result.title);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const handleTriggerDownload = async (option: DownloadOption) => {
    setDownloadingId(option.id);
    setDownloadError(null);

    try {
      const baseName = cleanForFilename(customFilename.trim()) || presetCreatorCaption;
      let suffix = '';
      if (option.type === 'audio') {
        suffix = '_audio';
      } else if (option.type === 'thumbnail') {
        suffix = '_cover';
      } else if (option.type === 'gif') {
        suffix = '_gif';
      } else if (option.quality) {
        suffix = `_${option.quality.replace(/[\s()]/g, '')}`;
      }

      const safeTitle = `${baseName}${suffix}`;
      const ext = option.extension || (option.type === 'audio' ? 'mp3' : option.type === 'thumbnail' ? 'jpg' : 'mp4');

      let endpoint = '';
      if (option.type === 'thumbnail') {
        endpoint = `/api/proxy-download?url=${encodeURIComponent(option.url || result.cover)}&filename=${encodeURIComponent(safeTitle)}&ext=jpg&quality=thumb`;
      } else {
        endpoint = `/api/proxy-download?url=${encodeURIComponent(result.originalUrl)}&quality=${encodeURIComponent(option.quality)}&filename=${encodeURIComponent(safeTitle)}&ext=${ext}&isAudio=${option.type === 'audio' ? '1' : '0'}&isGif=${option.type === 'gif' ? '1' : '0'}`;
      }

      let response: Response | null = null;

      // 1. Try direct in-browser download ONLY if direct media CDN URL exists (not Twitter/X web page URL)
      const directMediaUrl = (option as any).directUrl || (option.url && (option.url.includes('twimg.com') || option.url.includes('.mp4')) ? option.url : null);
      if (directMediaUrl && option.type !== 'audio' && option.type !== 'gif') {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const directRes = await fetch(directMediaUrl, { signal: controller.signal });
          clearTimeout(timer);
          if (directRes.ok) {
            const blob = await directRes.blob();
            // Verify it is an actual binary media file (>200KB or video mime-type) and not an HTML error
            if (blob.type.includes('video') || blob.type.includes('octet-stream') || blob.size > 200000) {
              const blobUrl = window.URL.createObjectURL(blob);
              const tempLink = document.createElement('a');
              tempLink.href = blobUrl;
              tempLink.download = `${safeTitle}.${ext}`;
              document.body.appendChild(tempLink);
              tempLink.click();
              document.body.removeChild(tempLink);
              setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);

              onDownloadSuccess();
              setDownloadSuccessId(option.id);
              setTimeout(() => setDownloadSuccessId(null), 3000);
              return;
            }
          }
        } catch {
          // Direct fetch blocked or failed, fall back below to server proxy
        }
      }

      // 2. If direct fetch not available or failed, use Vercel proxy
      if (!response) {
        response = await fetch(endpoint);
      }

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const msg = errorJson?.detail
          ? `${errorJson.error} (${errorJson.detail})`
          : errorJson?.error || `Server returned error status ${response.status}`;
        throw new Error(msg);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.download = `${safeTitle}.${ext}`;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);

      onDownloadSuccess();
      setDownloadSuccessId(option.id);
      setTimeout(() => setDownloadSuccessId(null), 3000);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err?.message || 'Download could not complete. Please try another quality option.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-7 shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-all space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <Sparkles className="w-3 h-3 text-sky-500" />
              <span>{result.isGif ? 'X / Twitter GIF' : 'X / Twitter Video (9:16)'}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>1080P FULL HD READY</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight line-clamp-1">
            {result.title || 'X Post Media'}
          </h2>

          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <a
              href={result.author.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-zinc-700 dark:text-zinc-300 hover:text-sky-500 transition-colors flex items-center gap-1"
            >
              <span>@{result.author.username}</span>
              {result.author.verified && (
                <span className="text-sky-500 font-bold" title="Verified">✓</span>
              )}
            </a>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Direct File Download (Zero Ads)
            </span>
          </div>
        </div>

        <button
          onClick={handleCopyCaption}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 px-3 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer self-start"
          title="Copy Text"
        >
          {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCaption ? 'Copied' : 'Copy Text'}</span>
        </button>
      </div>

      {/* Media Preview & Download Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Interactive 9:16 Video Player Preview Frame */}
        <div className="md:col-span-5 relative rounded-2xl overflow-hidden bg-black shadow-lg border border-zinc-200 dark:border-zinc-800 aspect-[9/16] max-h-[460px] mx-auto w-full max-w-[280px]">
          {isPlayingVideo ? (
            <video
              src={result.videoStreamUrl || result.downloads[0]?.url || result.originalUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback && result.videoStreamUrl) {
                  target.dataset.fallback = '1';
                  target.src = `/api/stream-preview?url=${encodeURIComponent(result.videoStreamUrl)}`;
                }
              }}
            />
          ) : (
            <div className="relative w-full h-full group cursor-pointer" onClick={() => setIsPlayingVideo(true)}>
              <img
                src={result.cover}
                alt={result.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                <button
                  id="play-video-preview-btn"
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 via-emerald-500 to-indigo-600 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title="Click to Play Video"
                >
                  <Play className="w-6 h-6 fill-white translate-x-0.5" />
                </button>
              </div>

              <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg">
                <Play className="w-3 h-3 fill-white" />
                <span>Click to Play Preview</span>
              </span>
            </div>
          )}
        </div>

        {/* Quality Selector & Direct Download Options */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Film className="w-4 h-4 text-sky-500" />
              <span>Select Download Quality:</span>
            </h3>
            <span className="text-xs text-zinc-400">Direct to Downloads</span>
          </div>

          {/* List of Formats with Standardized 76px Fixed Height Cards */}
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {result.downloads.map((option) => {
              const isSelected = selectedDownloadId === option.id;
              const isDownloading = downloadingId === option.id;
              const isSuccess = downloadSuccessId === option.id;

              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedDownloadId(option.id)}
                  className={`px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 h-[72px] sm:h-[76px] ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 ring-2 ring-sky-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        option.type === 'audio'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                          : option.type === 'thumbnail'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : option.type === 'gif'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                          : 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {option.type === 'audio' ? (
                        <FileAudio className="w-4.5 h-4.5" />
                      ) : option.type === 'thumbnail' ? (
                        <ImageIcon className="w-4.5 h-4.5" />
                      ) : option.type === 'gif' ? (
                        <Film className="w-4.5 h-4.5" />
                      ) : (
                        <FileVideo className="w-4.5 h-4.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                          {option.quality === '1080' ? '1080p Full HD' : option.quality === '720' ? '720p HD' : option.label}
                        </span>
                        {option.badge && (
                          <span
                            className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${
                              option.recommend
                                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white'
                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {option.recommend ? 'RECOMMENDED' : option.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDownloadId(option.id);
                      handleTriggerDownload(option);
                    }}
                    disabled={isDownloading}
                    className={`min-w-[84px] sm:min-w-[92px] h-9 sm:h-10 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-wait ${
                      isSuccess
                        ? 'bg-emerald-500 text-white'
                        : isSelected
                        ? 'bg-gradient-to-r from-sky-500 via-emerald-500 to-indigo-600 hover:opacity-90 text-white shadow-md shadow-sky-500/25'
                        : 'bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600'
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : isSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved</span>
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

          {/* Filename Customization & Presets */}
          <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold flex items-center gap-1">
                <span>Custom Filename:</span>
              </span>
              <button
                type="button"
                onClick={() => setCustomFilename(presetCreatorCaption)}
                className="text-[11px] text-zinc-400 hover:text-sky-500 dark:hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="Enter filename..."
                className="w-full text-xs bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {/* Filename Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-zinc-400 font-medium">Presets:</span>
              <button
                type="button"
                onClick={() => setCustomFilename(presetCreatorCaption)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Author + Title
              </button>
              <button
                type="button"
                onClick={() => setCustomFilename(presetCaptionOnly)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Title Only
              </button>
              <button
                type="button"
                onClick={() => setCustomFilename(presetCreatorId)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Author + ID
              </button>
            </div>
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
