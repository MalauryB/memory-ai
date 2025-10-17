# 🌍 Configuration de la Préférence de Langue

Ce document explique comment configurer le système de détection automatique et de préférence utilisateur pour la langue.

## 📋 Fonctionnalités

### 1. **Détection Automatique** 🎯
- Détecte automatiquement la langue du navigateur via l'en-tête `Accept-Language`
- Redirige vers la langue détectée lors de la première visite
- Fonctionne immédiatement sans configuration

### 2. **Préférence Utilisateur** 💾
- Sauvegarde le choix de langue dans le profil utilisateur
- Persiste entre les sessions
- Prioritaire sur la détection automatique

## 🚀 Installation

### Étape 1 : Appliquer la migration SQL

Vous devez ajouter le champ `preferred_locale` à votre table `user_profiles` dans Supabase.

**Option A - Via le tableau de bord Supabase (RECOMMANDÉ)**

1. Allez sur : https://app.supabase.com/project/YOUR_PROJECT/sql
2. Cliquez sur "New Query"
3. Copiez-collez le contenu de : `supabase/migrations/004_add_preferred_locale.sql`
4. Cliquez sur "Run"

**Option B - Via Supabase CLI**

```bash
# Si vous avez la CLI Supabase installée
supabase db push
```

**Option C - Manuellement via SQL**

```sql
-- Ajouter la colonne
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS preferred_locale VARCHAR(5) DEFAULT NULL;

-- Ajouter un commentaire
COMMENT ON COLUMN user_profiles.preferred_locale IS 'Langue préférée de l''utilisateur (fr, en, es, de, it, pt). NULL = détection automatique';

-- Créer un index
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_locale ON user_profiles(preferred_locale);
```

### Étape 2 : Redémarrer l'application

```bash
npm run clean
npm run dev
```

## 📖 Comment ça fonctionne ?

### Flux de détection de langue

```
1. Utilisateur visite le site (/)
   ↓
2. Le middleware vérifie s'il y a une préférence sauvegardée
   ↓
3. Si OUI → Redirige vers la langue préférée (/fr, /en, etc.)
   Si NON → Détecte la langue du navigateur
   ↓
4. Redirige vers la langue appropriée
```

### Priorité de sélection

1. **Cookie NEXT_LOCALE** (si défini par le changement manuel)
2. **Préférence utilisateur** (si sauvegardée dans la DB)
3. **Accept-Language** (détection automatique du navigateur)
4. **Locale par défaut** (français)

## 🎨 Utilisation

### Pour l'utilisateur final

1. **Détection automatique** :
   - Visitez simplement `http://localhost:3000/`
   - Vous serez redirigé vers votre langue (ex: `/fr`, `/en`)

2. **Changement manuel** :
   - Cliquez sur l'icône globe 🌐 dans le header
   - Sélectionnez votre langue
   - ✅ Le choix sera sauvegardé automatiquement !

### Pour le développeur

**Récupérer la préférence de langue :**

```typescript
// GET /api/profile/locale
const response = await fetch('/api/profile/locale');
const { preferred_locale } = await response.json();
// Retourne: "fr" | "en" | "es" | "de" | "it" | "pt" | null
```

**Sauvegarder la préférence :**

```typescript
// POST /api/profile/locale
await fetch('/api/profile/locale', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ locale: 'en' }), // ou null pour détection auto
});
```

**Réinitialiser la préférence (revenir à la détection auto) :**

```typescript
await fetch('/api/profile/locale', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ locale: null }),
});
```

## 🔧 Configuration avancée

### Modifier les langues supportées

Éditez le fichier `i18n/request.ts` :

```typescript
export const locales = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja'] as const; // Ajouter 'ja' pour japonais
```

N'oubliez pas de :
1. Créer le fichier de traduction : `messages/ja.json`
2. Mettre à jour l'API : `app/api/profile/locale/route.ts` (ligne 49)
3. Mettre à jour le `LanguageSwitcher` avec le drapeau et nom

### Désactiver la détection automatique

Si vous préférez toujours utiliser la langue par défaut :

Éditez `middleware.ts` :

```typescript
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false  // ← Désactiver
});
```

## 🐛 Dépannage

### La langue ne change pas

1. Vérifiez que la migration a été appliquée :
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name='user_profiles' AND column_name='preferred_locale';
   ```

2. Vérifiez les logs du navigateur (Console F12)

3. Nettoyez le cache :
   ```bash
   npm run clean
   ```

### La préférence n'est pas sauvegardée

1. Vérifiez que l'utilisateur est connecté
2. Vérifiez les permissions RLS de la table `user_profiles` dans Supabase
3. Testez l'API directement :
   ```bash
   curl -X POST http://localhost:3000/api/profile/locale \
     -H "Content-Type: application/json" \
     -d '{"locale":"en"}'
   ```

## ✅ Checklist de vérification

- [ ] Migration SQL appliquée dans Supabase
- [ ] Colonne `preferred_locale` visible dans la table `user_profiles`
- [ ] Le serveur a été redémarré
- [ ] Le cache a été nettoyé
- [ ] L'icône globe 🌐 est visible dans le header
- [ ] Le changement de langue fonctionne
- [ ] La préférence persiste après rechargement

## 📚 Ressources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Guide i18n du projet](./I18N_GUIDE.md)
- [Accept-Language Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language)

---

💡 **Astuce** : Pour tester la détection automatique, changez la langue de votre navigateur dans les paramètres, puis visitez le site en navigation privée.
