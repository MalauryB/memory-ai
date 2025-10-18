/**
 * CSRF Protection
 *
 * Protection contre les attaques Cross-Site Request Forgery.
 * Utilise des tokens uniques pour chaque session utilisateur.
 */

import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { logger } from './logger'

const CSRF_TOKEN_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32

/**
 * Génère un token CSRF sécurisé
 */
function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('base64url')
}

/**
 * Récupère ou crée un token CSRF pour l'utilisateur
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies()
  let token = cookieStore.get(CSRF_TOKEN_NAME)?.value

  if (!token) {
    token = generateToken()
    // Token valide pour 24h
    cookieStore.set(CSRF_TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 heures
      path: '/',
    })
  }

  return token
}

/**
 * Vérifie que le token CSRF est valide
 */
export async function verifyCSRFToken(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const storedToken = cookieStore.get(CSRF_TOKEN_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!storedToken || !headerToken) {
    logger.warn(
      {
        hasStoredToken: !!storedToken,
        hasHeaderToken: !!headerToken,
        url: request.url,
      },
      'CSRF token missing'
    )
    return false
  }

  // Comparaison temporelle constante pour éviter les timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(storedToken, 'base64url'),
    Buffer.from(headerToken, 'base64url')
  )

  if (!isValid) {
    logger.warn(
      {
        url: request.url,
        method: request.method,
      },
      'CSRF token mismatch'
    )
  }

  return isValid
}

/**
 * Middleware de vérification CSRF pour les routes protégées
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const csrfCheck = await checkCSRF(request)
 *   if (!csrfCheck.valid) {
 *     return csrfCheck.response
 *   }
 *
 *   // Votre logique ici
 * }
 * ```
 */
export async function checkCSRF(request: NextRequest) {
  // Skip CSRF pour les méthodes GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true }
  }

  const isValid = await verifyCSRFToken(request)

  if (!isValid) {
    return {
      valid: false,
      response: new Response(
        JSON.stringify({
          error: 'csrf_token_invalid',
          message: 'Token CSRF invalide ou manquant',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    }
  }

  return { valid: true }
}

/**
 * Hook pour récupérer le token CSRF côté client
 * À utiliser dans les composants React pour inclure le token dans les requêtes
 */
export async function getClientCSRFToken(): Promise<string> {
  // Récupérer le token depuis l'API
  const response = await fetch('/api/csrf-token')
  const data = await response.json()
  return data.token
}

/**
 * Helper pour ajouter le token CSRF aux headers de fetch
 *
 * @example
 * ```typescript
 * const headers = await withCSRFToken({
 *   'Content-Type': 'application/json'
 * })
 *
 * fetch('/api/projects', {
 *   method: 'POST',
 *   headers,
 *   body: JSON.stringify(data)
 * })
 * ```
 */
export async function withCSRFToken(
  headers: HeadersInit = {}
): Promise<HeadersInit> {
  const token = await getClientCSRFToken()

  return {
    ...headers,
    [CSRF_HEADER_NAME]: token,
  }
}
