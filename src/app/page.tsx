'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Mic2, Music, Search, LogIn, LogOut, Play, Pause, User, Disc, Volume2, VolumeX, Mic, Radio } from 'lucide-react'
import Link from 'next/link'

interface LyricLine {
  time: number
  text: string
}

interface SongInfo {
  title: string
  artist: string
  thumbnail?: string
  source: string
  videoId?: string
  audioUrl?: string
  duration?: number
}

export default function KaraokePage() {
  const { data: session, status } = useSession()
  const [songUrl, setSongUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [currentLine, setCurrentLine] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')
  const [isVocalsOnly, setIsVocalsOnly] = useState(false)
  const [volume, setVolume] = useState(80)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  // Auto-advance lyrics based on playback time
  useEffect(() => {
    if (isPlaying && lyrics.length > 0 && duration > 0) {
      progressInterval.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1
          // Calculate which lyric line should be active based on time
          const lineDuration = duration / lyrics.length
          const newLine = Math.floor(newTime / lineDuration)
          if (newLine !== currentLine && newLine < lyrics.length) {
            setCurrentLine(newLine)
          }
          if (newTime >= duration) {
            setIsPlaying(false)
            return 0
          }
          return newTime
        })
      }, 100)
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
  }, [isPlaying, lyrics.length, duration, currentLine])

  const parseSongLink = async (url: string) => {
    setIsLoading(true)
    setError('')
    setCurrentTime(0)
    setCurrentLine(0)
    setIsPlaying(false)
    
    try {
      const response = await fetch('/api/karaoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to load song')
        setIsLoading(false)
        return
      }
      
      setSongInfo(data.songInfo)
      setDuration(data.songInfo.duration || 180)
      
      if (data.lyrics && data.lyrics.length > 0) {
        setLyrics(data.lyrics)
      } else {
        setLyrics([
          { time: 0, text: '🎵 Welcome to Karaoke Bay! 🎵' },
          { time: 4, text: 'Paste any song link above' },
          { time: 8, text: 'And sing along with lyrics' },
          { time: 12, text: 'Toggle Vocals/Instrumental below' },
          { time: 16, text: '🎤 Sing your heart out! 🎤' },
        ])
      }
    } catch (err) {
      setError('Failed to load song. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (songUrl.trim()) {
      parseSongLink(songUrl)
    }
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    // Post message to YouTube iframe
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const action = isPlaying ? 'pauseVideo' : 'playVideo'
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: action, args: [] }),
        '*'
      )
    }
  }

  const seekTo = (time: number) => {
    setCurrentTime(time)
    const lineDuration = duration / lyrics.length
    setCurrentLine(Math.floor(time / lineDuration))
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [time, true] }),
        '*'
      )
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header with Profile/Login - Top Left */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo - Top Left */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Mic2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">Karaoke Bay</span>
              <p className="text-xs text-white/50">Sing. Share. Enjoy.</p>
            </div>
          </div>
          
          {/* Profile / Login Button - Top Right */}
          <div className="flex items-center gap-3">
            {status === 'authenticated' ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                >
                  <Disc className="w-4 h-4" />
                  <span>My Music</span>
                </Link>
                <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full border-2 border-purple-500" />
                  ) : (
                    <div className="w-8 h-8 bg-purple-500/30 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <button 
                    onClick={() => signOut()}
                    className="p-2 text-white/60 hover:text-white transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={() => signIn()}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero / Input Section */}
          {!songInfo && (
            <div className="text-center py-16 md:py-24">
              <div className="inline-flex items-center justify-center w-28 h-28 mb-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full shadow-2xl shadow-purple-500/30 animate-pulse">
                <Mic2 className="w-14 h-14 text-white" />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  Sing Your Heart Out
                </span>
              </h1>
              <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
                Paste any <span className="text-green-400 font-medium">Spotify</span>, <span className="text-red-400 font-medium">YouTube</span>, or <span className="text-red-400 font-medium">YouTube Music</span> link and get instant karaoke lyrics.
              </p>
              
              {/* URL Input */}
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                <div className="flex gap-3">
                  <div className="flex-1 relative group">
                    <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                    <input
                      type="text"
                      value={songUrl}
                      onChange={(e) => setSongUrl(e.target.value)}
                      placeholder="Paste song link from Spotify, YouTube, or YouTube Music..."
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 backdrop-blur-sm transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !songUrl.trim()}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    <span>Sing!</span>
                  </button>
                </div>
              </form>

              {/* Supported Platforms */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <span className="text-white/40 text-sm">Supports:</span>
                <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">Spotify</span>
                <span className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-sm font-medium border border-red-500/30">YouTube</span>
                <span className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium border border-orange-500/30">YouTube Music</span>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 max-w-xl mx-auto">
                  {error}
                </div>
              )}

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-3xl mx-auto">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <Music className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-white/80 text-sm">Any Song Link</p>
                  <p className="text-white/40 text-xs mt-1">Spotify, YouTube, YT Music</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <Mic2 className="w-5 h-5 text-pink-400" />
                  </div>
                  <p className="text-white/80 text-sm">Karaoke Mode</p>
                  <p className="text-white/40 text-xs mt-1">Synced lyrics display</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <User className="w-5 h-5 text-orange-400" />
                  </div>
                  <p className="text-white/80 text-sm">No Account Needed</p>
                  <p className="text-white/40 text-xs mt-1">Sign in for extra features</p>
                </div>
              </div>
            </div>
          )}

          {/* Karaoke Screen */}
          {songInfo && (
            <div className="animate-fade-in">
              {/* Song Header */}
              <div className="flex items-center gap-4 mb-4 p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                {songInfo.thumbnail ? (
                  <img 
                    src={songInfo.thumbnail} 
                    alt={songInfo.title}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Music className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{songInfo.title}</h2>
                  <p className="text-white/60 truncate">{songInfo.artist}</p>
                </div>
                <span className="px-3 py-1 bg-white/10 text-white/60 rounded-full text-xs uppercase flex-shrink-0">
                  {songInfo.source}
                </span>
                <button
                  onClick={() => {
                    setSongInfo(null)
                    setLyrics([])
                    setCurrentLine(0)
                    setIsPlaying(false)
                    setCurrentTime(0)
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white text-sm transition-colors flex-shrink-0"
                >
                  New Song
                </button>
              </div>

              {/* YouTube Player - Hidden but functional */}
              {songInfo.videoId && (
                <div className="mb-4 rounded-xl overflow-hidden bg-black">
                  <iframe
                    ref={iframeRef}
                    width="100%"
                    height="200"
                    src={`https://www.youtube.com/embed/${songInfo.videoId}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="rounded-xl"
                  />
                </div>
              )}

              {/* Audio Controls */}
              <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                {/* Time Display */}
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-sm font-medium">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={(e) => seekTo(parseInt(e.target.value))}
                    className="w-32 md:w-48 h-2 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-white/60 text-sm font-medium">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Vocals/Instrumental Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm hidden sm:block">
                    {isVocalsOnly ? 'Vocals Only' : 'With Music'}
                  </span>
                  <button
                    onClick={() => setIsVocalsOnly(!isVocalsOnly)}
                    className={`p-2 rounded-lg transition-colors ${
                      isVocalsOnly 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                    title="Toggle Vocals/Instrumental"
                  >
                    {isVocalsOnly ? <Mic className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
                  </button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setVolume(volume === 0 ? 80 : 0)}
                    className="text-white/60 hover:text-white"
                  >
                    {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hidden sm:block"
                  />
                </div>
              </div>

              {/* Lyrics Display - Karaoke Style */}
              <div className="relative bg-gradient-to-b from-black/80 to-black/60 rounded-3xl p-6 md:p-10 min-h-[45vh] flex flex-col items-center justify-center overflow-hidden border border-white/10 shadow-2xl">
                {/* Ambient glow effects */}
                <div className="absolute top-0 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
                
                {/* Lyrics */}
                <div className="relative z-10 text-center space-y-6 md:space-y-8 max-w-3xl w-full overflow-y-auto max-h-[35vh] scrollbar-hide">
                  {lyrics.map((line, index) => {
                    const isActive = index === currentLine
                    const isPast = index < currentLine
                    
                    return (
                      <p
                        key={index}
                        onClick={() => {
                          const lineDuration = duration / lyrics.length
                          seekTo(index * lineDuration)
                        }}
                        className={`text-xl md:text-3xl lg:text-4xl font-bold transition-all duration-500 cursor-pointer px-4 py-2 rounded-lg ${
                          isActive
                            ? 'text-white scale-105 drop-shadow-[0_0_30px_rgba(168,85,247,0.8)] bg-white/5'
                            : isPast
                            ? 'text-white/20 scale-95'
                            : 'text-white/30 scale-95 hover:text-white/50'
                        }`}
                      >
                        {line.text}
                      </p>
                    )
                  })}
                </div>

                {/* Playback Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
                  <button
                    onClick={() => {
                      const lineDuration = duration / lyrics.length
                      seekTo(Math.max(0, (currentLine - 1) * lineDuration))
                    }}
                    className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                  >
                    <Play className="w-5 h-5 rotate-180" />
                  </button>
                  
                  <button
                    onClick={togglePlay}
                    className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full text-white transition-all shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  
                  <button
                    onClick={() => {
                      const lineDuration = duration / lyrics.length
                      seekTo(Math.min(duration, (currentLine + 1) * lineDuration))
                    }}
                    className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Line Progress */}
              <div className="mt-4 flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-white/60 text-sm font-medium">
                  Line {currentLine + 1} of {lyrics.length}
                </span>
                <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${((currentLine + 1) / lyrics.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Tips */}
              <p className="text-center text-white/40 text-sm mt-4 flex items-center justify-center gap-2">
                <span>💡</span> Click any lyric to jump • Use controls to navigate • Toggle vocals/instrumental above
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

