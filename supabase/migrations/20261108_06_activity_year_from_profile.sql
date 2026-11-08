-- 20261108_06: 활동년생은 스마트프로필의 '활동나이 년도'(users.age)를 그대로 사용. 05에서 만든 별도 컬럼 제거.
DROP FUNCTION IF EXISTS public.list_public_profiles(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.list_public_profiles(p_gender TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'recent', p_viewer_id UUID DEFAULT NULL)
RETURNS TABLE (id UUID, display_name TEXT, gender TEXT, activity_year TEXT, view_count INT, cover_url TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT p.id, p.display_name, p.gender, u.age::TEXT, p.view_count,
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
    SELECT * INTO u FROM public.users WHERE id = p.user_id;

    IF NOT full_access THEN
        RETURN json_build_object('id', p.id, 'display_name', p.display_name, 'activity_year', u.age,
                                 'photo_urls', photos, 'view_count', p.view_count + 1, 'limited', true);
    END IF;

    RETURN json_build_object(
        'id', p.id, 'display_name', p.display_name, 'gender', p.gender, 'activity_year', u.age, 'limited', false,
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

ALTER TABLE public.model_public_profiles DROP COLUMN IF EXISTS activity_year;

GRANT EXECUTE ON FUNCTION public.list_public_profiles(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_detail(UUID, UUID) TO anon, authenticated;
