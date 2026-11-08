-- 20261108_03_public_profile_verified_company_only.sql
-- 전체 프로필(신체정보/소개/경력/공개연락처)은 인증완료(verified) 업체만. 그 외(모델·미인증 업체)는 사진+이름만.
-- 주의: 앱이 서버 로그인 검증이 없어 p_viewer_id 는 클라이언트가 보내는 값 (완전한 보안 아님).

CREATE OR REPLACE FUNCTION public._is_verified_company(p_viewer_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.companies c JOIN public.users u ON u.id = c.user_id
        WHERE c.user_id = p_viewer_id AND c.verification_status = 'verified' AND u.user_type = 'company'
    );
$$;

DROP FUNCTION IF EXISTS public.list_public_profiles(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.list_public_profiles(p_gender TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'recent', p_viewer_id UUID DEFAULT NULL)
RETURNS TABLE (id UUID, display_name TEXT, gender TEXT, age TEXT, view_count INT, cover_url TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT p.id, p.display_name, p.gender,
        CASE WHEN p.show_age AND public._is_verified_company(p_viewer_id) THEN u.age END,
        p.view_count,
        (SELECT c.photo_url FROM public.model_current_photos c WHERE c.user_id = p.user_id
         ORDER BY c.is_main DESC, c.created_at DESC LIMIT 1),
        p.updated_at
    FROM public.model_public_profiles p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.is_public AND (p_gender IS NULL OR p_gender = '' OR p.gender = p_gender)
      AND EXISTS (SELECT 1 FROM public.model_current_photos c WHERE c.user_id = p.user_id)
    ORDER BY CASE WHEN p_sort = 'views' THEN p.view_count END DESC NULLS LAST, p.updated_at DESC
    LIMIT 200;
$$;

DROP FUNCTION IF EXISTS public.get_public_profile_detail(UUID);
CREATE OR REPLACE FUNCTION public.get_public_profile_detail(p_id UUID, p_viewer_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    p public.model_public_profiles;
    u public.users;
    photos TEXT[];
    full_access BOOLEAN := public._is_verified_company(p_viewer_id);
BEGIN
    SELECT * INTO p FROM public.model_public_profiles WHERE id = p_id AND is_public = true;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT COALESCE(array_agg(photo_url ORDER BY is_main DESC, created_at DESC), '{}') INTO photos
        FROM public.model_current_photos WHERE user_id = p.user_id;
    UPDATE public.model_public_profiles SET view_count = view_count + 1 WHERE id = p_id;

    IF NOT full_access THEN
        RETURN json_build_object('id', p.id, 'display_name', p.display_name, 'photo_urls', photos,
                                 'view_count', p.view_count + 1, 'limited', true);
    END IF;

    SELECT * INTO u FROM public.users WHERE id = p.user_id;
    RETURN json_build_object(
        'id', p.id, 'display_name', p.display_name, 'gender', p.gender, 'limited', false,
        'intro', p.intro, 'specialties', p.specialties, 'career', p.career,
        'photo_urls', photos, 'view_count', p.view_count + 1, 'updated_at', p.updated_at,
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

GRANT EXECUTE ON FUNCTION public.list_public_profiles(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_detail(UUID, UUID) TO anon, authenticated;
