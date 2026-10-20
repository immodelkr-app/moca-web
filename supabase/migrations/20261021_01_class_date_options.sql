-- 모카클래스 날짜 옵션: 한 클래스에 여러 날짜를 두고 신청자가 1개 이상 선택, 날짜별 정원 관리
-- classes.date_options        : [{ id, label, date, time, capacity }]  (NULL/빈배열이면 기존 단일 일정 방식)
-- class_applications.selected_dates : [{ id, label }]                  (신청자가 고른 날짜)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS date_options JSONB;
ALTER TABLE public.class_applications ADD COLUMN IF NOT EXISTS selected_dates JSONB;

-- 날짜별 정원 서버 검증 (동시 신청 경합 방지: 클래스 단위 advisory lock)
CREATE OR REPLACE FUNCTION public.check_class_date_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    opts JSONB;
    sel  JSONB;
    cap  INT;
    used INT;
BEGIN
    IF NEW.approval_status NOT IN ('pending', 'approved', 'paid') THEN RETURN NEW; END IF;
    IF NEW.selected_dates IS NULL OR jsonb_array_length(NEW.selected_dates) = 0 THEN RETURN NEW; END IF;

    SELECT date_options INTO opts FROM public.classes WHERE id = NEW.class_id;
    IF opts IS NULL OR jsonb_array_length(opts) = 0 THEN RETURN NEW; END IF;

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

DROP TRIGGER IF EXISTS trg_check_class_date_capacity ON public.class_applications;
CREATE TRIGGER trg_check_class_date_capacity
    BEFORE INSERT OR UPDATE ON public.class_applications
    FOR EACH ROW EXECUTE FUNCTION public.check_class_date_capacity();
