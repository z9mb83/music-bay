'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Save,
  X,
  Music2,
  RefreshCw
} from 'lucide-react'
import { SortableSongItem } from '@/components/SortableSongItem'

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
  songs: { song: Song; order: number }[]
}

export default function PlaylistPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const playlistId = params?.id as string

  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
    }
  }, [status])

  useEffect(() => {
    if (playlistId) {
      fetchPlaylist()
    }
  }, [playlistId])

  const fetchPlaylist = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}`)
      if (response.ok) {
        const data = await response.json()
        setPlaylist(data.playlist)
        setSongs(data.playlist.songs.map((s: { song: Song }) => s.song))
        setEditedName(data.playlist.name)
        setEditedDescription(data.playlist.description || '')
      }
    } catch (error) {
      console.error('Error fetching playlist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = songs.findIndex(s => s.id === active.id)
      const newIndex = songs.findIndex(s => s.id === over.id)

      const newSongs = arrayMove(songs, oldIndex, newIndex)
      setSongs(newSongs)

      // Save new order to backend
      const songOrders = newSongs.map((song, index) => ({
        songId: song.id,
        order: index
      }))

      try {
        await fetch(`/api/playlists/${playlistId}/songs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songOrders })
        })
      } catch (error) {
        console.error('Error saving order:', error)
      }
    }
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedName,
          description: editedDescription
        })
      })

      if (response.ok) {
        setPlaylist(prev => prev ? {
          ...prev,
          name: editedName,
          description: editedDescription
        } : null)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving playlist:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this playlist?')) return

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        redirect('/dashboard')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete playlist')
      }
    } catch (error) {
      console.error('Error deleting playlist:', error)
    }
  }

  const handleRemoveSong = async (songId: string) => {
    try {
      const response = await fetch(
        `/api/playlists/${playlistId}/songs?songId=${songId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setSongs(songs.filter(s => s.id !== songId))
      }
    } catch (error) {
      console.error('Error removing song:', error)
    }
  }

  const handlePlay = (songId: string) => {
    setPlayingSongId(playingSongId === songId ? null : songId)
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Music2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Playlist not found</p>
          <Link
            href="/dashboard"
            className="text-purple-400 hover:text-purple-300 mt-4 inline-block"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const isEditable = !playlist.isAuto

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>

            {isEditable && !isEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Playlist Info */}
        <div className="mb-8">
          {playlist.thumbnail && (
            <img
              src={playlist.thumbnail}
              alt={playlist.name}
              className="w-48 h-48 rounded-xl object-cover mb-6"
            />
          )}

          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-2xl font-bold"
              />
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-purple-500"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 rounded-lg text-white transition-colors"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedName(playlist.name)
                    setEditedDescription(playlist.description || '')
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{playlist.name}</h1>
                {playlist.isAuto && (
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-sm">
                    Auto-generated
                  </span>
                )}
              </div>
              {playlist.description && (
                <p className="text-gray-400 mb-4">{playlist.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{songs.length} songs</span>
                {playlist.genre && (
                  <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
                    {playlist.genre}
                  </span>
                )}
                {playlist.language && (
                  <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
                    {playlist.language}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Songs List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Songs</h2>
            {isEditable && (
              <p className="text-sm text-gray-500">
                Drag songs to reorder
              </p>
            )}
          </div>

          {songs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Music2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No songs in this playlist yet.</p>
              <Link
                href="/dashboard"
                className="text-purple-400 hover:text-purple-300 mt-2 inline-block"
              >
                Go to Dashboard to add songs
              </Link>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={songs.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {songs.map((song, index) => (
                    <SortableSongItem
                      key={song.id}
                      song={song}
                      index={index}
                      isPlaying={playingSongId === song.id}
                      onPlay={() => handlePlay(song.id)}
                      onRemove={() => handleRemoveSong(song.id)}
                      isEditable={isEditable}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </main>
    </div>
  )
}
