import axios from 'axios'
import { UnifiedSong } from '@/types'

export class SpotifyClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async request(endpoint: string, params?: Record<string, string>) {
    try {
      const response = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        params
      })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Token expired')
      }
      throw error
    }
  }

  async getUserPlaylists() {
    const data = await this.request('/me/playlists', { limit: '50' })
    return data.items.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      trackCount: playlist.tracks.total,
      thumbnail: playlist.images[0]?.url
    }))
  }

  async getPlaylistTracks(playlistId: string) {
    const data = await this.request(`/playlists/${playlistId}/tracks`, { limit: '100' })
    return data.items
      .filter((item: any) => item.track)
      .map((item: any) => this.normalizeTrack(item.track))
  }

  async getLikedSongs() {
    const data = await this.request('/me/tracks', { limit: '50' })
    return data.items.map((item: any) => this.normalizeTrack(item.track))
  }

  async getRecentlyPlayed() {
    const data = await this.request('/me/player/recently-played', { limit: '50' })
    return data.items.map((item: any) => ({
      ...this.normalizeTrack(item.track),
      playedAt: new Date(item.played_at)
    }))
  }

  async getTrackDetails(trackId: string) {
    const track = await this.request(`/tracks/${trackId}`)
    const audioFeatures = await this.request(`/audio-features/${trackId}`)
    return {
      ...this.normalizeTrack(track),
      tempo: audioFeatures?.tempo,
      energy: audioFeatures?.energy,
      danceability: audioFeatures?.danceability,
      valence: audioFeatures?.valence
    }
  }

  async getArtistGenres(artistId: string): Promise<string[]> {
    const data = await this.request(`/artists/${artistId}`)
    return data.genres || []
  }

  private normalizeTrack(track: any): UnifiedSong {
    return {
      id: `spotify_${track.id}`,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album?.name,
      duration: Math.floor(track.duration_ms / 1000),
      platform: 'spotify',
      platformId: track.id,
      thumbnail: track.album?.images[0]?.url,
      url: track.external_urls?.spotify
    }
  }
}
