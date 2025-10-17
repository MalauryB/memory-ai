# 🌍 Guide d'Internationalisation (i18n)

Le système de traduction de Life Architect utilise **next-intl**, la solution officielle pour Next.js 15 avec App Router.

## 📋 Langues Supportées

- 🇫🇷 **Français** (fr) - Langue par défaut
- 🇬🇧 **Anglais** (en)
- 🇪🇸 **Espagnol** (es)
- 🇩🇪 **Allemand** (de)
- 🇮🇹 **Italien** (it)
- 🇵🇹 **Portugais** (pt)

**Note** : Actuellement, seuls FR et EN ont des fichiers de traduction complets (`messages/fr.json` et `messages/en.json`). Les autres langues sont configurées mais nécessitent la création de leurs fichiers de messages respectifs.

## 🏗️ Architecture

### Structure des Fichiers

```
/messages
  ├── fr.json    # Traductions françaises
  └── en.json    # Traductions anglaises

/app
  ├── layout.tsx # Layout racine (obligatoire dans Next.js 15)
  └── [locale]   # Toutes les pages sont sous ce segment dynamique
      ├── page.tsx
      ├── layout.tsx
      └── ...

/i18n
  └── request.ts # Configuration des locales supportées

i18n.ts          # Configuration i18n (getRequestConfig)
middleware.ts    # Middleware de routing i18n
next.config.mjs  # Plugin next-intl
```

### Configuration i18n pour Next.js 15

**Important** : Next.js 15 nécessite l'utilisation de `requestLocale` (au lieu de `locale`) dans `getRequestConfig` :

```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, defaultLocale } from './i18n/request';

export default getRequestConfig(async ({ requestLocale }) => {
  // ⚠️ IMPORTANT : Dans Next.js 15, requestLocale est une Promise
  let locale = await requestLocale;

  // Fallback vers la locale par défaut si undefined
  if (!locale) {
    locale = defaultLocale;
  }

  // Validation de la locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Chargement dynamique des messages
  const messages = (await import(`./messages/${locale}.json`)).default;

  return {
    messages,
    locale  // Retourner la locale pour next-intl
  };
});
```

### URLs Multilingues

L'application utilise des URLs avec préfixe de locale :
- Français : `https://example.com/fr/...`
- Anglais : `https://example.com/en/...`

Le middleware redirige automatiquement `/` vers `/fr` (langue par défaut).

## 🎨 Utilisation dans les Composants

### 1. Composant Client ("use client")

```typescript
"use client"

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('nav');  // Namespace = 'nav'

  return (
    <div>
      <h1>{t('myProjects')}</h1>
      <p>{t('subtitle', { count: 5 })}</p>  // Avec paramètres
    </div>
  );
}
```

### 2. Composant Serveur

```typescript
import { useTranslations } from 'next-intl';

export default function MyPage() {
  const t = useTranslations('projects');

  return <h1>{t('title')}</h1>;
}
```

### 3. Pluralisation

Dans les fichiers JSON :

```json
{
  "projects": {
    "subtitle": "{count, plural, =0 {Aucun projet} =1 {1 projet} other {# projets}}"
  }
}
```

Usage :

```typescript
t('projects.subtitle', { count: 0 })  // "Aucun projet"
t('projects.subtitle', { count: 1 })  // "1 projet"
t('projects.subtitle', { count: 5 })  // "5 projets"
```

## 📝 Fichiers de Traduction

### Structure Recommandée

Organisez vos traductions par domaine :

```json
{
  "common": {
    "save": "Enregistrer",
    "cancel": "Annuler",
    ...
  },
  "nav": {
    "myProjects": "Mes projets",
    ...
  },
  "projects": {
    "title": "Mes projets",
    ...
  }
}
```

### Accès aux Traductions

```typescript
const tCommon = useTranslations('common');
const tProjects = useTranslations('projects');

console.log(tCommon('save'));        // "Enregistrer"
console.log(tProjects('title'));     // "Mes projets"
```

## 🔧 Sélecteur de Langue

Le composant `<LanguageSwitcher />` est déjà intégré dans le header :

```typescript
import { LanguageSwitcher } from '@/components/language-switcher';

// Dans votre layout/composant
<LanguageSwitcher />
```

Le sélecteur :
- Affiche les drapeaux 🇫🇷 🇬🇧
- Change l'URL en gardant la même page
- Recharge le contenu avec la nouvelle langue

## 🚀 Ajouter une Nouvelle Langue

1. **Ajouter la locale dans `i18n.ts`** :

```typescript
export const locales = ['fr', 'en', 'es'] as const;  // Ajout de l'espagnol
```

2. **Créer le fichier de traduction** :

```bash
cp messages/en.json messages/es.json
# Puis traduire le contenu
```

3. **Ajouter dans `LanguageSwitcher`** :

```typescript
const languageNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',  // Ajout
};

const languageFlags: Record<Locale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',  // Ajout
};
```

## 📖 Exemples Pratiques

### Traduction Simple

```typescript
const t = useTranslations('common');
<button>{t('save')}</button>
```

### Traduction avec Variables

JSON :
```json
{
  "welcome": "Bienvenue, {name} !"
}
```

Code :
```typescript
t('welcome', { name: 'Marie' })  // "Bienvenue, Marie !"
```

### Traduction avec Pluriel

JSON :
```json
{
  "tasks": "{count, plural, =0 {Aucune tâche} =1 {1 tâche} other {# tâches}}"
}
```

Code :
```typescript
t('tasks', { count: 0 })   // "Aucune tâche"
t('tasks', { count: 1 })   // "1 tâche"
t('tasks', { count: 10 })  // "10 tâches"
```

### Navigation Multilingue

Dans les liens :

```typescript
import { useParams } from 'next/navigation';

const params = useParams();
const locale = params.locale;

<Link href={`/${locale}/projects`}>
  {t('nav.myProjects')}
</Link>
```

Ou avec le helper :

```typescript
import { Link } from '@/navigation';  // Si vous configurez createSharedPathnamesNavigation

<Link href="/projects">
  {t('nav.myProjects')}
</Link>
```

## 🐛 Dépannage

### Erreur : "Messages not found"

Vérifiez que :
1. Le fichier `messages/{locale}.json` existe
2. Le namespace utilisé existe dans le JSON
3. La clé de traduction existe

### Erreur : "useTranslations can only be used in Client Components"

Solution :
- Ajoutez `"use client"` en haut du fichier
- OU utilisez `getTranslations` pour les composants serveur

### Les traductions ne se mettent pas à jour

1. Redémarrez le serveur de dev
2. Vérifiez que le JSON est valide
3. Nettoyez le cache : `npm run clean`

## 📚 Ressources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [ICU Message Format](https://formatjs.io/docs/core-concepts/icu-syntax/)
- [Pluralization Rules](https://unicode-org.github.io/cldr-staging/charts/37/supplemental/language_plural_rules.html)

## ✅ Bonnes Pratiques

1. **Organisez par domaine** : Créez des namespaces logiques (common, nav, projects, etc.)
2. **Évitez la duplication** : Réutilisez les traductions communes
3. **Utilisez des clés descriptives** : `createProject` plutôt que `btn1`
4. **Testez dans toutes les langues** : Changez la langue régulièrement pendant le dev
5. **Documentez les paramètres** : Commentez les traductions avec variables

## 🎯 État Actuel

### ✅ Traduit
- Navigation principale
- Messages communs

### 🔄 À traduire
- Components de trackers
- Page d'authentification
- Formulaires
- Messages d'erreur
- Tooltips

Pour contribuer, éditez les fichiers `messages/fr.json` et `messages/en.json` !
