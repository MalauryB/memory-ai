import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/account/upgrade
 * Upgrade un compte vers premium
 *
 * Body:
 * {
 *   "payment_method": "stripe" | "paypal" | "other"  (optionnel, pour futur intégration)
 * }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer le profil actuel
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 })
    }

    // Vérifier si déjà premium
    if (profile?.account_type === 'premium') {
      return NextResponse.json(
        {
          success: false,
          message: 'Vous êtes déjà un utilisateur Premium',
          account_type: 'premium',
        },
        { status: 400 }
      )
    }

    // TODO: Intégrer le système de paiement ici (Stripe, PayPal, etc.)
    // Pour l'instant, on upgrade directement

    // Mettre à jour le compte vers premium
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        account_type: 'premium',
        premium_since: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error upgrading to premium:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Votre compte a été upgradé vers Premium avec succès !',
      account_type: 'premium',
      premium_since: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error upgrading account:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/account/upgrade
 * Downgrade un compte vers standard (pour tests ou annulation)
 */
export async function DELETE() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Mettre à jour le compte vers standard
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        account_type: 'standard',
        premium_since: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error downgrading to standard:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Votre compte a été changé vers Standard',
      account_type: 'standard',
    })
  } catch (error) {
    console.error('Error downgrading account:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * GET /api/account/upgrade
 * Récupère le statut du compte (standard ou premium)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('account_type, premium_since')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      account_type: profile?.account_type || 'standard',
      premium_since: profile?.premium_since || null,
      is_premium: profile?.account_type === 'premium',
    })
  } catch (error) {
    console.error('Error fetching account status:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
