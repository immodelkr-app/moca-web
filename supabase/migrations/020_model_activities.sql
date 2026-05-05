-- 020_model_activities.sql
-- Create tables for Model Diary, Agency Visits, and Gamification

-- 1. agency_visits (모델 에이전시 방문 및 프로필 제출 기록)
CREATE TABLE IF NOT EXISTS public.agency_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    agency_id INTEGER NOT NULL, -- references static agencies.js ID
    visit_date DATE NOT NULL,
    visit_type TEXT DEFAULT 'profile_submission', -- 'profile_submission', 'meeting', 'audition'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. casting_records (모델 캐스팅 및 활동 이력)
CREATE TABLE IF NOT EXISTS public.casting_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    role TEXT,
    casting_date DATE,
    agency_id INTEGER, -- Optional
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. user_badges (게미피케이션: 뱃지 및 활동 보상 기록)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL, -- e.g., 'FIRST_PROFILE', 'FIVE_AGENCIES', 'FIRST_CASTING'
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Enable RLS
ALTER TABLE public.agency_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casting_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Users can only read and write their own activity data
CREATE POLICY "Users can manage own agency visits" 
ON public.agency_visits FOR ALL TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own casting records" 
ON public.casting_records FOR ALL TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own badges" 
ON public.user_badges FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges for users"
ON public.user_badges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
