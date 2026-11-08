-- 20261108_01_model_public_profiles.sql
-- 모델 공개 프로필 (앱 회원 + 업체가 열람). 연락처/신체정보는 항목별 공개 여부 선택.
-- 민감값(키/몸무게/나이/신발/인스타/포트폴리오/전화)은 이 테이블에 복제하지 않고
-- users 테이블에 두고, show_* 가 true 인 항목만 RPC로 내려준다.

CREATE TABLE IF NOT EXISTS public.model_public_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    gender TEXT,
    intro TEXT,
    specialties TEXT,
    career TEXT,
    photo_urls TEXT[] NOT NULL DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT false,
    show_height BOOLEAN NOT NULL DEFAULT true,
    show_weight BOOLEAN NOT NULL DEFAULT false,
    show_age BOOLEAN NOT NULL DEFAULT true,
    show_shoe_size BOOLEAN NOT NULL DEFAULT false,
    show_instagram BOOLEAN NOT NULL DEFAULT false,
    show_portfolio BOOLEAN NOT NULL DEFAULT false,
    show_phone BOOLEAN NOT NULL DEFAULT false,
    view_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_public_profiles_public
    ON public.model_public_profiles(is_public, updated_at DESC);

ALTER TABLE public.model_public_profiles ENABLE ROW LEVEL SECURITY;

-- 앱은 auth.uid()를 쓰지 않으므로 TO public 패턴. 공개 행만 직접 조회 가능.
CREATE POLICY "Allow public select public profiles" ON public.model_public_profiles
    FOR SELECT TO public USING (is_public = true);
CREATE POLICY "Allow public insert profiles" ON public.model_public_profiles
    FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update profiles" ON public.model_public_profiles
    FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 내 프로필(비공개 포함) 조회
CREATE OR REPLACE FUNCTION public.get_my_public_profile(p_user_id UUID)
RETURNS SETOF public.model_public_profiles
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT * FROM public.model_public_profiles WHERE user_id = p_user_id;
$$;

-- 상세: 프로필 + 공개 허용된 항목만 users 에서 합쳐서 반환, 조회수 +1
CREATE OR REPLACE FUNCTION public.get_public_profile_detail(p_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    p public.model_public_profiles;
    u public.users;
BEGIN
    SELECT * INTO p FROM public.model_public_profiles WHERE id = p_id AND is_public = true;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT * INTO u FROM public.users WHERE id = p.user_id;
    UPDATE public.model_public_profiles SET view_count = view_count + 1 WHERE id = p_id;
    RETURN json_build_object(
        'id', p.id, 'display_name', p.display_name, 'gender', p.gender,
        'intro', p.intro, 'specialties', p.specialties, 'career', p.career,
        'photo_urls', p.photo_urls, 'view_count', p.view_count + 1, 'updated_at', p.updated_at,
        'height',    CASE WHEN p.show_height    THEN u.height    END,
        'weight',    CASE WHEN p.show_weight    THEN u.weight    END,
        'age',       CASE WHEN p.show_age       THEN u.age       END,
        'shoe_size', CASE WHEN p.show_shoe_size THEN u.shoe_size END,
        'instagram_id',   CASE WHEN p.show_instagram THEN u.instagram_id   END,
        'portfolio_link', CASE WHEN p.show_portfolio THEN u.portfolio_link END,
        'phone',     CASE WHEN p.show_phone     THEN u.phone     END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_public_profile(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_detail(UUID) TO anon, authenticated;
