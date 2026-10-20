-- 날짜 옵션 선택 방식: 'multi'(1개 이상 선택 가능) | 'single'(1개만 선택)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS date_select_mode TEXT NOT NULL DEFAULT 'multi';

-- 단일 선택 클래스는 서버에서도 1개만 허용 (기존 정원 검사 함수에 추가)
CREATE OR REPLACE FUNCTION public.check_class_date_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    opts JSONB;
    mode TEXT;
    sel  JSONB;
    cap  INT;
    used INT;
BEGIN
    IF NEW.approval_status NOT IN ('pending', 'approved', 'paid') THEN RETURN NEW; END IF;
    IF NEW.selected_dates IS NULL OR jsonb_array_length(NEW.selected_dates) = 0 THEN RETURN NEW; END IF;

    SELECT date_options, date_select_mode INTO opts, mode FROM public.classes WHERE id = NEW.class_id;
    IF opts IS NULL OR jsonb_array_length(opts) = 0 THEN RETURN NEW; END IF;

    IF mode = 'single' AND jsonb_array_length(NEW.selected_dates) > 1 THEN
        RAISE EXCEPTION '이 클래스는 날짜를 1개만 선택할 수 있습니다.';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(NEW.class_id::text));

    FOR sel IN SELECT * FROM jsonb_array_elements(NEW.selected_dates) LOOP
        SELECT (o->>'capacity')::INT INTO cap
          FROM jsonb_array_elements(opts) o WHERE o->>'id' = sel->>'id';
        IF cap IS NULL THEN
            RAISE EXCEPTION '존재하지 않는 날짜 옵션입니다.';
        END IF;

        SELECT count(*) INTO used
          FROM public.class_applications a
         WHERE a.class_id = NEW.class_id
           AND a.id IS DISTINCT FROM NEW.id
           AND a.user_id IS DISTINCT FROM NEW.user_id
           AND a.approval_status IN ('pending', 'approved', 'paid')
           AND a.selected_dates @> jsonb_build_array(jsonb_build_object('id', sel->>'id'));

        IF used >= cap THEN
            RAISE EXCEPTION '% 일정은 정원이 마감되었습니다.', sel->>'label';
        END IF;
    END LOOP;
    RETURN NEW;
END $$;

-- 방금 개설한 클래스(10/27·11/1)는 단일 선택으로 설정
UPDATE public.classes SET date_select_mode = 'single' WHERE id = 'eaef8274-e975-4e59-a94d-56d41e6b5e38';
