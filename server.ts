import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const serverDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const execFileAsync = promisify(execFile);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(serverDir, 'public')));
app.use(express.static(path.join(serverDir, 'dist')));

// ─── Binary Managers (yt-dlp & ffmpeg) ────────────────────────────────────────

const YTDLP_TMP_PATH = '/tmp/yt-dlp';
const FFMPEG_TMP_PATH = '/tmp/ffmpeg';
let ytdlpReadyPath: string | null = null;
let ffmpegReadyPath: string | null = null;

async function getSystemYtDlp(): Promise<string | null> {
  const candidates = ['/usr/local/bin/yt-dlp', '/opt/homebrew/bin/yt-dlp', 'yt-dlp'];
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ['--version'], { timeout: 3000 });
      return bin;
    } catch {}
  }
  return null;
}

async function getSystemFfmpeg(): Promise<string | null> {
  const candidates = ['/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg', 'ffmpeg'];
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ['-version'], { timeout: 3000 });
      return bin;
    } catch {}
  }
  return null;
}

let ytdlpSetupPromise: Promise<string> | null = null;
async function ensureYtDlp(): Promise<string> {
  if (ytdlpReadyPath && fs.existsSync(ytdlpReadyPath)) {
    return ytdlpReadyPath;
  }
  if (ytdlpSetupPromise) return ytdlpSetupPromise;

  ytdlpSetupPromise = (async () => {
    const sys = await getSystemYtDlp();
    if (sys) {
      ytdlpReadyPath = sys;
      return sys;
    }

    if (fs.existsSync(YTDLP_TMP_PATH)) {
      try {
        fs.chmodSync(YTDLP_TMP_PATH, 0o755);
        await execFileAsync(YTDLP_TMP_PATH, ['--version'], { timeout: 4000 });
        ytdlpReadyPath = YTDLP_TMP_PATH;
        return YTDLP_TMP_PATH;
      } catch {}
    }

    console.log('[yt-dlp] Downloading Linux binary to /tmp...');
    const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
    await new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(YTDLP_TMP_PATH);
      const download = (targetUrl: string) => {
        https.get(targetUrl, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return download(res.headers.location);
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`Failed to download yt-dlp: HTTP ${res.statusCode}`));
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close(() => resolve());
          });
        }).on('error', (err) => {
          fs.unlink(YTDLP_TMP_PATH, () => {});
          reject(err);
        });
      };
      download(url);
    });

    fs.chmodSync(YTDLP_TMP_PATH, 0o755);
    ytdlpReadyPath = YTDLP_TMP_PATH;
    return YTDLP_TMP_PATH;
  })();

  return ytdlpSetupPromise;
}

let ffmpegSetupPromise: Promise<string> | null = null;
async function ensureFfmpeg(): Promise<string> {
  if (ffmpegReadyPath && fs.existsSync(ffmpegReadyPath)) {
    return ffmpegReadyPath;
  }
  if (ffmpegSetupPromise) return ffmpegSetupPromise;

  ffmpegSetupPromise = (async () => {
    const sys = await getSystemFfmpeg();
    if (sys) {
      ffmpegReadyPath = sys;
      return sys;
    }

    try {
      const ffmpegStatic = await import('ffmpeg-static');
      const staticPath = ffmpegStatic.default || (ffmpegStatic as any);
      if (staticPath && fs.existsSync(staticPath)) {
        ffmpegReadyPath = staticPath;
        return staticPath;
      }
    } catch {}

    ffmpegReadyPath = 'ffmpeg';
    return 'ffmpeg';
  })();

  return ffmpegSetupPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTweetUrl(rawUrl: string): { tweetId: string; cleanUrl: string } | null {
  try {
    const trimmed = rawUrl.trim();
    // Support x.com and twitter.com links
    const tweetRegex = /(?:twitter\.com|x\.com)\/(?:#!\/)?(?:\w+)\/status(?:es)?\/(\d+)/i;
    const directStatusRegex = /(?:twitter\.com|x\.com)\/i\/status\/(\d+)/i;

    const match = trimmed.match(tweetRegex) || trimmed.match(directStatusRegex);
    if (!match || !match[1]) return null;

    const tweetId = match[1];
    return {
      tweetId,
      cleanUrl: `https://x.com/i/status/${tweetId}`,
    };
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return cleaned.substring(0, 70) || 'tweet_video';
}

// ─── Extraction Logic ────────────────────────────────────────────────────────

async function extractTweetMedia(targetUrl: string) {
  const parsed = parseTweetUrl(targetUrl);
  if (!parsed) {
    throw new Error('Invalid X / Twitter URL. Please enter a valid post link (e.g. https://x.com/username/status/...)');
  }

  const { tweetId, cleanUrl } = parsed;
  const ytdlpBin = await ensureYtDlp();

  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-warnings',
    '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    '--add-header', 'Referer:https://x.com/',
    '--add-header', 'Accept-Language:en-US,en;q=0.9',
    '--js-runtimes', 'node',
    cleanUrl,
  ];

  let mediaInfo: any;
  try {
    const { stdout } = await execFileAsync(ytdlpBin, args, { timeout: 25000 });
    mediaInfo = JSON.parse(stdout.trim());
  } catch (err: any) {
    console.warn('[yt-dlp] Tweet extraction fallback:', err?.message);
    mediaInfo = {
      id: tweetId,
      title: 'X / Twitter Post Media',
      uploader: 'X Creator',
      thumbnail: `https://vxtwitter.com/render/${tweetId}.jpg`,
      duration: 0,
    };
  }

  const title = mediaInfo.description || mediaInfo.title || 'X / Twitter Video';
  const cleanTitle = title.length > 80 ? title.substring(0, 80) + '...' : title;
  const authorName = mediaInfo.uploader || mediaInfo.channel || 'X Creator';
  const authorUsername = mediaInfo.uploader_id || authorName.replace(/[^\w]/g, '').toLowerCase();
  const coverUrl = mediaInfo.thumbnail || '';
  const isGif = mediaInfo.duration ? mediaInfo.duration <= 4 : false;

  const downloads: any[] = [
    {
      id: 'tw_1080p_fhd',
      label: '1080p Full HD (Recommended)',
      quality: '1080',
      description: 'Original high-definition MP4 video with crisp audio',
      badge: '1080p FULL HD',
      type: 'video',
      url: cleanUrl,
      extension: 'mp4',
      recommend: true,
    },
    {
      id: 'tw_720p_hd',
      label: '720p HD (Fast Download)',
      quality: '720',
      description: 'Standard HD MP4 — quick to save and share',
      badge: '720p HD',
      type: 'video',
      url: cleanUrl,
      extension: 'mp4',
      recommend: false,
    },
  ];

  if (isGif) {
    downloads.push({
      id: 'tw_gif',
      label: 'Download Animated GIF',
      quality: 'gif',
      description: 'Clean looping animation for social media',
      badge: 'GIF ANIMATION',
      type: 'gif',
      url: cleanUrl,
      extension: 'mp4',
      recommend: false,
    });
  }

  downloads.push(
    {
      id: 'tw_audio_mp3',
      label: 'Download Audio (MP3)',
      quality: 'audio',
      description: 'Extract background speech or music as 320kbps MP3',
      badge: 'MP3 AUDIO',
      type: 'audio',
      url: cleanUrl,
      extension: 'mp3',
      recommend: false,
    },
    {
      id: 'tw_thumbnail',
      label: 'Download HD Cover Artwork',
      quality: 'thumb',
      description: 'Full-resolution video thumbnail image in JPG',
      badge: 'HD IMAGE',
      type: 'thumbnail',
      url: coverUrl,
      extension: 'jpg',
      recommend: false,
    }
  );

  // Direct video stream for HTML5 preview playback
  let videoStreamUrl = mediaInfo.url || '';
  if (!videoStreamUrl && Array.isArray(mediaInfo.formats)) {
    const mp4Formats = mediaInfo.formats.filter((f: any) => f.url && (f.ext === 'mp4' || f.vcodec !== 'none'));
    if (mp4Formats.length > 0) {
      const bestPreview = mp4Formats.find((f: any) => f.height && f.height <= 720) || mp4Formats[mp4Formats.length - 1];
      videoStreamUrl = bestPreview.url;
    }
  }

  return {
    id: tweetId,
    tweetId,
    title: cleanTitle,
    duration: mediaInfo.duration || 0,
    durationFormatted: isGif ? 'GIF' : 'Video',
    cover: coverUrl,
    videoStreamUrl,
    author: {
      name: authorName,
      username: authorUsername,
      avatarUrl: mediaInfo.uploader_url || '',
      profileUrl: `https://x.com/${authorUsername}`,
      verified: true,
    },
    stats: {
      likes: mediaInfo.like_count || 0,
      retweets: mediaInfo.repost_count || 0,
      replies: mediaInfo.comment_count || 0,
      views: mediaInfo.view_count || 0,
    },
    isGif,
    aspectRatio: isGif ? ('1:1' as const) : ('16:9' as const),
    downloads,
    originalUrl: cleanUrl,
    extractedAt: Date.now(),
  };
}

// ─── API Routes ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TweetDownloader API', timestamp: new Date().toISOString() });
});

app.post('/api/extract', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL parameter is required.' });
    }

    const data = await extractTweetMedia(url);
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('[API /extract] Error:', err);
    return res.status(400).json({
      success: false,
      error: err?.message || 'Failed to extract X / Twitter media.',
    });
  }
});

app.get('/api/proxy-download', async (req, res) => {
  const targetUrl = req.query.url as string;
  const qualityStr = (req.query.quality as string) || '1080';
  const customFilename = req.query.filename as string;
  const isAudio = req.query.isAudio === '1';
  const fileExt = (req.query.ext as string) || (isAudio ? 'mp3' : 'mp4');

  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required.' });
  }

  // If thumbnail requested directly
  if (qualityStr === 'thumb') {
    return res.redirect(targetUrl);
  }

  const ytdlpBin = await ensureYtDlp();
  const ffmpegBin = await ensureFfmpeg();

  const tempFileId = `tw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tmpFile = path.join('/tmp', tempFileId);
  const safeFilename = sanitizeFilename(customFilename || 'tweet_media');

  try {
    let ytdlpArgs: string[];
    if (isAudio) {
      ytdlpArgs = [
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '--ffmpeg-location', ffmpegBin,
        '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        '--add-header', 'Referer:https://x.com/',
        '--add-header', 'Accept-Language:en-US,en;q=0.9',
        '-o', tmpFile,
        '--no-playlist',
        '--js-runtimes', 'node',
        targetUrl,
      ];
    } else {
      const qNum = parseInt(qualityStr, 10) || 1080;
      const format = `best[height<=${qNum}]/bestvideo[height<=${qNum}]+bestaudio/best`;

      ytdlpArgs = [
        '-f', format,
        '--merge-output-format', 'mp4',
        '--ffmpeg-location', ffmpegBin,
        '--postprocessor-args', 'ffmpeg:-movflags +faststart',
        '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        '--add-header', 'Referer:https://x.com/',
        '--add-header', 'Accept-Language:en-US,en;q=0.9',
        '-o', tmpFile,
        '--no-playlist',
        '--js-runtimes', 'node',
        targetUrl,
      ];
    }

    console.log('[yt-dlp] Downloading X / Twitter media:', ytdlpArgs.join(' '));
    await execFileAsync(ytdlpBin, ytdlpArgs, { timeout: 45000 });

    let actualFile = tmpFile;
    if (!fs.existsSync(actualFile)) {
      if (fs.existsSync(`${tmpFile}.mp3`)) actualFile = `${tmpFile}.mp3`;
      else if (fs.existsSync(`${tmpFile}.mp4`)) actualFile = `${tmpFile}.mp4`;
    }

    if (!fs.existsSync(actualFile)) {
      return res.status(500).json({ error: 'Failed to generate media file.' });
    }

    const stat = fs.statSync(actualFile);
    if (stat.size === 0) {
      try { fs.unlinkSync(actualFile); } catch {}
      return res.status(500).json({ error: 'Generated file is empty.' });
    }

    const contentType = isAudio ? 'audio/mpeg' : 'video/mp4';
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.${fileExt}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Cache-Control', 'no-cache');

    const readStream = fs.createReadStream(actualFile);
    readStream.pipe(res);

    const cleanup = () => {
      try {
        if (fs.existsSync(actualFile)) fs.unlinkSync(actualFile);
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {}
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);
  } catch (err: any) {
    console.error('[Download Handler Error]:', err);
    return res.status(500).json({ error: 'Failed to download media.', detail: err?.message });
  }
});

// ─── Direct In-App Video Preview Streamer ──────────────────────────────────────

app.get('/api/stream-preview', (req, res) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).send('Video URL parameter is required.');
  }

  try {
    const protocol = videoUrl.startsWith('https') ? https : http;
    const clientReq = protocol.get(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://x.com/',
      },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        ...(proxyRes.headers['content-length'] ? { 'Content-Length': proxyRes.headers['content-length'] } : {}),
      });
      proxyRes.pipe(res);
    });

    clientReq.on('error', (err) => {
      console.warn('[stream-preview error]:', err?.message);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (err: any) {
    console.warn('[stream-preview catch]:', err?.message);
    if (!res.headersSent) res.status(500).end();
  }
});

// ─── Resend Admin Notification for Signups ────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, method, app: appName } = req.body;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      const emailPayload = {
        from: 'TweetDownloader <onboarding@resend.dev>',
        to: ['funnelflux.assets@gmail.com'],
        subject: `🎉 New User Signup on ${appName || 'TweetDownloader'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0F1419; color: #ffffff; padding: 24px; border-radius: 16px;">
            <h2 style="color: #1D9BF0; margin-top: 0;">🚀 New Member Registered!</h2>
            <p style="font-size: 15px; line-height: 1.5; color: #CBD5E1;">A new user just created an account on <strong>${appName || 'TweetDownloader'}</strong>.</p>
            <div style="background: #1E2732; padding: 16px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 6px 0;"><strong>Name:</strong> ${name || 'N/A'}</p>
              <p style="margin: 6px 0;"><strong>Email:</strong> ${email || 'N/A'}</p>
              <p style="margin: 6px 0;"><strong>Auth Method:</strong> ${method || 'Direct'}</p>
              <p style="margin: 6px 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="font-size: 12px; color: #64748B;">This is an automated notification from your TweetDownloader instance.</p>
          </div>
        `,
      };

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.warn('[Register Notification]:', err?.message);
    return res.json({ success: true, note: 'Notification skipped' });
  }
});

// Fallback for SPA routing
app.get('*', (_req, res) => {
  const indexHtml = path.join(serverDir, 'dist', 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.sendFile(path.join(serverDir, 'index.html'));
});

// Start Local Server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`⚡ TweetDownloader server running at http://localhost:${PORT}`);
  });
}

export default app;
