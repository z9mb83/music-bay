# Music Bay 🎵

A unified music dashboard that connects multiple music platforms (Spotify, YouTube, JioSaavn) and automatically organizes your playlists across platforms based on genres and languages using AI.

## ✨ Features

- **Multi-Platform Authentication**: Connect Spotify, YouTube, and JioSaavn accounts
- **Playlist Fetching**: Import playlists, liked songs, and recently played tracks
- **AI-Powered Organization**: Automatic genre and language detection
- **Smart Playlists**: Auto-generated playlists by genre and language
- **Deduplication**: Automatically removes duplicate songs across platforms
- **Unified Dashboard**: View all your music in one place with filtering

## 🛠 Tech Stack

- **Frontend**: React + Next.js + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Node.js
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js with OAuth 2.0 (Spotify, Google)
- **APIs**: Spotify Web API, YouTube Data API v3, JioSaavn API, Last.fm API

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OAuth credentials for Spotify and Google

### 1. Clone and Install

```bash
git clone https://github.com/z9mb83/music-bay.git
cd music-bay/music-bay-app
npm install
```

### 2. Environment Setup

Create `.env.local` file and fill in your credentials:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/musicbay?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth - Spotify
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"

# OAuth - Google (for YouTube)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# YouTube Data API
YOUTUBE_API_KEY="your-youtube-api-key"

# Optional - Last.fm for genre enrichment
LASTFM_API_KEY="your-lastfm-api-key"

# Optional - OpenAI for AI classification
OPENAI_API_KEY="your-openai-api-key"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

### 4. OAuth Configuration

#### Spotify
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Add `http://localhost:3000/api/auth/callback/spotify` to Redirect URIs
4. Copy Client ID and Client Secret

#### Google (YouTube)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Add `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs
5. Copy Client ID and Client Secret

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
music-bay-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/[...nextauth]/  # NextAuth configuration
│   │   │   ├── songs/         # Songs API
│   │   │   ├── playlists/     # Playlists API
│   │   │   └── platforms/     # Platform connections API
│   │   ├── dashboard/         # Dashboard page
│   │   ├── login/            # Login page
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── providers.tsx     # Session provider
│   ├── components/            # React components
│   ├── lib/                   # Library utilities
│   │   ├── prisma.ts         # Prisma client
│   │   ├── spotify.ts        # Spotify API client
│   │   ├── youtube.ts        # YouTube API client
│   │   └── jiosaavn.ts       # JioSaavn API client
│   ├── services/              # Business logic
│   │   ├── songNormalizer.ts  # Song normalization & deduplication
│   │   ├── genreDetector.ts   # Genre/language detection
│   │   └── playlistOrganizer.ts  # Auto-playlist creation
│   └── types/                 # TypeScript types
├── prisma/
│   └── schema.prisma         # Database schema
└── package.json
```

## 🧠 How It Works

1. **Authentication**: Users connect their Spotify and YouTube accounts via OAuth
2. **Data Import**: The app fetches playlists, liked songs, and recently played tracks
3. **Normalization**: Songs from all platforms are normalized to a unified schema
4. **Deduplication**: Duplicate songs across platforms are identified using fuzzy string matching
5. **Enrichment**: Genre and language are detected using:
   - Spotify's audio features API
   - Last.fm metadata
   - AI classification (optional)
6. **Organization**: Songs are automatically grouped into playlists by:
   - Genre (Pop, Rock, Hip-Hop, etc.)
   - Language (Hindi, English, Punjabi, etc.)

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Don't forget to add environment variables in Vercel Dashboard.

### Database (Railway/Supabase)

1. Create a PostgreSQL database on Railway or Supabase
2. Update `DATABASE_URL` in environment variables
3. Run migrations: `npx prisma migrate deploy`

## 📝 Roadmap

- [ ] Sync playlists back to platforms
- [ ] AI-powered music recommendations
- [ ] Mood-based playlists
- [ ] Offline mode
- [ ] Mobile app
- [ ] Collaborative playlists

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for music lovers everywhere.
