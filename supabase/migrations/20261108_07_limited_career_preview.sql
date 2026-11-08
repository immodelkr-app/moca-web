-- 20261108_07: 비인증 열람자에게도 이름/년생/광고모델경력/그외경력의 '앞부분'만 노출. 신체정보·연락처는 인증업체만.
-- 경력은 스마트프로필(users.career_ad / career_other)을 그대로 사용.
CREATE OR REPLACE FUNCTION public._career_preview(t TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT NULLIF(left(array_to_string((string_to_array(COALESCE(t, ''), E'\n'))[1:3], E'\n'), 150), '');
$$;

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
                                 'career_ad', public._career_preview(u.career_ad),
                                 'career_other', public._career_preview(u.career_other),
                                 'photo_urls', photos, 'view_count', p.view_count + 1, 'limited', true);
    END IF;

    RETURN json_build_object(
        'id', p.id, 'display_name', p.display_name, 'gender', p.gender, 'activity_year', u.age, 'limited', false,
        'intro', p.intro, 'specialties', p.specialties,
        'career_ad', u.career_ad, 'career_other', u.career_other,
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
GRANT EXECUTE ON FUNCTION public.get_public_profile_detail(UUID, UUID) TO anon, authenticated;
