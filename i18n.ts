import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, defaultLocale } from './i18n/request';

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the request
  let locale = await requestLocale;

  // Si la locale est undefined, utiliser la locale par défaut
  if (!locale) {
    locale = defaultLocale;
  }

  // Validate that the incoming locale parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  try {
    const messages = (await import(`./messages/${locale}.json`)).default;
    return {
      messages,
      locale
    };
  } catch (error) {
    console.error('[i18n] Error loading messages for locale:', locale, error);
    notFound();
  }
});
