"use client"

import { useParams, usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { locales, type Locale } from '@/i18n/request';

const languageNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
};

const languageFlags: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
};

const languageCodes: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
  de: 'DE',
  it: 'IT',
  pt: 'PT',
};

export function LanguageSwitcher() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentLocale = (params.locale as Locale) || 'fr';

  const switchLocale = async (newLocale: Locale) => {
    try {
      // Sauvegarder la préférence en base de données
      await fetch('/api/profile/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
    } catch (error) {
      console.error('Failed to save locale preference:', error);
      // Continue anyway avec le changement de locale
    }

    // Remplacer la locale dans le pathname
    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPathname = segments.join('/');

    router.push(newPathname);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => switchLocale(locale)}
            className="cursor-pointer"
          >
            <span className="mr-2">{languageFlags[locale]}</span>
            <span className={currentLocale === locale ? 'font-bold' : ''}>
              {languageNames[locale]}
            </span>
            {currentLocale === locale && (
              <span className="ml-auto text-xs opacity-50">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
