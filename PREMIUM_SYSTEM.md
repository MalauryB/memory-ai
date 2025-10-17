# 💎 Système Premium / Standard

Ce document explique le système de gestion des comptes premium et standard, avec limitation des générations IA.

## 📋 Vue d'ensemble

Le système distingue deux types de comptes :

| Type      | Limite mensuelle | Prix      | Accès IA                |
|-----------|------------------|-----------|-------------------------|
| **Standard** | 10 générations   | Gratuit   | Limité à 10/mois        |
| **Premium**  | Illimité         | À définir | Générations illimitées  |

### Comportement

- **Utilisateurs Standard** : Peuvent effectuer **10 générations IA par mois**. Au-delà, ils sont bloqués jusqu'au mois suivant ou doivent passer Premium.
- **Utilisateurs Premium** : Peuvent effectuer un **nombre illimité** de générations IA.

## 🚀 Installation

### Étape 1 : Appliquer les migrations SQL

Vous devez appliquer **deux migrations** dans cet ordre :

1. **Migration 005** : Crée la table de statistiques de génération IA
2. **Migration 006** : Ajoute les champs `account_type` et `premium_since` à `user_profiles`

**Via le tableau de bord Supabase (RECOMMANDÉ)**

1. Allez sur : https://app.supabase.com/project/YOUR_PROJECT/sql
2. Cliquez sur "New Query"
3. Copiez-collez le contenu de : `supabase/migrations/005_add_ai_generation_stats.sql`
4. Cliquez sur "Run"
5. Répétez avec : `supabase/migrations/006_add_account_type.sql`

**Via Supabase CLI**

```bash
supabase db push
```

### Étape 2 : Vérifier l'installation

Vérifiez que les colonnes ont été ajoutées :

```sql
-- Vérifier account_type
SELECT id, account_type, premium_since FROM user_profiles LIMIT 5;

-- Vérifier la table stats
SELECT * FROM ai_generation_stats LIMIT 5;
```

## 📖 APIs disponibles

### 1. Tracker une génération IA

**POST** `/api/ai/track-generation`

Incrémente le compteur de générations pour l'utilisateur connecté ce mois-ci. Bloque automatiquement les utilisateurs standard qui atteignent la limite de 10.

**Réponse (succès) :**

```json
{
  "success": true,
  "generation_count": 3,
  "year_month": "2025-10",
  "limit": 10,
  "account_type": "standard",
  "remaining": 7
}
```

**Réponse (limite atteinte) - HTTP 403 :**

```json
{
  "success": false,
  "error": "Limite atteinte",
  "message": "Vous avez atteint votre limite mensuelle de générations IA. Passez à Premium pour continuer.",
  "generation_count": 10,
  "limit": 10,
  "account_type": "standard",
  "limit_reached": true
}
```

**Exemple d'intégration :**

```typescript
// components/ai-chat.tsx
const handleSendMessage = async (message: string) => {
  try {
    // 1. Tracker la génération AVANT d'appeler l'IA
    const trackResponse = await fetch('/api/ai/track-generation', {
      method: 'POST'
    });
    const trackData = await trackResponse.json();

    // 2. Vérifier si limite atteinte
    if (!trackData.success && trackData.limit_reached) {
      alert(trackData.message); // Afficher message d'upgrade
      return; // Bloquer l'action
    }

    // 3. Appeler votre API de génération IA
    const aiResponse = await generateAIResponse(message);

    // 4. Afficher la réponse
    setMessages([...messages, aiResponse]);

    // 5. Afficher le compteur (optionnel)
    console.log(`Générations restantes : ${trackData.remaining}`);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2. Récupérer les statistiques

**GET** `/api/ai/stats?period=current|all|YYYY`

Récupère les statistiques de génération IA de l'utilisateur, avec infos de compte et limite.

**Paramètres :**
- `period=current` : Mois actuel uniquement (défaut)
- `period=all` : Tous les mois
- `period=2025` : Année spécifique

**Réponse :**

```json
{
  "success": true,
  "account": {
    "type": "standard",
    "is_premium": false,
    "premium_since": null,
    "limit": 10
  },
  "current_month": {
    "year_month": "2025-10",
    "generation_count": 7,
    "remaining": 3,
    "limit_reached": false
  },
  "total_generations": 45,
  "history": [...],
  "period": "current"
}
```

**Exemple d'affichage :**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AIUsageCard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch('/api/ai/stats?period=current')
      const data = await response.json()
      setStats(data)
    }
    fetchStats()
  }, [])

  if (!stats) return null

  const { account, current_month } = stats

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            Générations IA {account.type === 'premium' ? '✨ Premium' : ''}
          </h3>
          <p className="text-sm text-muted-foreground">
            {current_month.year_month}
          </p>
        </div>
        {account.type === 'standard' && (
          <Button size="sm" variant="outline" onClick={() => upgradeToPremium()}>
            Passer Premium
          </Button>
        )}
      </div>

      {account.type === 'standard' ? (
        <>
          <div className="text-3xl font-bold mb-2">
            {current_month.generation_count} / {account.limit}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${(current_month.generation_count / account.limit) * 100}%`
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {current_month.remaining} générations restantes
          </p>
          {current_month.limit_reached && (
            <p className="text-sm text-red-500 mt-2">
              ⚠️ Limite mensuelle atteinte
            </p>
          )}
        </>
      ) : (
        <div className="text-3xl font-bold">
          {current_month.generation_count} ✨ Illimité
        </div>
      )}
    </Card>
  )
}
```

### 3. Upgrader vers Premium

**POST** `/api/account/upgrade`

Upgrade un compte standard vers premium.

**Réponse :**

```json
{
  "success": true,
  "message": "Votre compte a été upgradé vers Premium avec succès !",
  "account_type": "premium",
  "premium_since": "2025-10-17T14:30:00.000Z"
}
```

**Erreur (déjà premium) - HTTP 400 :**

```json
{
  "success": false,
  "message": "Vous êtes déjà un utilisateur Premium",
  "account_type": "premium"
}
```

**Exemple d'intégration :**

```typescript
const upgradeToPremium = async () => {
  try {
    const response = await fetch('/api/account/upgrade', {
      method: 'POST'
    });
    const data = await response.json();

    if (data.success) {
      alert('Félicitations ! Vous êtes maintenant Premium ✨');
      // Rafraîchir les stats
      window.location.reload();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error upgrading:', error);
  }
};
```

### 4. Vérifier le statut du compte

**GET** `/api/account/upgrade`

Récupère le type de compte de l'utilisateur.

**Réponse :**

```json
{
  "success": true,
  "account_type": "standard",
  "premium_since": null,
  "is_premium": false
}
```

### 5. Downgrader vers Standard (pour tests)

**DELETE** `/api/account/upgrade`

Permet de repasser un compte premium vers standard (utile pour les tests).

**Réponse :**

```json
{
  "success": true,
  "message": "Votre compte a été changé vers Standard",
  "account_type": "standard"
}
```

## 🎨 Exemples de composants UI

### Badge de type de compte

```typescript
import { Badge } from '@/components/ui/badge'

export function AccountTypeBadge({ accountType }: { accountType: string }) {
  if (accountType === 'premium') {
    return <Badge variant="default">✨ Premium</Badge>
  }
  return <Badge variant="secondary">Standard</Badge>
}
```

### Modal d'upgrade

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function UpgradeModal({
  open,
  onClose,
  onUpgrade
}: {
  open: boolean
  onClose: () => void
  onUpgrade: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Passez à Premium ✨</AlertDialogTitle>
          <AlertDialogDescription>
            Débloquez les générations IA illimitées et profitez de toutes les fonctionnalités.

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>Générations IA illimitées</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>Priorité dans les réponses</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>Support prioritaire</span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onUpgrade}>
            Passer Premium
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Compteur en temps réel

```typescript
'use client'

import { useEffect, useState } from 'react'

export function AIGenerationCounter() {
  const [stats, setStats] = useState<any>(null)

  const fetchStats = async () => {
    const response = await fetch('/api/ai/stats?period=current')
    const data = await response.json()
    setStats(data)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Rafraîchir après chaque génération
  useEffect(() => {
    const interval = setInterval(fetchStats, 5000) // Poll toutes les 5s
    return () => clearInterval(interval)
  }, [])

  if (!stats || stats.account.type === 'premium') return null

  return (
    <div className="text-xs text-muted-foreground">
      {stats.current_month.remaining} / {stats.account.limit} générations restantes
    </div>
  )
}
```

## 🔧 Configuration

### Modifier les limites

Éditez les constantes dans les fichiers suivants :

**`app/api/ai/track-generation/route.ts`** et **`app/api/ai/stats/route.ts`** :

```typescript
// Constantes de limites
const STANDARD_LIMIT = 10      // ← Changer ici
const PREMIUM_LIMIT = null     // null = illimité
```

### Ajouter un système de paiement

Le fichier `app/api/account/upgrade/route.ts` contient un commentaire `TODO` pour intégrer un système de paiement (Stripe, PayPal, etc.).

**Exemple avec Stripe :**

```typescript
// app/api/account/upgrade/route.ts
export async function POST(request: Request) {
  // ... code existant ...

  // TODO: Intégrer le système de paiement ici
  const { payment_method } = await request.json();

  if (payment_method === 'stripe') {
    // Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      // ... configuration Stripe
    });

    return NextResponse.json({
      checkout_url: session.url
    });
  }

  // Pour l'instant, on upgrade directement (mode test)
  // ...
}
```

## 🐛 Dépannage

### L'utilisateur est toujours "standard" après upgrade

Vérifiez que la migration 006 a été appliquée :

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='user_profiles' AND column_name='account_type';
```

### La limite n'est pas respectée

Vérifiez que l'API de tracking est appelée **avant** la génération IA, et que vous bloquez l'action si `limit_reached: true`.

### Les stats ne se réinitialisent pas au nouveau mois

C'est normal ! Le système crée automatiquement un nouvel enregistrement pour chaque mois (format `YYYY-MM`). L'ancien mois reste dans l'historique.

## ✅ Checklist de vérification

- [ ] Migration 005 appliquée (`ai_generation_stats` existe)
- [ ] Migration 006 appliquée (`account_type` existe dans `user_profiles`)
- [ ] Les utilisateurs existants sont "standard" par défaut
- [ ] Le serveur a été redémarré
- [ ] L'API `/api/ai/track-generation` retourne `limit_reached: true` après 10 générations
- [ ] L'API `/api/account/upgrade` fonctionne
- [ ] L'API `/api/ai/stats` retourne les infos de compte
- [ ] Le tracking est intégré dans votre composant IA

## 📊 Structure de la base de données

### Table `user_profiles` (nouvelles colonnes)

| Colonne           | Type          | Description                                    |
|-------------------|---------------|------------------------------------------------|
| `account_type`    | VARCHAR(20)   | Type de compte: "standard" ou "premium"        |
| `premium_since`   | TIMESTAMPTZ   | Date à laquelle l'utilisateur est devenu premium. NULL si standard |

### Table `ai_generation_stats`

| Colonne           | Type          | Description                                    |
|-------------------|---------------|------------------------------------------------|
| `id`              | UUID          | Identifiant unique                             |
| `user_id`         | UUID          | Référence vers `auth.users(id)`                |
| `year_month`      | VARCHAR(7)    | Mois au format `YYYY-MM`                       |
| `generation_count`| INTEGER       | Nombre de générations ce mois-ci               |
| `created_at`      | TIMESTAMPTZ   | Date de création                               |
| `updated_at`      | TIMESTAMPTZ   | Date de dernière modification                  |

## 🔒 Sécurité

- **Row Level Security (RLS)** activé sur les deux tables
- Chaque utilisateur ne peut voir/modifier que ses propres données
- Les limites sont vérifiées côté serveur (impossible de contourner via le frontend)

## 📚 Ressources

- [Documentation AI_STATS_SETUP.md](./AI_STATS_SETUP.md) - Statistiques de génération IA
- [Documentation Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

💡 **Note importante** : Pour l'instant, l'upgrade vers premium est **immédiat et gratuit** (pas de paiement). Vous devrez intégrer un système de paiement (Stripe, PayPal, etc.) pour la production.
