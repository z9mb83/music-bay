import axios from 'axios'
import { UnifiedSong } from '@/types'

export class GenreLanguageDetector {
  private lastFmApiKey: string
  private openAiApiKey?: string

  constructor(lastFmApiKey: string, openAiApiKey?: string) {
    this.lastFmApiKey = lastFmApiKey
    this.openAiApiKey = openAiApiKey
  }

  // Enrich song with genre and language information
  async enrichSong(song: UnifiedSong): Promise<UnifiedSong> {
    const [genre, language] = await Promise.all([
      this.detectGenre(song),
      this.detectLanguage(song)
    ])

    return {
      ...song,
      genre: genre || song.genre,
      language: language || song.language
    }
  }

  // Detect genre using multiple sources
  private async detectGenre(song: UnifiedSong): Promise<string | undefined> {
    // Try Last.fm first
    const lastFmGenre = await this.getLastFmGenre(song.artist, song.title)
    if (lastFmGenre) return lastFmGenre

    // Try AI classification if available
    if (this.openAiApiKey) {
      return await this.aiClassifyGenre(song)
    }

    // Fallback to platform-specific genres
    return this.inferGenreFromMetadata(song)
  }

  // Get genre from Last.fm API
  private async getLastFmGenre(artist: string, title: string): Promise<string | undefined> {
    try {
      // Try track.getInfo first
      const trackResponse = await axios.get('http://ws.audioscrobbler.com/2.0/', {
        params: {
          method: 'track.getInfo',
          api_key: this.lastFmApiKey,
          artist,
          track: title,
          format: 'json'
        }
      })

      const trackTags = trackResponse.data.track?.toptags?.tag
      if (trackTags && trackTags.length > 0) {
        return trackTags[0].name
      }

      // Fall back to artist tags
      const artistResponse = await axios.get('http://ws.audioscrobbler.com/2.0/', {
        params: {
          method: 'artist.getTopTags',
          api_key: this.lastFmApiKey,
          artist,
          format: 'json'
        }
      })

      const artistTags = artistResponse.data.toptags?.tag
      if (artistTags && artistTags.length > 0) {
        return artistTags[0].name
      }
    } catch (error) {
      console.error('Last.fm API error:', error)
    }

    return undefined
  }

  // AI-based genre classification using OpenAI
  private async aiClassifyGenre(song: UnifiedSong): Promise<string | undefined> {
    if (!this.openAiApiKey) return undefined

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a music genre classifier. Respond with only the primary genre (one word or short phrase).'
          },
          {
            role: 'user',
            content: `Classify the genre of this song:\nTitle: ${song.title}\nArtist: ${song.artist}\nAlbum: ${song.album || 'Unknown'}`
          }
        ],
        max_tokens: 20,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.openAiApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data.choices[0]?.message?.content?.trim().toLowerCase()
    } catch (error) {
      console.error('OpenAI classification error:', error)
      return undefined
    }
  }

  // Infer genre from metadata hints
  private inferGenreFromMetadata(song: UnifiedSong): string | undefined {
    const title = song.title.toLowerCase()
    const artist = song.artist.toLowerCase()

    // Common genre indicators in titles
    const genreKeywords: Record<string, string[]> = {
      'electronic': ['edm', 'electro', 'house', 'techno', 'dubstep', 'trance'],
      'hip-hop': ['rap', 'hip hop', 'trap', 'freestyle'],
      'rock': ['rock', 'metal', 'punk', 'grunge'],
      'pop': ['pop'],
      'r&b': ['r&b', 'rnb', 'soul'],
      'classical': ['classical', 'symphony', 'orchestra'],
      'jazz': ['jazz', 'blues'],
      'country': ['country', 'folk', 'bluegrass'],
      'reggae': ['reggae', 'dub', 'dancehall'],
      'latin': ['latin', 'salsa', 'reggaeton', 'bachata', 'merengue']
    }

    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(kw => title.includes(kw) || artist.includes(kw))) {
        return genre
      }
    }

    return undefined
  }

  // Detect language from song metadata
  private async detectLanguage(song: UnifiedSong): Promise<string | undefined> {
    // Check for explicit language markers in title/artist
    const text = `${song.title} ${song.artist}`.toLowerCase()

    const languagePatterns: Record<string, RegExp[]> = {
      'hindi': [/[\u0900-\u097F]/, /\b(hindi|bollywood)\b/],
      'punjabi': [/[\u0A00-\u0A7F]/, /\b(punjabi|bhangra)\b/],
      'tamil': [/[\u0B80-\u0BFF]/, /\btamil\b/],
      'telugu': [/[\u0C00-\u0C7F]/, /\btelugu\b/],
      'kannada': [/[\u0C80-\u0CFF]/, /\bkannada\b/],
      'malayalam': [/[\u0D00-\u0D7F]/, /\bmalayalam\b/],
      'bengali': [/[\u0980-\u09FF]/, /\b(bengali|bangla)\b/],
      'marathi': [/[\u0900-\u097F]/, /\bmarathi\b/],
      'gujarati': [/[\u0A80-\u0AFF]/, /\bgujarati\b/],
      'spanish': [/[áéíóúüñ]/i, /\b(spanish|español|latino)\b/],
      'french': [/[àâäæçéèêëîïôœùûüÿ]/i, /\b(french|français)\b/],
      'german': [/[äöüß]/, /\bgerman\b/],
      'korean': [/[\uAC00-\uD7AF]/, /\b(korean|k-pop|kpop)\b/],
      'japanese': [/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/, /\b(japanese|j-pop|jpop)\b/],
      'chinese': [/[\u4E00-\u9FA5]/, /\b(chinese|mandarin|c-pop)\b/],
      'arabic': [/[\u0600-\u06FF]/, /\barabic\b/]
    }

    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      if (patterns.some(pattern => pattern.test(text))) {
        return lang
      }
    }

    // Default to 'english' for songs with only Latin characters
    if (/^[\x00-\x7F]+$/.test(text.replace(/\s/g, ''))) {
      return 'english'
    }

    return undefined
  }

  // Batch enrich multiple songs
  async enrichSongs(songs: UnifiedSong[]): Promise<UnifiedSong[]> {
    return Promise.all(songs.map(song => this.enrichSong(song)))
  }
}
