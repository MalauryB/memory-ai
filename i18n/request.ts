export const locales = ['fr', 'en', 'es', 'de', 'it', 'pt'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
