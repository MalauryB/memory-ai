/**
 * API Route: CSRF Token
 * GET /api/csrf-token
 *
 * Retourne un token CSRF pour les requêtes du client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCSRFToken } from '@/lib/csrf'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Rate limiting relaxé (c'est juste pour récupérer un token)
  const rateLimitResult = await rateLimit('relaxed')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  try {
    const token = await getCSRFToken()

    return NextResponse.json(
      { token },
      {
        headers: rateLimitResult.headers,
      }
    )
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}
