import { createClientFromRequest } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

// Constantes de limites
const STANDARD_LIMIT = 10
const PREMIUM_LIMIT = null // null = illimité

/**
 * Incrémente le compteur de générations IA pour l'utilisateur
 * Retourne un objet avec success, et si limit_reached est true, retourne aussi un message d'erreur
 */
export async function trackAIGeneration(request: NextRequest, userId: string) {
  try {
    const supabase = createClientFromRequest(request)

    // Récupérer le profil utilisateur pour connaître son type de compte
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('account_type')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching user profile for tracking:', profileError)
      return {
        success: false,
        error: 'Erreur lors de la récupération du profil',
        limit_reached: false
      }
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
      .eq('user_id', userId)
      .eq('year_month', yearMonth)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (normal si premier enregistrement)
      console.error('Error fetching AI generation stats:', fetchError)
      return {
        success: false,
        error: fetchError.message,
        limit_reached: false
      }
    }

    const currentCount = existingStat?.generation_count || 0

    // Vérifier la limite pour les comptes standard
    if (accountType === 'standard' && limit !== null && currentCount >= limit) {
      return {
        success: false,
        error: 'Limite atteinte',
        message: 'Vous avez atteint votre limite mensuelle de générations IA. Passez à Premium pour continuer.',
        generation_count: currentCount,
        limit: limit,
        account_type: accountType,
        limit_reached: true,
      }
    }

    // Incrémenter ou créer l'enregistrement
    if (existingStat) {
      const { error } = await supabase
        .from('ai_generation_stats')
        .update({ generation_count: existingStat.generation_count + 1 })
        .eq('id', existingStat.id)

      if (error) {
        console.error('Error updating AI generation stats:', error)
        return {
          success: false,
          error: error.message,
          limit_reached: false
        }
      }

      return {
        success: true,
        generation_count: existingStat.generation_count + 1,
        year_month: yearMonth,
        limit: limit,
        account_type: accountType,
        remaining: limit !== null ? limit - (existingStat.generation_count + 1) : null,
      }
    } else {
      const { error } = await supabase
        .from('ai_generation_stats')
        .insert({
          user_id: userId,
          year_month: yearMonth,
          generation_count: 1,
        })

      if (error) {
        console.error('Error creating AI generation stats:', error)
        return {
          success: false,
          error: error.message,
          limit_reached: false
        }
      }

      return {
        success: true,
        generation_count: 1,
        year_month: yearMonth,
        limit: limit,
        account_type: accountType,
        remaining: limit !== null ? limit - 1 : null,
      }
    }
  } catch (error) {
    console.error('Error tracking AI generation:', error)
    return {
      success: false,
      error: 'Erreur serveur',
      limit_reached: false
    }
  }
}
