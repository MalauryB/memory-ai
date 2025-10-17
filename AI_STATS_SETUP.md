# 📊 Statistiques de Génération IA

Ce document explique comment utiliser le système de suivi des générations IA par utilisateur et par mois.

## 📋 Fonctionnalités

- **Compteur mensuel** : Compte automatiquement le nombre de générations IA par utilisateur par mois
- **Historique complet** : Conserve l'historique de toutes les générations
- **API REST** : APIs simples pour incrémenter et récupérer les stats
- **Sécurisé** : Row Level Security (RLS) activé - chaque utilisateur ne voit que ses propres stats

## 🚀 Installation

### Étape 1 : Appliquer la migration SQL

Vous devez créer la table `ai_generation_stats` dans Supabase.

**Via le tableau de bord Supabase (RECOMMANDÉ)**

1. Allez sur : https://app.supabase.com/project/YOUR_PROJECT/sql
2. Cliquez sur "New Query"
3. Copiez-collez le contenu de : `supabase/migrations/005_add_ai_generation_stats.sql`
4. Cliquez sur "Run"

**Via Supabase CLI**

```bash
supabase db push
```

### Étape 2 : Vérifier l'installation

Vérifiez que la table a été créée :

```sql
SELECT * FROM ai_generation_stats LIMIT 1;
```

## 📖 Utilisation

### 1. Incrémenter le compteur de générations

Appelez cette route à chaque fois qu'une génération IA est effectuée :

```typescript
// POST /api/ai/track-generation
const response = await fetch('/api/ai/track-generation', {
  method: 'POST',
});

const data = await response.json();
console.log(data);
// {
//   success: true,
//   generation_count: 5,  // Nombre total pour ce mois
//   year_month: "2025-10"
// }
```

**Exemple d'intégration dans un composant :**

```typescript
// components/ai-chat.tsx
const handleSendMessage = async (message: string) => {
  try {
    // 1. Appeler votre API de génération IA
    const aiResponse = await generateAIResponse(message);

    // 2. Tracker la génération
    await fetch('/api/ai/track-generation', { method: 'POST' });

    // 3. Afficher la réponse
    setMessages([...messages, aiResponse]);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 2. Récupérer les statistiques

**Mois actuel uniquement :**

```typescript
// GET /api/ai/stats?period=current
const response = await fetch('/api/ai/stats?period=current');
const data = await response.json();
console.log(data);
// {
//   success: true,
//   current_month: {
//     year_month: "2025-10",
//     generation_count: 5
//   },
//   total_generations: 5,
//   history: [...],
//   period: "current"
// }
```

**Historique complet :**

```typescript
// GET /api/ai/stats?period=all
const response = await fetch('/api/ai/stats?period=all');
const data = await response.json();
// Retourne toutes les stats de tous les mois
```

**Année spécifique :**

```typescript
// GET /api/ai/stats?period=2025
const response = await fetch('/api/ai/stats?period=2025');
// Retourne uniquement les stats de 2025
```

## 🎨 Exemples d'affichage

### Afficher le compteur mensuel dans l'interface

```typescript
'use client'

import { useEffect, useState } from 'react'

export function AIStatsDisplay() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/ai/stats?period=current')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) return <div>Chargement...</div>

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-semibold">Générations IA ce mois-ci</h3>
      <p className="text-3xl font-bold">
        {stats?.current_month?.generation_count || 0}
      </p>
      <p className="text-sm text-muted-foreground">
        Total : {stats?.total_generations || 0}
      </p>
    </div>
  )
}
```

### Afficher un graphique d'historique

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

export function AIStatsHistory() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch('/api/ai/stats?period=all')
      const data = await response.json()
      setStats(data)
    }

    fetchStats()
  }, [])

  if (!stats) return null

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Historique des générations</h3>
      <div className="space-y-2">
        {stats.history.map((stat: any) => (
          <div key={stat.id} className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {stat.year_month}
            </span>
            <span className="font-semibold">
              {stat.generation_count} générations
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

## 🔧 Structure de la base de données

### Table `ai_generation_stats`

| Colonne           | Type          | Description                                    |
|-------------------|---------------|------------------------------------------------|
| `id`              | UUID          | Identifiant unique (généré automatiquement)    |
| `user_id`         | UUID          | Référence vers `auth.users(id)`                |
| `year_month`      | VARCHAR(7)    | Mois au format `YYYY-MM` (ex: `2025-10`)       |
| `generation_count`| INTEGER       | Nombre de générations ce mois-ci               |
| `created_at`      | TIMESTAMPTZ   | Date de création                               |
| `updated_at`      | TIMESTAMPTZ   | Date de dernière modification (auto)           |

**Contrainte unique :** Un seul enregistrement par utilisateur par mois (`user_id`, `year_month`)

### Index créés

- `idx_ai_generation_stats_user_id` : Recherche rapide par utilisateur
- `idx_ai_generation_stats_year_month` : Recherche par période
- `idx_ai_generation_stats_user_month` : Recherche combinée

## 🔒 Sécurité (RLS)

Les politiques Row Level Security (RLS) sont activées :

- ✅ Les utilisateurs peuvent **voir** uniquement leurs propres stats
- ✅ Les utilisateurs peuvent **créer** uniquement leurs propres stats
- ✅ Les utilisateurs peuvent **modifier** uniquement leurs propres stats
- ❌ Les utilisateurs **ne peuvent pas supprimer** leurs stats (optionnel)

Pour activer la suppression, décommentez la policy dans la migration.

## 📊 Cas d'usage

### 1. Limiter le nombre de générations mensuelles

```typescript
const response = await fetch('/api/ai/stats?period=current')
const data = await response.json()

const MONTHLY_LIMIT = 100

if (data.current_month.generation_count >= MONTHLY_LIMIT) {
  alert('Vous avez atteint votre limite mensuelle de générations IA')
  return
}

// Continuer avec la génération...
```

### 2. Afficher un badge de progression

```typescript
const MAX_FREE_GENERATIONS = 50

const progress = (stats.current_month.generation_count / MAX_FREE_GENERATIONS) * 100

return (
  <div>
    <p>Générations gratuites : {stats.current_month.generation_count} / {MAX_FREE_GENERATIONS}</p>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  </div>
)
```

### 3. Afficher un message d'encouragement

```typescript
const count = stats.current_month.generation_count

if (count === 1) {
  return <p>🎉 Première génération ce mois-ci !</p>
} else if (count === 10) {
  return <p>🔥 Bravo ! 10 générations ce mois-ci</p>
} else if (count >= 50) {
  return <p>⭐ Utilisateur power ! {count} générations</p>
}
```

## 🐛 Dépannage

### La table n'existe pas

Vérifiez que la migration a été appliquée :

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'ai_generation_stats';
```

### Les stats ne s'incrémentent pas

1. Vérifiez que l'utilisateur est authentifié
2. Vérifiez les logs du navigateur (Console F12)
3. Testez l'API directement :

```bash
curl -X POST http://localhost:3000/api/ai/track-generation \
  -H "Content-Type: application/json"
```

### Erreur RLS (Row Level Security)

Si vous obtenez une erreur "new row violates row-level security policy", vérifiez :

1. Que l'utilisateur est bien connecté
2. Que les policies RLS sont correctement configurées dans Supabase

## ✅ Checklist de vérification

- [ ] Migration SQL appliquée dans Supabase
- [ ] Table `ai_generation_stats` visible dans la base de données
- [ ] Les policies RLS sont activées
- [ ] Le serveur a été redémarré
- [ ] L'appel à `/api/ai/track-generation` fonctionne
- [ ] L'appel à `/api/ai/stats` retourne les données

## 📚 Ressources

- [Documentation Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Unique Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)

---

💡 **Astuce** : Pour réinitialiser les stats d'un utilisateur, utilisez la console SQL de Supabase :

```sql
DELETE FROM ai_generation_stats WHERE user_id = 'USER_UUID_HERE';
```
