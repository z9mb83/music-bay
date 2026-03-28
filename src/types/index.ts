export interface UnifiedSong {
  id: string
  title: string
  artist: string
  album?: string
  duration?: number
  platform: 'spotify' | 'youtube' | 'jiosaavn'
  platformId: string
  thumbnail?: string
  genre?: string
  language?: string
  url?: string
  playedAt?: Date
}

export interface Playlist {
  id: string
  name: string
  description?: string
  type: 'auto-genre' | 'auto-language' | 'custom'
  genre?: string
  language?: string
  isAuto: boolean
  thumbnail?: string
  songs: UnifiedSong[]
  songCount: number
}

export interface PlatformAccount {
  platform: 'spotify' | 'youtube' | 'jiosaavn'
  connected: boolean
  email?: string
  name?: string
  image?: string
}

export interface UserSession {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
  accessToken?: string
  refreshToken?: string
  provider?: string
}
