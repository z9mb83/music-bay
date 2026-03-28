import { UnifiedSong } from '@/types'

export class SongNormalizer {
  // Normalize song data from different platforms into unified format
  static normalize(songs: UnifiedSong[]): UnifiedSong[] {
    return songs.map(song => ({
      ...song,
      title: this.cleanText(song.title),
      artist: this.cleanText(song.artist),
      album: song.album ? this.cleanText(song.album) : undefined
    }))
  }

  // Clean and standardize text
  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/\s*-\s*/g, ' - ') // Standardize separators
      .replace(/\s*\(\s*/g, ' (') // Standardize parentheses
      .replace(/\s*\)\s*/g, ') ')
      .replace(/\s*\[\s*/g, ' [') // Standardize brackets
      .replace(/\s*\]\s*/g, '] ')
      .trim()
  }

  // Find duplicate songs using fuzzy matching
  static findDuplicates(songs: UnifiedSong[]): Map<string, UnifiedSong[]> {
    const duplicates = new Map<string, UnifiedSong[]>()
    const processed = new Set<number>()

    for (let i = 0; i < songs.length; i++) {
      if (processed.has(i)) continue

      const group: UnifiedSong[] = [songs[i]]
      processed.add(i)

      for (let j = i + 1; j < songs.length; j++) {
        if (processed.has(j)) continue

        if (this.isDuplicate(songs[i], songs[j])) {
          group.push(songs[j])
          processed.add(j)
        }
      }

      if (group.length > 1) {
        const key = `${songs[i].artist} - ${songs[i].title}`
        duplicates.set(key, group)
      }
    }

    return duplicates
  }

  // Check if two songs are duplicates
  private static isDuplicate(song1: UnifiedSong, song2: UnifiedSong): boolean {
    // Skip if same platform and same ID
    if (song1.platform === song2.platform && song1.platformId === song2.platformId) {
      return false
    }

    const title1 = this.normalizeForComparison(song1.title)
    const title2 = this.normalizeForComparison(song2.title)
    const artist1 = this.normalizeForComparison(song1.artist)
    const artist2 = this.normalizeForComparison(song2.artist)

    // Exact match
    if (title1 === title2 && artist1 === artist2) {
      return true
    }

    // Check title similarity (80% threshold)
    const titleSimilarity = this.calculateSimilarity(title1, title2)
    const artistSimilarity = this.calculateSimilarity(artist1, artist2)

    return titleSimilarity >= 0.8 && artistSimilarity >= 0.7
  }

  // Normalize text for comparison
  private static normalizeForComparison(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')
      .replace(/\bfeat\b|\bft\b|\bfeaturing\b/g, '') // Remove featuring indicators
      .replace(/\bremix\b|\bedit\b|\bversion\b|\bexplicit\b|\bclean\b/g, '') // Remove version indicators
      .trim()
  }

  // Calculate string similarity using Levenshtein distance
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0
    if (str1.length === 0 || str2.length === 0) return 0.0

    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    return 1 - distance / maxLength
  }

  // Levenshtein distance algorithm
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // Merge duplicate songs, preferring the one with more metadata
  static mergeDuplicates(duplicates: Map<string, UnifiedSong[]>): UnifiedSong[] {
    const merged: UnifiedSong[] = []

    for (const group of duplicates.values()) {
      // Sort by metadata completeness (more fields = better)
      const sorted = group.sort((a, b) => {
        const scoreA = this.calculateCompletenessScore(a)
        const scoreB = this.calculateCompletenessScore(b)
        return scoreB - scoreA
      })

      // Take the best one but keep references to all platform IDs
      const best = sorted[0]
      merged.push({
        ...best,
        // Could store alternate IDs in metadata if needed
      })
    }

    return merged
  }

  private static calculateCompletenessScore(song: UnifiedSong): number {
    let score = 0
    if (song.title) score += 1
    if (song.artist) score += 1
    if (song.album) score += 2
    if (song.duration) score += 1
    if (song.genre) score += 2
    if (song.language) score += 2
    if (song.thumbnail) score += 1
    return score
  }
}
