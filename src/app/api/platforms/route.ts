import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tokens = await prisma.platformToken.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        platform: true,
        createdAt: true
      }
    })

    const platforms = [
      { platform: 'spotify', connected: false },
      { platform: 'youtube', connected: false },
      { platform: 'jiosaavn', connected: false }
    ]

    for (const token of tokens) {
      const platform = platforms.find(p => p.platform === token.platform)
      if (platform) {
        platform.connected = true
      }
    }

    return NextResponse.json({ platforms })
  } catch (error) {
    console.error('Error fetching platforms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platforms' },
      { status: 500 }
    )
  }
}
