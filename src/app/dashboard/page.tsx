'use client'

import { useSession, signOut } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { 
  Music2, 
  LogOut, 
  RefreshCw, 
  Disc, 
  Mic2, 
  Globe,
  Library,
  Plus,
  Play,
  Pause,
  MoreHorizontal
} from 'lucide-react'

interface Song {
  id: string
  title: string
  artist: string
  album?: string
  duration?: number
  platform: string
  thumbnail?: string
  genre?: string
  language?: string
}

interface Playlist {
  id: string
  name: string
  description?: string
  type: string
  genre?: string
  language?: string
  isAuto: boolean
  thumbnail?: string
  songCount: number
}

interface PlatformStatus {
  platform: string
  connected: boolean
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [songs, setSongs] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([])
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('songs')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
    }
  }, [status])

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      const [songsRes, playlistsRes, platformsRes] = await Promise.all([
        fetch('/api/songs'),
        fetch('/api/playlists'),
        fetch('/api/platforms')
      ])

      if (songsRes.ok) {
        const songsData = await songsRes.json()
        setSongs(songsData.songs || [])
      }

      if (playlistsRes.ok) {
        const playlistsData = await playlistsRes.json()
        setPlaylists(playlistsData.playlists || [])
      }

      if (platformsRes.ok) {
        const platformsData = await platformsRes.json()
        setPlatforms(platformsData.platforms || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const importFromPlatform = async (platform: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      })

      if (response.ok) {
        await fetchDashboardData()
      }
    } catch (error) {
      console.error('Error importing songs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return
    
    setIsCreating(true)
    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDescription
        })
      })

      if (response.ok) {
        await fetchDashboardData()
        setIsCreateModalOpen(false)
        setNewPlaylistName('')
        setNewPlaylistDescription('')
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const filteredSongs = songs.filter(song => {
    if (selectedFilter === 'all') return true
    if (selectedFilter.startsWith('platform:')) {
      return song.platform === selectedFilter.replace('platform:', '')
    }
    if (selectedFilter.startsWith('genre:')) {
      return song.genre === selectedFilter.replace('genre:', '')
    }
    if (selectedFilter.startsWith('language:')) {
      return song.language === selectedFilter.replace('language:', '')
    }
    return true
  })

  const genres = [...new Set(songs.map(s => s.genre).filter(Boolean))]
  const languages = [...new Set(songs.map(s => s.language).filter(Boolean))]

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music2 className="w-8 h-8 text-purple-500" />
            <h1 className="text-xl font-bold text-white">Music Bay</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{session?.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Platform Connections */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {platforms.map((platform) => (
            <div
              key={platform.platform}
              className={`p-4 rounded-xl border ${
                platform.connected
                  ? 'bg-green-900/20 border-green-700'
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {platform.platform === 'spotify' && (
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <Music2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {platform.platform === 'youtube' && (
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {platform.platform === 'jiosaavn' && (
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <Mic2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white capitalize">
                      {platform.platform}
                    </p>
                    <p className="text-sm text-gray-400">
                      {platform.connected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => importFromPlatform(platform.platform)}
                  disabled={isLoading || !platform.connected}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    platform.connected
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Sync'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl">
            <p className="text-purple-200 text-sm">Total Songs</p>
            <p className="text-3xl font-bold text-white">{songs.length}</p>
          </div>
          <div className="bg-gradient-to-br from-pink-600 to-rose-700 p-6 rounded-xl">
            <p className="text-pink-200 text-sm">Playlists</p>
            <p className="text-3xl font-bold text-white">{playlists.length}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-600 to-amber-700 p-6 rounded-xl">
            <p className="text-orange-200 text-sm">Genres</p>
            <p className="text-3xl font-bold text-white">{genres.length}</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-6 rounded-xl">
            <p className="text-cyan-200 text-sm">Languages</p>
            <p className="text-3xl font-bold text-white">{languages.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('songs')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'songs'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Disc className="w-4 h-4 inline mr-2" />
            All Songs
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'playlists'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Library className="w-4 h-4 inline mr-2" />
            Playlists
          </button>
        </div>

        {/* Filters */}
        {activeTab === 'songs' && (
          <div className="mb-6">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Songs</option>
              <optgroup label="Platform">
                <option value="platform:spotify">Spotify</option>
                <option value="platform:youtube">YouTube</option>
                <option value="platform:jiosaavn">JioSaavn</option>
              </optgroup>
              {genres.length > 0 && (
                <optgroup label="Genre">
                  {genres.map(g => (
                    <option key={g} value={`genre:${g}`}>{g}</option>
                  ))}
                </optgroup>
              )}
              {languages.length > 0 && (
                <optgroup label="Language">
                  {languages.map(l => (
                    <option key={l} value={`language:${l}`}>{l}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {/* Content */}
        {activeTab === 'songs' ? (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">#</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Title</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Artist</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Genre</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Language</th>
                  <th className="text-left text-gray-400 font-medium py-3 px-4">Platform</th>
                  <th className="text-right text-gray-400 font-medium py-3 px-4">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredSongs.map((song, index) => (
                  <tr key={song.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {song.thumbnail && (
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <span className="text-white font-medium">{song.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{song.artist}</td>
                    <td className="py-3 px-4">
                      {song.genre && (
                        <span className="inline-block px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
                          {song.genre}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {song.language && (
                        <span className="inline-block px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                          {song.language}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-400 capitalize">{song.platform}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {formatDuration(song.duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSongs.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Music2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No songs found. Connect a platform and sync to get started.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="p-6 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl hover:border-purple-500 hover:bg-gray-750 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white"
            >
              <Plus className="w-8 h-8" />
              <span className="font-medium">Create New Playlist</span>
            </button>
            {playlists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/playlist/${playlist.id}`}
                className="p-6 bg-gray-800 rounded-xl hover:bg-gray-750 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  {playlist.thumbnail ? (
                    <img
                      src={playlist.thumbnail}
                      alt={playlist.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                      <Library className="w-8 h-8 text-white" />
                    </div>
                  )}
                  {playlist.isAuto && (
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
                      Auto
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-white mb-1">{playlist.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{playlist.description}</p>
                <p className="text-sm text-gray-500">{playlist.songCount} songs</p>
              </Link>
            ))}
          </div>
        )}

        {/* Create Playlist Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Create New Playlist</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="My Awesome Playlist"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                  <textarea
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    placeholder="A collection of my favorite songs..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleCreatePlaylist}
                    disabled={isCreating || !newPlaylistName.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 rounded-lg text-white font-medium transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setNewPlaylistName('')
                      setNewPlaylistDescription('')
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
