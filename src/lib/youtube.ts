import axios from 'axios'
import { UnifiedSong } from '@/types'

export class YouTubeClient {
  private apiKey: string
  private accessToken?: string

  constructor(apiKey: string, accessToken?: string) {
    this.apiKey = apiKey
    this.accessToken = accessToken
  }

  private async request(endpoint: string, params?: Record<string, string>) {
    const headers: Record<string, string> = {}
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`
    }

    const response = await axios.get(`https://www.googleapis.com/youtube/v3${endpoint}`, {
      headers,
      params: {
        ...params,
        key: this.apiKey
      }
    })
    return response.data
  }

  async getUserPlaylists() {
    if (!this.accessToken) throw new Error('Access token required')
    
    const data = await this.request('/playlists', {
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50'
    })

    return data.items.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.snippet.title,
      description: playlist.snippet.description,
      trackCount: playlist.contentDetails.itemCount,
      thumbnail: playlist.snippet.thumbnails?.default?.url
    }))
  }

  async getPlaylistItems(playlistId: string) {
    const data = await this.request('/playlistItems', {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: '50'
    })

    const videoIds = data.items.map((item: any) => item.contentDetails.videoId).join(',')
    const videosData = await this.getVideoDetails(videoIds)

    return data.items.map((item: any) => {
      const videoDetails = videosData.find((v: any) => v.id === item.contentDetails.videoId)
      return this.normalizeVideo({
        ...item.snippet,
        ...videoDetails
      })
    })
  }

  async getLikedSongs() {
    if (!this.accessToken) throw new Error('Access token required')

    const data = await this.request('/videos', {
      part: 'snippet,contentDetails',
      myRating: 'like',
      maxResults: '50'
    })

    return data.items.map((video: any) => this.normalizeVideo(video))
  }

  async getVideoDetails(videoIds: string) {
    const data = await this.request('/videos', {
      part: 'snippet,contentDetails',
      id: videoIds
    })
    return data.items
  }

  async searchMusic(query: string) {
    const data = await this.request('/search', {
      part: 'snippet',
      q: query,
      type: 'video',
      videoCategoryId: '10', // Music category
      maxResults: '20'
    })

    return data.items.map((item: any) => this.normalizeVideo({
      ...item.snippet,
      id: item.id.videoId
    }))
  }

  private normalizeVideo(video: any): UnifiedSong {
    const duration = this.parseDuration(video.contentDetails?.duration)
    
    // Try to extract artist from title (common formats: "Artist - Title" or "Artist | Title")
    let title = video.title || ''
    let artist = video.channelTitle || 'Unknown Artist'
    
    const separators = [' - ', ' | ', ' – ', ' — ']
    for (const sep of separators) {
      if (title.includes(sep)) {
        const parts = title.split(sep)
        artist = parts[0].trim()
        title = parts.slice(1).join(sep).trim()
        break
      }
    }

    return {
      id: `youtube_${video.id}`,
      title,
      artist,
      duration,
      platform: 'youtube',
      platformId: video.id,
      thumbnail: video.thumbnails?.default?.url || video.thumbnails?.medium?.url,
      url: `https://www.youtube.com/watch?v=${video.id}`
    }
  }

  private parseDuration(duration: string | undefined): number | undefined {
    if (!duration) return undefined
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return undefined
    
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')
    
    return hours * 3600 + minutes * 60 + seconds
  }
}
