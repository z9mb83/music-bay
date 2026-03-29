import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    
    let songInfo = {
      title: 'Unknown Song',
      artist: 'Unknown Artist',
      source: 'Unknown'
    }
    
    // Parse Spotify URL
    if (url.includes('spotify.com') || url.includes('open.spotify.com')) {
      const trackMatch = url.match(/track[/:]([a-zA-Z0-9]+)/)
      if (trackMatch) {
        songInfo = {
          title: 'Spotify Track',
          artist: 'Spotify Artist',
          source: 'Spotify'
        }
      }
    }
    // Parse YouTube URL
    else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:v=|\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
      if (videoId) {
        songInfo = {
          title: 'YouTube Video',
          artist: 'YouTube Channel',
          source: 'YouTube'
        }
      }
    }
    // Parse YouTube Music URL
    else if (url.includes('music.youtube.com')) {
      songInfo = {
        title: 'YouTube Music Track',
        artist: 'YouTube Music Artist',
        source: 'YouTube Music'
      }
    }
    else {
      return NextResponse.json({ 
        error: 'Unsupported URL. Please use Spotify, YouTube, or YouTube Music links.' 
      }, { status: 400 })
    }
    
    // Fetch lyrics from lyrics.ovh API (free, no API key needed)
    let lyrics: string[] = []
    
    try {
      const lyricsRes = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(songInfo.artist)}/${encodeURIComponent(songInfo.title)}`
      )
      
      if (lyricsRes.ok) {
        const lyricsData = await lyricsRes.json()
        if (lyricsData.lyrics) {
          lyrics = lyricsData.lyrics.split('\n').filter((line: string) => line.trim())
        }
      }
    } catch (err) {
      console.log('Lyrics fetch failed, using demo lyrics')
    }
    
    // If no lyrics found, use demo lyrics based on song type
    if (lyrics.length === 0) {
      lyrics = [
        '🎵 Welcome to Karaoke Bay! 🎵',
        '',
        `Now playing: ${songInfo.title}`,
        `By: ${songInfo.artist}`,
        '',
        '🎤 Sing along with the music! 🎤',
        '',
        'Click the play button to start',
        'Navigate with the arrows',
        'Or click any line to jump to it',
        '',
        '🎶 Enjoy your karaoke session! 🎶',
        '',
        '(Demo lyrics - real lyrics coming soon)',
      ]
    }
    
    // Convert to timed lyrics (3 seconds per line)
    const timedLyrics = lyrics.map((text, index) => ({
      time: index * 3,
      text
    }))
    
    return NextResponse.json({
      songInfo,
      lyrics: timedLyrics
    })
    
  } catch (error) {
    console.error('Karaoke API error:', error)
    return NextResponse.json({ 
      error: 'Failed to process song URL' 
    }, { status: 500 })
  }
}
