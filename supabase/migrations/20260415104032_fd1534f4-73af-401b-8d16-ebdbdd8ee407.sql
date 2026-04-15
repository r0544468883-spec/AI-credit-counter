
CREATE TABLE public.quota_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform_id uuid NOT NULL REFERENCES public.ai_platforms(id) ON DELETE CASCADE,
  threshold_pct integer NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quota_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
ON public.quota_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
ON public.quota_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
ON public.quota_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
ON public.quota_alerts FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_quota_alerts_user_id ON public.quota_alerts(user_id);
CREATE INDEX idx_quota_alerts_read ON public.quota_alerts(user_id, read);
