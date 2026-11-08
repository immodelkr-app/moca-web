-- 20261108_05_activity_birth_year.sql
-- 모델/배우는 실제 출생년도 대신 '활동년생'을 쓰는 게 관행 -> 별도 입력값을 목록/상세에 이름과 함께 전체 공개.
ALTER TABLE public.model_public_profiles ADD COLUMN IF NOT EXISTS activity_year INT CHECK (activity_year BETWEEN 1950 AND 2030);

DROP FUNCTION IF EXISTS public.list_public_profiles(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.list_public_profiles(p_gender TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'recent', p_viewer_id UUID DEFAULT NULL)
RETURNS TABLE (id UUID, display_name TEXT, gender TEXT, activity_year INT, view_count INT, cover_url TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT p.id, p.display_name, p.gender, p.activity_year, p.view_count,
        (SELECT c.photo_url FROM public.model_current_photos c WHERE c.user_id = p.user_id
         ORDER BY c.is_main DESC, c.created_at DESC LIMIT 1),
        p.updated_at
    FROM public.model_public_profiles p
    WHERE p.is_public AND (p_gender IS NULL OR p_gender = '' OR p.gender = p_gender)
      AND EXISTS (SELECT 1 FROM public.model_current_photos c WHERE c.user_id = p.user_id)
    ORDER BY CASE WHEN p_sort = 'views' THEN p.view_count END DESC NULLS LAST, p.updated_at DESC
    LIMIT 200;
$$;

DROP FUNCTION IF EXISTS public.get_public_profile_detail(UUID, UUID);
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
        RETURN json_build_object('id', p.id, 'display_name', p.display_name, 'activity_year', p.activity_year,
                                 'photo_urls', photos, 'view_count', p.view_count + 1, 'limited', true);
    END IF;

    SELECT * INTO u FROM public.users WHERE id = p.user_id;
    RETURN json_build_object(
        'id', p.id, 'display_name', p.display_name, 'gender', p.gender, 'activity_year', p.activity_year, 'limited', false,
        'intro', p.intro, 'specialties', p.specialties, 'career', p.career,
        'photo_urls', photos, 'view_count', p.view_count + 1, 'updated_at', p.updated_at,
        'height',    CASE WHEN p.show_height    THEN u.height    END,
        'weight',    CASE WHEN p.show_weight    THEN u.weight    END,
        'shoe_size', CASE WHEN p.show_shoe_size THEN u.shoe_size END,
        'instagram_id',   CASE WHEN p.show_instagram THEN u.instagram_id   END,
        'portfolio_link', CASE WHEN p.show_portfolio THEN u.portfolio_link END,
        'phone',     CASE WHEN p.show_phone     THEN u.phone     END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_profiles(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_detail(UUID, UUID) TO anon, authenticated;
