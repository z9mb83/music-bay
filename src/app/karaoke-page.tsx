'use client'

import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Mic2, Music, Search, LogIn, LogOut, Play, Pause } from 'lucide-react'
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

  const parseSongLink = async (url: string) => {
    setIsLoading(true)
    setError('')
    
    try {
      // Extract song info from URL
      let title = ''
      let artist = ''
      let source = ''
      
      if (url.includes('spotify.com')) {
        source = 'Spotify'
        title = 'Unknown Song'
        artist = 'Unknown Artist'
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        source = 'YouTube'
        title = 'Unknown Song'
        artist = 'Unknown Artist'
      } else if (url.includes('music.youtube.com')) {
        source = 'YouTube Music'
        title = 'Unknown Song'
        artist = 'Unknown Artist'
      } else {
        setError('Please enter a valid Spotify, YouTube, or YouTube Music link')
        setIsLoading(false)
        return
      }
      
      setSongInfo({ title, artist, source })
      
      // Fetch lyrics from API
      const response = await fetch(`/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`)
      const data = await response.json()
      
      if (data.lyrics) {
        const lines = data.lyrics.split('\n').filter((l: string) => l.trim())
        setLyrics(lines.map((text: string, i: number) => ({
          time: i * 3,
          text
        })))
      } else {
        // Mock lyrics for demo
        setLyrics([
          { time: 0, text: '🎵 Welcome to Karaoke Bay! 🎵' },
          { time: 3, text: 'Paste any song link above' },
          { time: 6, text: 'And sing along with lyrics' },
          { time: 9, text: 'Connect Spotify or YouTube' },
          { time: 12, text: 'For the full experience!' },
          { time: 15, text: '🎤 Sing your heart out! 🎤' },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header with Profile/Login */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Mic2 className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold text-white">Karaoke Bay</span>
          </div>
          
          {/* Profile / Login Button */}
          <div>
            {status === 'authenticated' ? (
              <div className="flex items-center gap-3">
                {session?.user?.image && (
                  <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full border-2 border-purple-500" />
                )}
                <Link 
                  href="/dashboard" 
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
                <button 
                  onClick={() => signOut()}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
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
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-24 h-24 mb-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-2xl shadow-purple-500/30">
                <Mic2 className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Karaoke Bay
              </h1>
              <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
                Paste any Spotify or YouTube Music link and sing along with lyrics. 
                <span className="text-purple-400"> No login required!</span>
              </p>
              
              {/* URL Input */}
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="text"
                      value={songUrl}
                      onChange={(e) => setSongUrl(e.target.value)}
                      placeholder="Paste Spotify or YouTube Music link..."
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
              <div className="flex items-center justify-center gap-6 mt-8">
                <span className="text-white/40 text-sm">Supports:</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Spotify</span>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">YouTube</span>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">YouTube Music</span>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 max-w-xl mx-auto">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Karaoke Screen */}
          {songInfo && (
            <div className="animate-fade-in">
              {/* Song Header */}
              <div className="flex items-center gap-4 mb-8 p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">{songInfo.title}</h2>
                  <p className="text-white/60">{songInfo.artist}</p>
                </div>
                <span className="px-3 py-1 bg-white/10 text-white/60 rounded-full text-xs uppercase">
                  {songInfo.source}
                </span>
                <button
                  onClick={() => {
                    setSongInfo(null)
                    setLyrics([])
                    setCurrentLine(0)
                  }}
                  className="px-4 py-2 text-white/60 hover:text-white text-sm transition-colors"
                >
                  New Song
                </button>
              </div>

              {/* Lyrics Display */}
              <div className="relative bg-black/60 rounded-3xl p-8 min-h-[50vh] flex flex-col items-center justify-center overflow-hidden border border-white/10">
                {/* Ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-pink-500/5" />
                
                {/* Lyrics */}
                <div className="relative z-10 text-center space-y-8 max-w-3xl w-full">
                  {lyrics.map((line, index) => {
                    const isActive = index === currentLine
                    const isPast = index < currentLine
                    
                    return (
                      <p
                        key={index}
                        onClick={() => setCurrentLine(index)}
                        className={`text-2xl md:text-4xl font-bold transition-all duration-500 cursor-pointer ${
                          isActive
                            ? 'text-white scale-110 drop-shadow-[0_0_40px_rgba(168,85,247,0.6)]'
                            : isPast
                            ? 'text-white/20 scale-95'
                            : 'text-white/30 scale-95'
                        }`}
                      >
                        {line.text}
                      </p>
                    )
                  })}
                </div>

                {/* Playback Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <button
                    onClick={() => setCurrentLine(Math.max(0, currentLine - 1))}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  >
                    <Play className="w-5 h-5 rotate-180" />
                  </button>
                  
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full text-white transition-all shadow-lg shadow-purple-600/40"
                  >
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                  </button>
                  
                  <button
                    onClick={() => setCurrentLine(Math.min(lyrics.length - 1, currentLine + 1))}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 flex items-center gap-4">
                <span className="text-white/40 text-sm font-medium">
                  {currentLine + 1} / {lyrics.length}
                </span>
                <input
                  type="range"
                  min={0}
                  max={lyrics.length - 1}
                  value={currentLine}
                  onChange={(e) => setCurrentLine(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Auto-play hint */}
              <p className="text-center text-white/40 text-sm mt-4">
                Click any line to jump to it • Use controls to navigate
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
