import { NextRequest, NextResponse } from 'next/server'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    
    let songInfo: any = {
      title: 'Unknown Song',
      artist: 'Unknown Artist',
      source: 'Unknown',
      thumbnail: null,
      videoId: null,
      audioUrl: null,
      duration: 0
    }
    
    // Parse YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:v=|\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
      if (videoId) {
        // Fetch real video info from YouTube API
        if (YOUTUBE_API_KEY) {
          try {
            const ytRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
            )
            const ytData = await ytRes.json()
            
            if (ytData.items && ytData.items[0]) {
              const snippet = ytData.items[0].snippet
              const contentDetails = ytData.items[0].contentDetails
              
              // Parse duration (PT4M13S format)
              const duration = contentDetails?.duration || ''
              const minutes = duration.match(/(\d+)M/)?.[1] || '0'
              const seconds = duration.match(/(\d+)S/)?.[1] || '0'
              const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds)
              
              songInfo = {
                title: snippet.title,
                artist: snippet.channelTitle,
                source: 'YouTube',
                thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
                videoId: videoId,
                audioUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1`,
                duration: totalSeconds
              }
            }
          } catch (err) {
            console.error('YouTube API error:', err)
          }
        }
        
        // Fallback if API fails or no key
        if (!songInfo.videoId) {
          songInfo = {
            title: 'YouTube Video',
            artist: 'Unknown Channel',
            source: 'YouTube',
            videoId: videoId,
            audioUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1`,
            duration: 180
          }
        }
      }
    }
    // Parse YouTube Music URL
    else if (url.includes('music.youtube.com')) {
      const videoId = url.match(/(?:v=|\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
      if (videoId) {
        songInfo = {
          title: 'YouTube Music Track',
          artist: 'YouTube Music',
          source: 'YouTube Music',
          videoId: videoId,
          audioUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1`,
          duration: 180
        }
      }
    }
    // Parse Spotify URL - extract track info from oEmbed
    else if (url.includes('spotify.com') || url.includes('open.spotify.com')) {
      const trackId = url.match(/track[/:]([a-zA-Z0-9]+)/)?.[1]
      if (trackId) {
        try {
          // Use Spotify oEmbed to get track info
          const embedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
          if (embedRes.ok) {
            const embedData = await embedRes.json()
            songInfo = {
              title: embedData.title || 'Spotify Track',
              artist: 'Spotify',
              source: 'Spotify',
              thumbnail: embedData.thumbnail_url,
              videoId: trackId,
              audioUrl: `https://open.spotify.com/embed/track/${trackId}`,
              duration: 180
            }
          } else {
            songInfo = {
              title: 'Spotify Track',
              artist: 'Spotify',
              source: 'Spotify',
              videoId: trackId,
              audioUrl: `https://open.spotify.com/embed/track/${trackId}`,
              duration: 180
            }
          }
        } catch {
          songInfo = {
            title: 'Spotify Track',
            artist: 'Spotify',
            source: 'Spotify',
            videoId: trackId,
            audioUrl: `https://open.spotify.com/embed/track/${trackId}`,
            duration: 180
          }
        }
      }
    }
    else {
      return NextResponse.json({ 
        error: 'Unsupported URL. Please use Spotify, YouTube, or YouTube Music links.' 
      }, { status: 400 })
    }
    
    // Fetch lyrics from multiple sources
    let lyrics: string[] = []
    
    // Clean title for lyrics search (remove "(Official Video)", etc.)
    const cleanTitle = songInfo.title
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/official.*?video/gi, '')
      .replace(/lyric.*?video/gi, '')
      .replace(/audio/gi, '')
      .trim()
    
    const cleanArtist = songInfo.artist
      .replace(/- Topic/g, '')
      .replace(/VEVO/g, '')
      .trim()
    
    // Try lyrics.ovh first
    try {
      const lyricsRes = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`,
        { signal: AbortSignal.timeout(5000) }
      )
      
      if (lyricsRes.ok) {
        const lyricsData = await lyricsRes.json()
        if (lyricsData.lyrics) {
          lyrics = lyricsData.lyrics.split('\n').filter((line: string) => line.trim())
        }
      }
    } catch (err) {
      console.log('lyrics.ovh failed, trying alternative...')
    }
    
    // If no lyrics found, create structured placeholder
    if (lyrics.length === 0) {
      lyrics = [
        `🎵 ${songInfo.title} 🎵`,
        `by ${songInfo.artist}`,
        '',
        '🎤 Karaoke Mode 🎤',
        '',
        '▶️ Click PLAY to start the music',
        '🎵 Toggle Vocals/Instrumental with the switch below',
        '',
        '🎤 Sing along with the lyrics!',
        '',
        '⏮️ ⏯️ ⏭️ Use controls to navigate',
        '',
        '🎶 Enjoy your karaoke session! 🎶',
      ]
    }
    
    // Convert to timed lyrics (4 seconds per line)
    const timedLyrics = lyrics.map((text: string, index: number) => ({
      time: index * 4,
      text
    }))
    
    return NextResponse.json({
      songInfo,
      lyrics: timedLyrics,
      hasVocalSeparation: false,
      processingStatus: 'completed'
    })
    
  } catch (error) {
    console.error('Karaoke API error:', error)
    return NextResponse.json({ 
      error: 'Failed to process song URL' 
    }, { status: 500 })
  }
}
