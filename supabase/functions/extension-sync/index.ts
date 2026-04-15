import { corsHeaders } from '@supabase/supabase-js/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // GET: Fetch platforms + usage for extension popup
    if (req.method === 'GET' && action === 'sync') {
      const { data: platforms } = await supabase.from('ai_platforms').select('*')
      const { data: usage } = await supabase
        .from('usage_logs')
        .select('platform_id, units_used')
        .eq('user_id', user.id)
      const { data: quotas } = await supabase
        .from('user_platform_quotas')
        .select('platform_id, custom_quota_limit')
        .eq('user_id', user.id)
      const { data: tip } = await supabase
        .from('daily_tips')
        .select('content, category')
        .order('tip_date', { ascending: false })
        .limit(1)
        .single()

      // Aggregate usage per platform
      const usageMap: Record<string, number> = {}
      for (const log of usage || []) {
        usageMap[log.platform_id] = (usageMap[log.platform_id] || 0) + log.units_used
      }
      const quotaMap: Record<string, number> = {}
      for (const q of quotas || []) {
        quotaMap[q.platform_id] = q.custom_quota_limit
      }

      const syncedPlatforms = (platforms || []).map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color || '#facc15',
        used: usageMap[p.id] || 0,
        quota: quotaMap[p.id] || p.default_quota_limit,
      }))

      return new Response(JSON.stringify({
        platforms: syncedPlatforms,
        tip: tip?.content || '',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // POST: Log usage from extension
    if (req.method === 'POST' && action === 'log') {
      const body = await req.json()
      const { platform_name, units, description } = body

      if (!platform_name || !units) {
        return new Response(JSON.stringify({ error: 'Missing platform_name or units' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Find platform by name
      const { data: platform } = await supabase
        .from('ai_platforms')
        .select('id')
        .ilike('name', platform_name)
        .single()

      if (!platform) {
        return new Response(JSON.stringify({ error: 'Platform not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: insertError } = await supabase.from('usage_logs').insert({
        user_id: user.id,
        platform_id: platform.id,
        units_used: units,
        action_description: description || 'Auto-tracked by extension',
      })

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
