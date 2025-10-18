/**
 * Rate Limiting System
 *
 * Protège les API routes contre les abus et attaques DDoS.
 * Utilise une approche en mémoire pour le développement et peut être étendu avec Redis/Upstash pour la production.
 */

import { headers } from 'next/headers'
import { logger } from './logger'

// Types de limites par endpoint
export type RateLimitTier = 'strict' | 'moderate' | 'relaxed'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  message?: string
}

// Configuration des limites par tier
const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  strict: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 requêtes par minute
    message: 'Trop de requêtes. Veuillez réessayer dans une minute.',
  },
  moderate: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 requêtes par minute
    message: 'Trop de requêtes. Veuillez réessayer dans une minute.',
  },
  relaxed: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requêtes par minute
    message: 'Trop de requêtes. Veuillez ralentir.',
  },
}

// Store en mémoire pour le développement
// IMPORTANT: En production, utiliser Redis/Upstash pour le partage entre instances
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup automatique toutes les 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Obtenir l'identifiant unique de l'utilisateur pour le rate limiting
 */
async function getIdentifier(): Promise<string> {
  const headersList = await headers()

  // Essayer d'obtenir l'IP (fonctionne avec Vercel et la plupart des providers)
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

  // En production, on peut aussi ajouter l'user ID si authentifié
  // const userId = await getUserIdFromSession()
  // return userId ? `user:${userId}` : `ip:${ip}`

  return `ip:${ip}`
}

/**
 * Vérifie si la requête dépasse la limite
 */
export async function checkRateLimit(
  tier: RateLimitTier = 'moderate',
  customConfig?: Partial<RateLimitConfig>
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const config = { ...RATE_LIMIT_CONFIGS[tier], ...customConfig }
  const identifier = await getIdentifier()
  const key = `ratelimit:${tier}:${identifier}`
  const now = Date.now()

  // Récupérer ou créer l'entrée
  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // Créer nouvelle fenêtre
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(key, entry)

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: entry.resetTime,
    }
  }

  // Incrémenter le compteur
  entry.count++

  // Vérifier la limite
  if (entry.count > config.maxRequests) {
    logger.warn({
      identifier,
      tier,
      count: entry.count,
      limit: config.maxRequests
    }, 'Rate limit exceeded')

    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: entry.resetTime,
    }
  }

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: entry.resetTime,
  }
}

/**
 * Middleware pour protéger une API route
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await rateLimit('strict')
 *   if (!rateLimitResult.success) {
 *     return rateLimitResult.response
 *   }
 *
 *   // Votre logique ici
 * }
 * ```
 */
export async function rateLimit(tier: RateLimitTier = 'moderate') {
  const result = await checkRateLimit(tier)

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)

    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'rate_limit_exceeded',
          message: RATE_LIMIT_CONFIGS[tier].message,
          limit: result.limit,
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      ),
    }
  }

  return {
    success: true,
    headers: {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    },
  }
}

/**
 * Helper pour ajouter les headers de rate limit à une réponse
 */
export function addRateLimitHeaders(
  response: Response,
  headers: Record<string, string>
): Response {
  const newHeaders = new Headers(response.headers)

  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

/**
 * Configuration pour les endpoints spéciaux
 */
export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitTier> = {
  // Routes d'authentification - strict
  '/api/auth/signin': 'strict',
  '/api/auth/signup': 'strict',
  '/api/account/upgrade': 'strict',

  // Routes de génération IA - strict (coûteuses)
  '/api/generate-steps': 'strict',
  '/api/generate-substeps': 'strict',
  '/api/ai/chat': 'strict',

  // Routes de création - moderate
  '/api/projects': 'moderate',
  '/api/trackers': 'moderate',

  // Routes de lecture - relaxed
  '/api/agenda': 'relaxed',
}
