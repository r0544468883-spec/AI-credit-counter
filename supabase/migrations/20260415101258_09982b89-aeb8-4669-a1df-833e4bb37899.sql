
-- Create snapshot source enum
CREATE TYPE public.snapshot_source AS ENUM ('scraped', 'manual', 'estimated');

-- Create platform_usage_snapshots table
CREATE TABLE public.platform_usage_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.ai_platforms(id) ON DELETE CASCADE,
  model_name TEXT,
  actual_remaining INTEGER,
  actual_limit INTEGER,
  reset_at TIMESTAMP WITH TIME ZONE,
  source snapshot_source NOT NULL DEFAULT 'estimated',
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_usage_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own snapshots"
  ON public.platform_usage_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.platform_usage_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.platform_usage_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- Add model_name to usage_logs
ALTER TABLE public.usage_logs ADD COLUMN IF NOT EXISTS model_name TEXT;
