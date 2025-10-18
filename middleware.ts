import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  // Activer la détection automatique de la langue via Accept-Language
  localeDetection: true
});

export default function middleware(request: NextRequest) {
  // Appliquer le middleware next-intl
  const response = intlMiddleware(request);

  // Ajouter les headers de sécurité
  const headers = new Headers(response.headers);

  // Content Security Policy
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://va.vercel-scripts.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  // Prévenir le clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // Prévenir le MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Forcer HTTPS
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Bloquer les anciens navigateurs vulnérables
  headers.set('X-XSS-Protection', '1; mode=block');

  // Contrôler les informations du referrer
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (anciennement Feature Policy)
  headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
    ].join(', ')
  );

  return NextResponse.next({
    request,
    headers,
  });
}

export const config = {
  matcher: [
    // Inclure toutes les routes sauf les fichiers statiques
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
