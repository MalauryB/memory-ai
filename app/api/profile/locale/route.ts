import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET - Récupérer la préférence de langue
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('preferred_locale')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preferred_locale: profile?.preferred_locale || null })
  } catch (error) {
    console.error('Error fetching locale preference:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Mettre à jour la préférence de langue
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { locale } = await request.json()

    // Valider la locale
    const validLocales = ['fr', 'en', 'es', 'de', 'it', 'pt']
    if (locale && !validLocales.includes(locale)) {
      return NextResponse.json({ error: 'Locale invalide' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ preferred_locale: locale || null })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferred_locale: locale })
  } catch (error) {
    console.error('Error updating locale preference:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
