import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'user-read-email user-read-private user-library-read playlist-read-private user-read-recently-played'
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ account, profile }: { account: any; profile: any }) {
      return true
    },
    async jwt({ token, account, user }: { token: any; account: any; user: any }) {
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.provider = token.provider as string
      if (session.user) {
        session.user.id = token.userId as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
