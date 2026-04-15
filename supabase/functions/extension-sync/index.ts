import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function checkThresholdsAndAlert(
  supabase: any,
  userId: string,
  platformId: string,
  platformName: string,
) {
  // Get current usage for this platform
  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('units_used')
    .eq('user_id', userId)
    .eq('platform_id', platformId)

  const totalUsed = (usageLogs || []).reduce((s: number, l: any) => s + l.units_used, 0)

  // Get quota
  const { data: quotaRow } = await supabase
    .from('user_platform_quotas')
    .select('custom_quota_limit')
    .eq('user_id', userId)
    .eq('platform_id', platformId)
    .maybeSingle()

  const { data: platform } = await supabase
    .from('ai_platforms')
    .select('default_quota_limit')
    .eq('id', platformId)
    .single()

  const quota = quotaRow?.custom_quota_limit || platform?.default_quota_limit || 0
  if (quota <= 0) return

  const pct = Math.round((totalUsed / quota) * 100)

  // Check if alerts already exist for these thresholds
  const thresholds = [80, 100].filter((t) => pct >= t)

  for (const threshold of thresholds) {
    const { data: existing } = await supabase
      .from('quota_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('platform_id', platformId)
      .eq('threshold_pct', threshold)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      const message = threshold >= 100
        ? `המכסה של ${platformName} נגמרה! (${pct}%)`
        : `השימוש ב-${platformName} הגיע ל-${pct}% מהמכסה`

      await supabase.from('quota_alerts').insert({
        user_id: userId,
        platform_id: platformId,
        threshold_pct: threshold,
        message,
      })
    }
  }

  // Fire webhooks
  const { data: webhooks } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  for (const wh of webhooks || []) {
    if (pct >= wh.trigger_threshold) {
      try {
        await fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform_name: platformName,
            used: totalUsed,
            quota,
            percentage: pct,
          }),
        })
      } catch (_) {
        // Silently fail webhook
      }
    }
  }
}

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

    // GET: Fetch platforms + usage + snapshots for extension popup
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

      const { data: snapshots } = await supabase
        .from('platform_usage_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('scraped_at', { ascending: false })

      const usageMap: Record<string, number> = {}
      for (const log of usage || []) {
        usageMap[log.platform_id] = (usageMap[log.platform_id] || 0) + log.units_used
      }
      const quotaMap: Record<string, number> = {}
      for (const q of quotas || []) {
        quotaMap[q.platform_id] = q.custom_quota_limit
      }

      const snapshotMap: Record<string, any> = {}
      for (const s of snapshots || []) {
        if (!snapshotMap[s.platform_id]) {
          snapshotMap[s.platform_id] = {
            actual_remaining: s.actual_remaining,
            actual_limit: s.actual_limit,
            model_name: s.model_name,
            source: s.source,
            scraped_at: s.scraped_at,
          }
        }
      }

      const syncedPlatforms = (platforms || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        color: p.color || '#facc15',
        used: usageMap[p.id] || 0,
        quota: quotaMap[p.id] || p.default_quota_limit,
        snapshot: snapshotMap[p.id] || null,
      }))

      return new Response(JSON.stringify({
        platforms: syncedPlatforms,
        tip: tip?.content || '',
        snapshots: snapshotMap,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // POST: Log usage from extension
    if (req.method === 'POST' && action === 'log') {
      const body = await req.json()
      const { platform_name, units, description, model_name } = body

      if (!platform_name || !units) {
        return new Response(JSON.stringify({ error: 'Missing platform_name or units' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: platform } = await supabase
        .from('ai_platforms')
        .select('id, name')
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
        model_name: model_name || null,
      })

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check thresholds and fire alerts/webhooks
      await checkThresholdsAndAlert(supabase, user.id, platform.id, platform.name)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // POST: Update quota from scraped data
    if (req.method === 'POST' && action === 'update-quota') {
      const body = await req.json()
      const { platform_name, snapshots: snapshotData } = body

      if (!platform_name || !snapshotData) {
        return new Response(JSON.stringify({ error: 'Missing platform_name or snapshots' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: platform } = await supabase
        .from('ai_platforms')
        .select('id, name')
        .ilike('name', platform_name)
        .single()

      if (!platform) {
        return new Response(JSON.stringify({ error: 'Platform not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const rows = (snapshotData as any[]).map((s: any) => ({
        user_id: user.id,
        platform_id: platform.id,
        model_name: s.model || null,
        actual_remaining: s.actual_remaining ?? null,
        actual_limit: s.actual_limit ?? null,
        source: 'scraped' as const,
      }))

      const { error: insertError } = await supabase
        .from('platform_usage_snapshots')
        .insert(rows)

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check thresholds after quota update
      await checkThresholdsAndAlert(supabase, user.id, platform.id, platform.name)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
