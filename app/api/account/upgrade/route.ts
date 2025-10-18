import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createAPILogger, logError } from '@/lib/logger'

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
  const apiLogger = createAPILogger("/api/account/upgrade", "POST")
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      apiLogger.warn("Unauthorized upgrade attempt")
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    apiLogger.info({ userId: user.id }, "Processing premium upgrade request")

    // Récupérer le profil actuel
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (profileError) {
      apiLogger.error({ error: profileError.message }, "Failed to fetch user profile")
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 })
    }

    // Vérifier si déjà premium
    if (profile?.account_type === 'premium') {
      apiLogger.info({ userId: user.id }, "User already has premium account")
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
    apiLogger.warn({ userId: user.id }, "Payment integration not yet implemented - upgrading directly")

    // Mettre à jour le compte vers premium
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        account_type: 'premium',
        premium_since: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      apiLogger.error({
        userId: user.id,
        error: updateError.message,
      }, "Failed to upgrade account to premium")
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const duration = Date.now() - startTime
    apiLogger.info({
      userId: user.id,
      duration: `${duration}ms`,
    }, "Account successfully upgraded to premium")

    return NextResponse.json({
      success: true,
      message: 'Votre compte a été upgradé vers Premium avec succès !',
      account_type: 'premium',
      premium_since: new Date().toISOString(),
    })
  } catch (error) {
    logError(error, "POST /api/account/upgrade")
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * DELETE /api/account/upgrade
 * Downgrade un compte vers standard (pour tests ou annulation)
 */
export async function DELETE() {
  const apiLogger = createAPILogger("/api/account/upgrade", "DELETE")
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      apiLogger.warn("Unauthorized downgrade attempt")
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    apiLogger.info({ userId: user.id }, "Processing downgrade to standard")

    // Mettre à jour le compte vers standard
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        account_type: 'standard',
        premium_since: null,
      })
      .eq('id', user.id)

    if (updateError) {
      apiLogger.error({
        userId: user.id,
        error: updateError.message,
      }, "Failed to downgrade account to standard")
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const duration = Date.now() - startTime
    apiLogger.info({
      userId: user.id,
      duration: `${duration}ms`,
    }, "Account successfully downgraded to standard")

    return NextResponse.json({
      success: true,
      message: 'Votre compte a été changé vers Standard',
      account_type: 'standard',
    })
  } catch (error) {
    logError(error, "DELETE /api/account/upgrade")
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * GET /api/account/upgrade
 * Récupère le statut du compte (standard ou premium)
 */
export async function GET() {
  const apiLogger = createAPILogger("/api/account/upgrade", "GET")
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      apiLogger.warn("Unauthorized account status check")
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    apiLogger.debug({ userId: user.id }, "Fetching account status")

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('account_type, premium_since')
      .eq('id', user.id)
      .single()

    if (profileError) {
      apiLogger.error({ error: profileError.message }, "Failed to fetch user profile")
      return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 })
    }

    const duration = Date.now() - startTime
    apiLogger.debug({
      userId: user.id,
      accountType: profile?.account_type || 'standard',
      duration: `${duration}ms`,
    }, "Account status fetched")

    return NextResponse.json({
      success: true,
      account_type: profile?.account_type || 'standard',
      premium_since: profile?.premium_since || null,
      is_premium: profile?.account_type === 'premium',
    })
  } catch (error) {
    logError(error, "GET /api/account/upgrade")
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
