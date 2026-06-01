-- 022_class_feedback_system.sql
-- 모카 클래스 완료 관리 + 피드백 시스템

-- 1. classes 테이블에 상태 관련 컬럼 추가
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  -- status: 'active' (진행중/모집중) | 'completed' (완료) | 'cancelled' (취소)
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS thank_you_sent_at TIMESTAMPTZ;

-- status 인덱스
CREATE INDEX IF NOT EXISTS idx_classes_status ON public.classes (status);

-- 2. class_feedback 테이블 생성
CREATE TABLE IF NOT EXISTS public.class_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    image_url TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    admin_reply TEXT,
    admin_replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(class_id, user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_class_feedback_class_id ON public.class_feedback (class_id);
CREATE INDEX IF NOT EXISTS idx_class_feedback_user_id ON public.class_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_class_feedback_is_visible ON public.class_feedback (is_visible);

-- 3. RLS 활성화
ALTER TABLE public.class_feedback ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
-- 공개 피드백은 모든 인증 유저가 읽기 가능
DROP POLICY IF EXISTS "Feedback public read" ON public.class_feedback;
CREATE POLICY "Feedback public read" ON public.class_feedback
    FOR SELECT TO authenticated
    USING (is_visible = true);

-- 어드민은 모든 피드백 읽기 가능 (비공개 포함)
DROP POLICY IF EXISTS "Admin read all feedback" ON public.class_feedback;
CREATE POLICY "Admin read all feedback" ON public.class_feedback
    FOR SELECT TO authenticated
    USING (true);

-- 인증 유저는 본인 피드백 작성 가능
DROP POLICY IF EXISTS "Users insert own feedback" ON public.class_feedback;
CREATE POLICY "Users insert own feedback" ON public.class_feedback
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 인증 유저는 본인 피드백 수정 가능
DROP POLICY IF EXISTS "Users update own feedback" ON public.class_feedback;
CREATE POLICY "Users update own feedback" ON public.class_feedback
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 어드민 피드백 수정 (공개/비공개, 답변, 삭제)
DROP POLICY IF EXISTS "Admin update feedback" ON public.class_feedback;
CREATE POLICY "Admin update feedback" ON public.class_feedback
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- 어드민 피드백 삭제
DROP POLICY IF EXISTS "Admin delete feedback" ON public.class_feedback;
CREATE POLICY "Admin delete feedback" ON public.class_feedback
    FOR DELETE TO authenticated
    USING (true);

-- 5. classes 테이블 어드민 update 정책 (status 변경용)
DROP POLICY IF EXISTS "Admin update classes status" ON public.classes;
CREATE POLICY "Admin update classes status" ON public.classes
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. classes INSERT/DELETE 어드민 정책 (없으면 추가)
DROP POLICY IF EXISTS "Admin insert classes" ON public.classes;
CREATE POLICY "Admin insert classes" ON public.classes
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin delete classes" ON public.classes;
CREATE POLICY "Admin delete classes" ON public.classes
    FOR DELETE TO authenticated
    USING (true);
