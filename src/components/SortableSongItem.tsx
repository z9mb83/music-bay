'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Play, Pause, X } from 'lucide-react'

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

interface SortableSongItemProps {
  song: Song
  index: number
  isPlaying: boolean
  onPlay: () => void
  onRemove: () => void
  isEditable: boolean
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SortableSongItem({
  song,
  index,
  isPlaying,
  onPlay,
  onRemove,
  isEditable
}: SortableSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: song.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 group ${
        isDragging ? 'shadow-xl' : ''
      }`}
    >
      {isEditable && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-gray-300"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      <span className="text-gray-500 w-6 text-center text-sm">{index + 1}</span>

      {song.thumbnail ? (
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-12 h-12 rounded object-cover"
        />
      ) : (
        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
          <Play className="w-5 h-5 text-gray-500" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="text-white font-medium truncate">{song.title}</h4>
        <p className="text-gray-400 text-sm truncate">{song.artist}</p>
      </div>

      <div className="flex items-center gap-2">
        {song.genre && (
          <span className="hidden sm:inline-block px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
            {song.genre}
          </span>
        )}
        {song.language && (
          <span className="hidden sm:inline-block px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
            {song.language}
          </span>
        )}

        <span className="text-gray-500 text-sm">{formatDuration(song.duration)}</span>

        <button
          onClick={onPlay}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-gray-400 hover:text-white" />
          )}
        </button>

        {isEditable && (
          <button
            onClick={onRemove}
            className="p-2 hover:bg-red-900/50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        )}
      </div>
    </div>
  )
}
