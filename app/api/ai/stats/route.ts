import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Constantes de limites
const STANDARD_LIMIT = 10
const PREMIUM_LIMIT = null // null = illimité

/**
 * GET /api/ai/stats?period=current|all
 * Récupère les statistiques de génération IA de l'utilisateur connecté
 * Inclut les informations de compte (type, limite, remaining)
 *
 * Query params:
 * - period: "current" (mois actuel uniquement) | "all" (tous les mois) | année spécifique "YYYY"
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer le profil utilisateur pour connaître son type de compte
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('account_type, premium_since')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 })
    }

    const accountType = profile?.account_type || 'standard'
    const limit = accountType === 'premium' ? PREMIUM_LIMIT : STANDARD_LIMIT

    // Parser les query params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current'

    // Obtenir le mois actuel au format YYYY-MM
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    let query = supabase
      .from('ai_generation_stats')
      .select('*')
      .eq('user_id', user.id)

    // Filtrer selon la période demandée
    if (period === 'current') {
      query = query.eq('year_month', currentYearMonth)
    } else if (period !== 'all' && /^\d{4}$/.test(period)) {
      // Si c'est une année spécifique (format: YYYY)
      query = query.like('year_month', `${period}-%`)
    }
    // Si period === 'all', pas de filtre supplémentaire

    // Trier par mois décroissant (plus récent en premier)
    query = query.order('year_month', { ascending: false })

    const { data: stats, error } = await query

    if (error) {
      console.error('Error fetching AI generation stats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculer le total de générations
    const totalGenerations = stats.reduce((sum, stat) => sum + stat.generation_count, 0)

    // Obtenir les stats du mois actuel
    const currentMonthStat = stats.find(stat => stat.year_month === currentYearMonth)
    const currentCount = currentMonthStat?.generation_count || 0

    // Calculer le nombre de générations restantes
    const remaining = limit !== null ? Math.max(0, limit - currentCount) : null

    return NextResponse.json({
      success: true,
      account: {
        type: accountType,
        is_premium: accountType === 'premium',
        premium_since: profile?.premium_since || null,
        limit: limit,
      },
      current_month: {
        year_month: currentYearMonth,
        generation_count: currentCount,
        remaining: remaining,
        limit_reached: limit !== null && currentCount >= limit,
      },
      total_generations: totalGenerations,
      history: stats,
      period,
    })
  } catch (error) {
    console.error('Error fetching AI generation stats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
