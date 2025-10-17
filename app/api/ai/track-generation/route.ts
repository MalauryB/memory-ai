import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Constantes de limites
const STANDARD_LIMIT = 10
const PREMIUM_LIMIT = null // null = illimité

/**
 * POST /api/ai/track-generation
 * Incrémente le compteur de générations IA pour l'utilisateur connecté ce mois-ci
 * Vérifie les limites selon le type de compte (standard: 10, premium: illimité)
 */
export async function POST() {
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
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 })
    }

    const accountType = profile?.account_type || 'standard'
    const limit = accountType === 'premium' ? PREMIUM_LIMIT : STANDARD_LIMIT

    // Obtenir le mois actuel au format YYYY-MM
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Vérifier si un enregistrement existe déjà pour ce mois
    const { data: existingStat, error: fetchError } = await supabase
      .from('ai_generation_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (normal si premier enregistrement)
      console.error('Error fetching AI generation stats:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const currentCount = existingStat?.generation_count || 0

    // Vérifier la limite pour les comptes standard
    if (accountType === 'standard' && limit !== null && currentCount >= limit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limite atteinte',
          message: 'Vous avez atteint votre limite mensuelle de générations IA. Passez à Premium pour continuer.',
          generation_count: currentCount,
          limit: limit,
          account_type: accountType,
          limit_reached: true,
        },
        { status: 403 }
      )
    }

    if (existingStat) {
      // Incrémenter le compteur existant
      const { data, error } = await supabase
        .from('ai_generation_stats')
        .update({ generation_count: existingStat.generation_count + 1 })
        .eq('id', existingStat.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating AI generation stats:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        generation_count: data.generation_count,
        year_month: data.year_month,
        limit: limit,
        account_type: accountType,
        remaining: limit !== null ? limit - data.generation_count : null,
      })
    } else {
      // Créer un nouvel enregistrement avec count = 1
      const { data, error } = await supabase
        .from('ai_generation_stats')
        .insert({
          user_id: user.id,
          year_month: yearMonth,
          generation_count: 1,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating AI generation stats:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        generation_count: data.generation_count,
        year_month: data.year_month,
        limit: limit,
        account_type: accountType,
        remaining: limit !== null ? limit - data.generation_count : null,
      })
    }
  } catch (error) {
    console.error('Error tracking AI generation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
