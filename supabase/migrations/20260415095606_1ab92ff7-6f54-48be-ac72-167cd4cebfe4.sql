
CREATE TABLE public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid REFERENCES public.ai_platforms(id) ON DELETE CASCADE NOT NULL,
  plan_name text NOT NULL,
  quota_limit integer NOT NULL,
  price_label text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plans" ON public.platform_plans
  FOR SELECT TO public USING (true);

-- Add selected_plan_id to user_platform_quotas
ALTER TABLE public.user_platform_quotas
  ADD COLUMN selected_plan_id uuid REFERENCES public.platform_plans(id);

-- ChatGPT plans
INSERT INTO public.platform_plans (platform_id, plan_name, quota_limit, price_label, is_default) VALUES
  ('8017d78c-e952-4805-a794-7d41a8119dab', 'Free', 16, '$0/mo', true),
  ('8017d78c-e952-4805-a794-7d41a8119dab', 'Plus', 80, '$20/mo', false),
  ('8017d78c-e952-4805-a794-7d41a8119dab', 'Pro', 999, '$200/mo', false);

-- Claude plans
INSERT INTO public.platform_plans (platform_id, plan_name, quota_limit, price_label, is_default) VALUES
  ('9adb89e7-1f3a-4505-b2d1-16374338e168', 'Free', 25, '$0/mo', true),
  ('9adb89e7-1f3a-4505-b2d1-16374338e168', 'Pro', 150, '$20/mo', false),
  ('9adb89e7-1f3a-4505-b2d1-16374338e168', 'Max (5x)', 750, '$100/mo', false),
  ('9adb89e7-1f3a-4505-b2d1-16374338e168', 'Max (20x)', 3000, '$200/mo', false);

-- Gemini plans
INSERT INTO public.platform_plans (platform_id, plan_name, quota_limit, price_label, is_default) VALUES
  ('c97ec59b-6f25-4831-a33e-1e7c240eb851', 'Free', 50, '$0/mo', true),
  ('c97ec59b-6f25-4831-a33e-1e7c240eb851', 'Advanced', 999, '$20/mo', false);

-- Midjourney plans
INSERT INTO public.platform_plans (platform_id, plan_name, quota_limit, price_label, is_default) VALUES
  ('0ad64fc7-cd81-460d-ba59-11bfe1949c89', 'Basic', 200, '$10/mo', true),
  ('0ad64fc7-cd81-460d-ba59-11bfe1949c89', 'Standard', 900, '$30/mo', false),
  ('0ad64fc7-cd81-460d-ba59-11bfe1949c89', 'Pro', 1800, '$60/mo', false);

-- Perplexity plans
INSERT INTO public.platform_plans (platform_id, plan_name, quota_limit, price_label, is_default) VALUES
  ('f90f3dd7-4116-4cca-bf9e-6a2b7ea554f8', 'Free', 5, '$0/mo', true),
  ('f90f3dd7-4116-4cca-bf9e-6a2b7ea554f8', 'Pro', 600, '$20/mo', false);

-- Runway plans
INSERT INTO public.platform_plans (platform_id, plan_name, quota_limit, price_label, is_default) VALUES
  ('2c1773b8-3028-45cb-a4e4-792cb8eee2d7', 'Basic', 125, '$12/mo', true),
  ('2c1773b8-3028-45cb-a4e4-792cb8eee2d7', 'Standard', 625, '$28/mo', false),
  ('2c1773b8-3028-45cb-a4e4-792cb8eee2d7', 'Pro', 2250, '$76/mo', false);

-- Kling plans
INSERT INTO public.platform_plans (platform_id, plan_name, quota_limit, price_label, is_default) VALUES
  ('40e19919-d133-454f-af1b-7ff581fff0a9', 'Free', 66, '$0/mo', true),
  ('40e19919-d133-454f-af1b-7ff581fff0a9', 'Standard', 660, '$8/mo', false),
  ('40e19919-d133-454f-af1b-7ff581fff0a9', 'Pro', 3000, '$28/mo', false);
