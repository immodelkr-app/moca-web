-- Migration: Create app_settings table
-- This table stores global application settings like homepage content in a single JSONB column.

CREATE TABLE IF NOT EXISTS public.app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT single_row CHECK (id = 1)
);

-- RLS Policies
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Allow public read access to app_settings"
    ON public.app_settings
    FOR SELECT
    USING (true);

-- Allow authenticated users (admins) to update settings
CREATE POLICY "Allow authenticated updates to app_settings"
    ON public.app_settings
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated inserts to app_settings"
    ON public.app_settings
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Insert initial row if it doesn't exist
INSERT INTO public.app_settings (id, content)
VALUES (
    1, 
    '{
        "brandPrompt": "",
        "heroBadgeGuest": "I''m Model Agency Platform",
        "heroTitle1": "당신의 모델 활동을",
        "heroTitle2": "더 스마트하게, 아임모카",
        "heroHighlightWord": "아임모카",
        "heroSubtitle1": "HOT한 중요 이상의 정보를",
        "heroSubtitle2": "한눈에 확인하고, 광고모델 전문 프로필을 단 1분만에 완성하여 스마트한 광고모델 활동을 시작해보세요!"
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
