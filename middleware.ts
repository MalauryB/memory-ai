import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export const config = {
  matcher: [
    // Inclure toutes les routes sauf les fichiers statiques et API
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
