/**
 * quizService.js
 * 김대표퀴즈 게시판 - 퀴즈 생성/제출/채점(수동)/결과발표
 *
 * 퀴즈 1건은 문제 1~N개(운영은 보통 1~2개)를 담을 수 있다.
 * quiz_posts.questions = [{ id, question, questionType, choices }]  (정답 미포함, 공개 안전)
 * quiz_posts.correct_answers = { [questionId]: 정답텍스트 }         (관리자 전용, 절대 공개 select 금지)
 * quiz_submissions.answers = { [questionId]: 제출한 답변텍스트 }     (사용자 1인당 1행, 문제별 답변을 묶어서 저장)
 *
 * SECURITY NOTE:
 * 이 앱은 auth.uid() 기반 세션이 없는 닉네임/비밀번호 로그인 구조라,
 * RLS로 관리자와 일반 사용자를 구분할 수 없다 (quiz_posts/quiz_submissions
 * RLS는 둘 다 TO public USING/WITH CHECK (true)).
 * 따라서 정답(correct_answers) 비공개는 RLS가 아니라 "발표 전에는 클라이언트가
 * correct_answers 컬럼을 아예 select하지 않는다"는 규칙으로만 지켜진다.
 * fetchOpenQuizzes / fetchQuizDetail은 절대 correct_answers를 select하면 안 된다.
 * (알려진 한계: 서버가 아니라 클라이언트 쿼리 수준의 방어이며, 완전한 보안은 아님)
 */
import { supabase } from './supabaseClient';

const SAFE_QUIZ_COLUMNS =
    'id, questions, prize_description, status, winner_nicknames, created_at, closed_at, announced_at';

/** 문제 배열 정규화: question/questionType/choices만 남기고 각 문제에 id 부여 */
export const buildQuestions = (rawQuestions) =>
    rawQuestions.map((q, idx) => ({
        id: q.id || `q${idx + 1}`,
        question: q.question,
        questionType: q.questionType,
        choices: q.questionType === 'multiple_choice' ? q.choices : null,
    }));

// ─────────────────────────────────────────────
//  사용자용
// ─────────────────────────────────────────────

/** 공개 퀴즈 목록 (correct_answers 절대 미포함) */
export const fetchOpenQuizzes = async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('quiz_posts')
        .select(SAFE_QUIZ_COLUMNS)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('[quizService] fetchOpenQuizzes error:', error);
        return [];
    }
    return data || [];
};

/** 퀴즈 상세 (correct_answers 절대 미포함) */
export const fetchQuizDetail = async (quizId) => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('quiz_posts')
        .select(SAFE_QUIZ_COLUMNS)
        .eq('id', quizId)
        .single();
    if (error) {
        console.error('[quizService] fetchQuizDetail error:', error);
        return null;
    }
    return data;
};

/** 내가 이 퀴즈에 이미 제출했는지 + 내 답변(문제별) 조회 */
export const fetchMySubmission = async (quizId, userNickname) => {
    if (!supabase || !userNickname) return null;
    const { data, error } = await supabase
        .from('quiz_submissions')
        .select('id, answers, is_winner, created_at')
        .eq('quiz_id', quizId)
        .eq('user_nickname', userNickname)
        .maybeSingle();
    if (error) {
        console.error('[quizService] fetchMySubmission error:', error);
        return null;
    }
    return data;
};

/** 답변 제출 (문제별 답변을 { [questionId]: 답변텍스트 } 형태로 한 번에 제출, 중복 제출은 호출부에서 error.code === '23505'로 처리) */
export const submitAnswer = async (quizId, userNickname, answers) => {
    if (!supabase) return { submission: null, error: new Error('Supabase 미설정') };
    const { data, error } = await supabase
        .from('quiz_submissions')
        .insert([{ quiz_id: quizId, user_nickname: userNickname, answers }])
        .select()
        .single();
    if (error) {
        console.error('[quizService] submitAnswer error:', error);
        return { submission: null, error };
    }
    return { submission: data, error: null };
};

/**
 * 발표된(status='announced') 퀴즈만 correct_answers 포함 조회.
 * status 조건을 서버 쿼리에 넣어, 발표 전 실수로 호출해도 결과가 비어 정답이 새지 않도록 이중 방어.
 */
export const fetchAnnouncedQuizDetail = async (quizId) => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('quiz_posts')
        .select(`${SAFE_QUIZ_COLUMNS}, correct_answers`)
        .eq('id', quizId)
        .eq('status', 'announced')
        .maybeSingle();
    if (error) {
        console.error('[quizService] fetchAnnouncedQuizDetail error:', error);
        return null;
    }
    return data;
};

// ─────────────────────────────────────────────
//  관리자 전용 (AdminPage 비밀번호 게이트 뒤에서만 호출)
// ─────────────────────────────────────────────

/** 퀴즈 생성 (문제 1~N개) */
export const createQuiz = async ({ questions, prizeDescription }) => {
    if (!supabase) return { quiz: null, error: new Error('Supabase 미설정') };
    const normalized = buildQuestions(questions);
    const correctAnswers = {};
    questions.forEach((q, idx) => {
        correctAnswers[normalized[idx].id] = q.correctAnswer;
    });

    const { data, error } = await supabase
        .from('quiz_posts')
        .insert([{
            questions: normalized,
            correct_answers: correctAnswers,
            prize_description: prizeDescription,
            status: 'open',
        }])
        .select()
        .single();
    if (error) {
        console.error('[quizService] createQuiz error:', error);
        return { quiz: null, error };
    }
    return { quiz: data, error: null };
};

/** 전체 퀴즈 목록 (correct_answers 포함 — 관리자 전용 화면이므로 select('*') 허용) */
export const fetchAllQuizzesForAdmin = async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('quiz_posts')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('[quizService] fetchAllQuizzesForAdmin error:', error);
        return [];
    }
    return data || [];
};

/** 특정 퀴즈의 전체 제출 목록 (문제별 답변 포함) */
export const fetchSubmissions = async (quizId) => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });
    if (error) {
        console.error('[quizService] fetchSubmissions error:', error);
        return [];
    }
    return data || [];
};

/** 특정 제출을 당첨/취소로 표시 */
export const markWinner = async (submissionId, isWinner) => {
    if (!supabase) return { error: new Error('Supabase 미설정') };
    const { error } = await supabase
        .from('quiz_submissions')
        .update({ is_winner: isWinner })
        .eq('id', submissionId);
    if (error) {
        console.error('[quizService] markWinner error:', error);
    }
    return { error };
};

/** 퀴즈 마감 (선택적 중간 상태 — open -> closed) */
export const closeQuiz = async (quizId) => {
    if (!supabase) return { error: new Error('Supabase 미설정') };
    const { error } = await supabase
        .from('quiz_posts')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', quizId);
    if (error) {
        console.error('[quizService] closeQuiz error:', error);
    }
    return { error };
};

/**
 * 결과 발표 — is_winner=true인 제출들의 닉네임을 winner_nicknames에 스냅샷하고
 * status='announced'로 전환한다. 이 시점부터 fetchAnnouncedQuizDetail로 correct_answers 조회 가능.
 */
export const publishResults = async (quizId) => {
    if (!supabase) return { error: new Error('Supabase 미설정') };

    const { data: winners, error: fetchErr } = await supabase
        .from('quiz_submissions')
        .select('user_nickname')
        .eq('quiz_id', quizId)
        .eq('is_winner', true);
    if (fetchErr) {
        console.error('[quizService] publishResults fetch winners error:', fetchErr);
        return { error: fetchErr };
    }

    const winnerNicknames = (winners || []).map((w) => w.user_nickname);

    const { error } = await supabase
        .from('quiz_posts')
        .update({
            status: 'announced',
            announced_at: new Date().toISOString(),
            winner_nicknames: winnerNicknames,
        })
        .eq('id', quizId);
    if (error) {
        console.error('[quizService] publishResults error:', error);
    }
    return { error };
};
