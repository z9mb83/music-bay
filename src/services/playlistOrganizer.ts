import { prisma } from '@/lib/prisma'
import { UnifiedSong, Playlist } from '@/types'
import { SongNormalizer } from './songNormalizer'
import { GenreLanguageDetector } from './genreDetector'

export class PlaylistOrganizer {
  private detector: GenreLanguageDetector

  constructor(lastFmApiKey: string, openAiApiKey?: string) {
    this.detector = new GenreLanguageDetector(lastFmApiKey, openAiApiKey)
  }

  // Organize songs into auto-generated playlists
  async organizeSongs(userId: string, songs: UnifiedSong[]): Promise<Playlist[]> {
    // Step 1: Normalize and deduplicate songs
    const normalized = SongNormalizer.normalize(songs)
    const duplicates = SongNormalizer.findDuplicates(normalized)
    const uniqueSongs = SongNormalizer.mergeDuplicates(duplicates)

    // Step 2: Enrich with genre and language
    const enriched = await this.detector.enrichSongs(uniqueSongs)

    // Step 3: Save songs to database
    await this.saveSongs(userId, enriched)

    // Step 4: Create auto-playlists
    const genrePlaylists = await this.createGenrePlaylists(userId, enriched)
    const languagePlaylists = await this.createLanguagePlaylists(userId, enriched)

    return [...genrePlaylists, ...languagePlaylists]
  }

  // Save songs to database
  private async saveSongs(userId: string, songs: UnifiedSong[]) {
    const operations = songs.map(song => 
      prisma.song.upsert({
        where: {
          userId_platform_platformId: {
            userId,
            platform: song.platform,
            platformId: song.platformId
          }
        },
        update: {
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          thumbnail: song.thumbnail,
          genre: song.genre,
          language: song.language,
          url: song.url,
          playedAt: song.playedAt
        },
        create: {
          userId,
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          platform: song.platform,
          platformId: song.platformId,
          thumbnail: song.thumbnail,
          genre: song.genre,
          language: song.language,
          url: song.url,
          playedAt: song.playedAt
        }
      })
    )

    await prisma.$transaction(operations)
  }

  // Create genre-based auto-playlists
  private async createGenrePlaylists(userId: string, songs: UnifiedSong[]): Promise<Playlist[]> {
    // Group songs by genre
    const genreGroups = new Map<string, UnifiedSong[]>()

    for (const song of songs) {
      if (song.genre) {
        if (!genreGroups.has(song.genre)) {
          genreGroups.set(song.genre, [])
        }
        genreGroups.get(song.genre)!.push(song)
      }
    }

    const playlists: Playlist[] = []

    for (const [genre, genreSongs] of genreGroups) {
      if (genreSongs.length < 3) continue // Skip genres with too few songs

      // Create or update playlist
      const playlist = await prisma.playlist.upsert({
        where: {
          id: `${userId}_genre_${genre}`
        },
        update: {
          songs: {
            deleteMany: {},
            create: genreSongs.map((song, index) => ({
              song: {
                connect: {
                  userId_platform_platformId: {
                    userId,
                    platform: song.platform,
                    platformId: song.platformId
                  }
                }
              },
              order: index
            }))
          }
        },
        create: {
          id: `${userId}_genre_${genre}`,
          userId,
          name: `${this.capitalize(genre)} Mix`,
          description: `Auto-generated playlist of ${genre} songs`,
          type: 'auto-genre',
          genre,
          isAuto: true,
          thumbnail: genreSongs[0].thumbnail,
          songs: {
            create: genreSongs.map((song, index) => ({
              song: {
                connect: {
                  userId_platform_platformId: {
                    userId,
                    platform: song.platform,
                    platformId: song.platformId
                  }
                }
              },
              order: index
            }))
          }
        },
        include: {
          songs: {
            include: {
              song: true
            }
          }
        }
      })

      playlists.push(this.mapToPlaylist(playlist))
    }

    return playlists
  }

  // Create language-based auto-playlists
  private async createLanguagePlaylists(userId: string, songs: UnifiedSong[]): Promise<Playlist[]> {
    // Group songs by language
    const languageGroups = new Map<string, UnifiedSong[]>()

    for (const song of songs) {
      const language = song.language || 'unknown'
      if (!languageGroups.has(language)) {
        languageGroups.set(language, [])
      }
      languageGroups.get(language)!.push(song)
    }

    const playlists: Playlist[] = []

    for (const [language, langSongs] of languageGroups) {
      if (langSongs.length < 3) continue

      const playlist = await prisma.playlist.upsert({
        where: {
          id: `${userId}_lang_${language}`
        },
        update: {
          songs: {
            deleteMany: {},
            create: langSongs.map((song, index) => ({
              song: {
                connect: {
                  userId_platform_platformId: {
                    userId,
                    platform: song.platform,
                    platformId: song.platformId
                  }
                }
              },
              order: index
            }))
          }
        },
        create: {
          id: `${userId}_lang_${language}`,
          userId,
          name: `${this.capitalize(language)} Collection`,
          description: `Auto-generated playlist of ${language} songs`,
          type: 'auto-language',
          language,
          isAuto: true,
          thumbnail: langSongs[0].thumbnail,
          songs: {
            create: langSongs.map((song, index) => ({
              song: {
                connect: {
                  userId_platform_platformId: {
                    userId,
                    platform: song.platform,
                    platformId: song.platformId
                  }
                }
              },
              order: index
            }))
          }
        },
        include: {
          songs: {
            include: {
              song: true
            }
          }
        }
      })

      playlists.push(this.mapToPlaylist(playlist))
    }

    return playlists
  }

  // Map database playlist to unified type
  private mapToPlaylist(dbPlaylist: any): Playlist {
    return {
      id: dbPlaylist.id,
      name: dbPlaylist.name,
      description: dbPlaylist.description,
      type: dbPlaylist.type,
      genre: dbPlaylist.genre,
      language: dbPlaylist.language,
      isAuto: dbPlaylist.isAuto,
      thumbnail: dbPlaylist.thumbnail,
      songs: dbPlaylist.songs.map((ps: { song: any }) => ({
        id: ps.song.id,
        title: ps.song.title,
        artist: ps.song.artist,
        album: ps.song.album,
        duration: ps.song.duration,
        platform: ps.song.platform as 'spotify' | 'youtube' | 'jiosaavn',
        platformId: ps.song.platformId,
        thumbnail: ps.song.thumbnail,
        genre: ps.song.genre,
        language: ps.song.language,
        url: ps.song.url,
        playedAt: ps.song.playedAt
      })),
      songCount: dbPlaylist.songs.length
    }
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // Get user's auto-playlists
  async getAutoPlaylists(userId: string): Promise<Playlist[]> {
    const playlists = await prisma.playlist.findMany({
      where: {
        userId,
        isAuto: true
      },
      include: {
        songs: {
          include: {
            song: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return playlists.map((p: any) => this.mapToPlaylist(p))
  }

  // Get user's custom playlists
  async getCustomPlaylists(userId: string): Promise<Playlist[]> {
    const playlists = await prisma.playlist.findMany({
      where: {
        userId,
        isAuto: false
      },
      include: {
        songs: {
          include: {
            song: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return playlists.map((p: any) => this.mapToPlaylist(p))
  }

  // Create custom playlist
  async createCustomPlaylist(userId: string, name: string, description?: string): Promise<Playlist> {
    const playlist = await prisma.playlist.create({
      data: {
        userId,
        name,
        description,
        type: 'custom',
        isAuto: false
      },
      include: {
        songs: {
          include: {
            song: true
          }
        }
      }
    })

    return this.mapToPlaylist(playlist)
  }

  // Add song to playlist
  async addSongToPlaylist(playlistId: string, songId: string, order?: number) {
    await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        order: order ?? 0
      }
    })
  }

  // Remove song from playlist
  async removeSongFromPlaylist(playlistId: string, songId: string) {
    await prisma.playlistSong.deleteMany({
      where: {
        playlistId,
        songId
      }
    })
  }

  // Reorder songs in playlist
  async reorderSongs(playlistId: string, songOrders: { songId: string; order: number }[]) {
    const operations = songOrders.map(({ songId, order }) =>
      prisma.playlistSong.updateMany({
        where: {
          playlistId,
          songId
        },
        data: {
          order
        }
      })
    )

    await prisma.$transaction(operations)
  }
}
