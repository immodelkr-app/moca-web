-- 20261108_02_public_profile_use_current_photos.sql
-- 공개 프로필 사진을 별도 업로드 대신 스마트프로필 사진(model_current_photos)으로 통일.
-- 대표사진 is_main 추가. 피드백 컬럼/테이블은 데이터 보존을 위해 그대로 둔다(화면에서만 제거).

ALTER TABLE public.model_current_photos ADD COLUMN IF NOT EXISTS is_main BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.model_public_profiles DROP COLUMN IF EXISTS photo_urls;

-- 목록: 공개 프로필 + 대표사진(없으면 최근 사진) + 공개허용 나이 + 조회수, 정렬(recent|views)
DROP FUNCTION IF EXISTS public.list_public_profiles(TEXT);
CREATE OR REPLACE FUNCTION public.list_public_profiles(p_gender TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'recent')
RETURNS TABLE (id UUID, display_name TEXT, gender TEXT, age TEXT, view_count INT, cover_url TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT p.id, p.display_name, p.gender,
        CASE WHEN p.show_age THEN u.age END, p.view_count,
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

-- 상세: photo_urls 를 model_current_photos 에서 (대표 먼저) 생성
CREATE OR REPLACE FUNCTION public.get_public_profile_detail(p_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    p public.model_public_profiles;
    u public.users;
    photos TEXT[];
BEGIN
    SELECT * INTO p FROM public.model_public_profiles WHERE id = p_id AND is_public = true;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT * INTO u FROM public.users WHERE id = p.user_id;
    SELECT COALESCE(array_agg(photo_url ORDER BY is_main DESC, created_at DESC), '{}') INTO photos
        FROM public.model_current_photos WHERE user_id = p.user_id;
    UPDATE public.model_public_profiles SET view_count = view_count + 1 WHERE id = p_id;
    RETURN json_build_object(
        'id', p.id, 'display_name', p.display_name, 'gender', p.gender,
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

GRANT EXECUTE ON FUNCTION public.list_public_profiles(TEXT, TEXT) TO anon, authenticated;
