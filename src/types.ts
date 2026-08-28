export interface DownloadOption {
  id: string;
  label: string;
  quality: string;
  resolution?: string;
  description: string;
  badge: string;
  type: 'video' | 'audio' | 'gif' | 'thumbnail';
  url: string;
  extension: string;
  recommend?: boolean;
}

export interface TweetMediaResult {
  id: string;
  tweetId: string;
  title: string;
  duration: number;
  durationFormatted: string;
  cover: string;
  videoStreamUrl?: string;
  author: {
    name: string;
    username: string;
    avatarUrl?: string;
    profileUrl: string;
    verified?: boolean;
  };
  stats: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
  };
  isGif: boolean;
  aspectRatio: '16:9' | '9:16' | '1:1';
  downloads: DownloadOption[];
  originalUrl: string;
  extractedAt: number;
}

export interface UserAccount {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  downloadCount: number;
  unlimited: boolean;
}

export interface HistoryItem extends TweetMediaResult {}
