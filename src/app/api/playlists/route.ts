import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { PlaylistOrganizer } from '@/services/playlistOrganizer'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const organizer = new PlaylistOrganizer(
      process.env.LASTFM_API_KEY!,
      process.env.OPENAI_API_KEY
    )

    let playlists
    if (type === 'auto') {
      playlists = await organizer.getAutoPlaylists(session.user.id)
    } else if (type === 'custom') {
      playlists = await organizer.getCustomPlaylists(session.user.id)
    } else {
      const auto = await organizer.getAutoPlaylists(session.user.id)
      const custom = await organizer.getCustomPlaylists(session.user.id)
      playlists = [...auto, ...custom]
    }

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
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

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Playlist name is required' },
        { status: 400 }
      )
    }

    const organizer = new PlaylistOrganizer(
      process.env.LASTFM_API_KEY!,
      process.env.OPENAI_API_KEY
    )

    const playlist = await organizer.createCustomPlaylist(
      session.user.id,
      name,
      description
    )

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error('Error creating playlist:', error)
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    )
  }
}
