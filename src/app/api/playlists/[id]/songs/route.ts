import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: playlistId } = await params
    const { songOrders } = await request.json() as { songOrders: { songId: string; order: number }[] }

    // Verify playlist belongs to user
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId: session.user.id
      }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Update song orders in transaction
    const updates = songOrders.map(({ songId, order }) =>
      prisma.playlistSong.updateMany({
        where: {
          playlistId,
          songId
        },
        data: { order }
      })
    )

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering songs:', error)
    return NextResponse.json(
      { error: 'Failed to reorder songs' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: playlistId } = await params
    const { songId } = await request.json() as { songId: string }

    // Verify playlist belongs to user
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId: session.user.id
      }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Get current max order
    const maxOrder = await prisma.playlistSong.findFirst({
      where: { playlistId },
      orderBy: { order: 'desc' }
    })

    // Add song to playlist
    await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        order: (maxOrder?.order ?? 0) + 1
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding song to playlist:', error)
    return NextResponse.json(
      { error: 'Failed to add song' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: playlistId } = await params
    const { searchParams } = new URL(request.url)
    const songId = searchParams.get('songId')

    if (!songId) {
      return NextResponse.json({ error: 'Song ID required' }, { status: 400 })
    }

    // Verify playlist belongs to user
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId: session.user.id
      }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Remove song from playlist
    await prisma.playlistSong.deleteMany({
      where: {
        playlistId,
        songId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing song from playlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove song' },
      { status: 500 }
    )
  }
}
