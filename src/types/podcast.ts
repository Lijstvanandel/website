export interface PodcastItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  category: string;
  wijkSlug?: string;
  wijkNaam?: string;
  duration?: string;
  date: string;
  author?: string;
  authorId?: string;
  spotifyUrl?: string;
  appleUrl?: string;
  views?: number;
  mediaStats?: {
    starts: number;
    p25: number;
    p50: number;
    p75: number;
    p100: number;
  };
  createdAt?: string;
  updatedAt?: string;
}
