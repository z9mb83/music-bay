import axios from 'axios'
import { UnifiedSong } from '@/types'

export class JioSaavnClient {
  private baseUrl = 'https://www.jiosaavn.com/api.php'

  private async request(params: Record<string, string>) {
    const response = await axios.get(this.baseUrl, {
      params: {
        ...params,
        _format: 'json',
        _marker: '0',
        api_version: '4',
        ctx: 'web6dot0'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    return response.data
  }

  async searchSongs(query: string): Promise<UnifiedSong[]> {
    try {
      const data = await this.request({
        __call: 'search.getResults',
        q: query,
        n: '20',
        p: '1'
      })

      if (!data.results) return []

      return data.results.map((song: any) => this.normalizeSong(song))
    } catch (error) {
      console.error('JioSaavn search error:', error)
      return []
    }
  }

  async getSongDetails(songId: string): Promise<UnifiedSong | null> {
    try {
      const data = await this.request({
        __call: 'song.getDetails',
        pids: songId
      })

      const song = data.songs?.[0]
      if (!song) return null

      return this.normalizeSong(song)
    } catch (error) {
      console.error('JioSaavn song details error:', error)
      return null
    }
  }

  async getPlaylistDetails(playlistId: string): Promise<UnifiedSong[]> {
    try {
      const data = await this.request({
        __call: 'playlist.getDetails',
        pid: playlistId
      })

      if (!data.list) return []

      return data.list.map((song: any) => this.normalizeSong(song))
    } catch (error) {
      console.error('JioSaavn playlist error:', error)
      return []
    }
  }

  async getTopSongs(language: string = 'hindi'): Promise<UnifiedSong[]> {
    try {
      const data = await this.request({
        __call: 'content.getTopSongs',
        language: language
      })

      if (!data) return []

      return data.map((song: any) => this.normalizeSong(song))
    } catch (error) {
      console.error('JioSaavn top songs error:', error)
      return []
    }
  }

  private normalizeSong(song: any): UnifiedSong {
    return {
      id: `jiosaavn_${song.id}`,
      title: song.title || song.song || 'Unknown Title',
      artist: song.primary_artists || song.singers || 'Unknown Artist',
      album: song.album,
      duration: parseInt(song.duration) || undefined,
      platform: 'jiosaavn',
      platformId: song.id,
      thumbnail: song.image?.replace('150x150', '500x500') || song.image,
      url: song.perma_url || song.url
    }
  }

  // Helper to detect language from song metadata
  detectLanguage(song: any): string {
    const languageIndicators: Record<string, string[]> = {
      'hindi': ['hindi', 'bollywood', 'देवनागरी'],
      'punjabi': ['punjabi', 'ਪੰਜਾਬੀ'],
      'tamil': ['tamil', 'தமிழ்'],
      'telugu': ['telugu', 'తెలుగు'],
      'marathi': ['marathi', 'मराठी'],
      'bengali': ['bengali', 'bangla', 'বাংলা'],
      'kannada': ['kannada', 'ಕನ್ನಡ'],
      'malayalam': ['malayalam', 'മലയാളം'],
      'gujarati': ['gujarati', 'ગુજરાતી'],
      'english': ['english', 'pop', 'rock', 'hip-hop']
    }

    const textToCheck = `${song.language || ''} ${song.title || ''} ${song.album || ''}`.toLowerCase()

    for (const [lang, indicators] of Object.entries(languageIndicators)) {
      if (indicators.some(ind => textToCheck.includes(ind))) {
        return lang
      }
    }

    return song.language || 'unknown'
  }
}
