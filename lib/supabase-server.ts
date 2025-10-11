import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            console.error('Error setting cookies:', error)
          }
        },
      },
    }
  )
}

// Version alternative pour les route handlers
export function createClientFromRequest(request: Request) {
  // Extraire les cookies de la requête
  const cookieHeader = request.headers.get('cookie') || ''

  console.log('Cookie header:', cookieHeader)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = cookieHeader
            .split(';')
            .map(cookie => cookie.trim())
            .filter(cookie => cookie.length > 0)
            .map(cookie => {
              const equalIndex = cookie.indexOf('=')
              if (equalIndex === -1) {
                return { name: cookie, value: '' }
              }
              const name = cookie.substring(0, equalIndex).trim()
              const value = cookie.substring(equalIndex + 1).trim()
              return { name, value }
            })

          console.log('Parsed cookies:', cookies.map(c => c.name))
          return cookies
        },
        setAll(cookiesToSet) {
          // Dans une route handler, on ne peut pas définir de cookies
          // Ils seront définis dans la réponse si nécessaire
        },
      },
    }
  )
}
