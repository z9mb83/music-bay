import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { SpotifyClient } from '@/lib/spotify'
import { YouTubeClient } from '@/lib/youtube'
import { JioSaavnClient } from '@/lib/jiosaavn'
import { PlaylistOrganizer } from '@/services/playlistOrganizer'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const genre = searchParams.get('genre')
    const language = searchParams.get('language')

    const where: any = {
      userId: session.user.id
    }

    if (platform) {
      where.platform = platform
    }

    if (genre) {
      where.genre = genre
    }

    if (language) {
      where.language = language
    }

    const songs = await prisma.song.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ songs })
  } catch (error) {
    console.error('Error fetching songs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platform } = await request.json()

    if (!platform || !['spotify', 'youtube', 'jiosaavn'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    // Get platform token
    const token = await prisma.platformToken.findUnique({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform
        }
      }
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Platform not connected' },
        { status: 400 }
      )
    }

    // Fetch songs from platform
    let songs: any[] = []

    switch (platform) {
      case 'spotify':
        const spotify = new SpotifyClient(token.accessToken)
        const [playlists, likedSongs, recentlyPlayed] = await Promise.all([
          spotify.getUserPlaylists(),
          spotify.getLikedSongs(),
          spotify.getRecentlyPlayed()
        ])
        
        // Get tracks from all playlists
        const playlistTracks = await Promise.all(
          playlists.slice(0, 5).map((p: { id: string }) => spotify.getPlaylistTracks(p.id))
        )
        
        songs = [
          ...likedSongs,
          ...recentlyPlayed,
          ...playlistTracks.flat()
        ]
        break

      case 'youtube':
        const youtube = new YouTubeClient(
          process.env.YOUTUBE_API_KEY!,
          token.accessToken
        )
        const ytPlaylists = await youtube.getUserPlaylists()
        const ytLiked = await youtube.getLikedSongs()
        
        const ytPlaylistVideos = await Promise.all(
          ytPlaylists.slice(0, 3).map((p: { id: string }) => youtube.getPlaylistItems(p.id))
        )
        
        songs = [...ytLiked, ...ytPlaylistVideos.flat()]
        break

      case 'jiosaavn':
        const jiosaavn = new JioSaavnClient()
        songs = await jiosaavn.getTopSongs('hindi')
        break
    }

    // Organize songs into playlists
    const organizer = new PlaylistOrganizer(
      process.env.LASTFM_API_KEY!,
      process.env.OPENAI_API_KEY
    )

    const playlists = await organizer.organizeSongs(session.user.id, songs)

    return NextResponse.json({ 
      success: true, 
      songsCount: songs.length,
      playlistsCreated: playlists.length,
      playlists 
    })

  } catch (error) {
    console.error('Error importing songs:', error)
    return NextResponse.json(
      { error: 'Failed to import songs' },
      { status: 500 }
    )
  }
}
