import { useEffect, useRef } from 'react';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';
import { saveUser } from '../services/userService';

export const useAuthSync = () => {
    const isLoggedOutRef = useRef(false);
    const syncInProgressRef = useRef(false);
    // OAuth 콜백 여부 감지 (hash에 access_token이 있었는지)
    const isOAuthCallbackRef = useRef(
        window.location.hash.includes('access_token') ||
        window.location.search.includes('code=')
    );

    useEffect(() => {
        const enabled = isSupabaseEnabled();
        if (!enabled) return;

        // URL에서 OAuth hash fragment 제거 (히스토리 오염 방지)
        if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, null, window.location.pathname);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[useAuthSync] Event: ${event}, Session: ${!!session}, isOAuthCallback: ${isOAuthCallbackRef.current}`);

            if (event === 'SIGNED_OUT') {
                isLoggedOutRef.current = true;
                syncInProgressRef.current = false;
                return;
            }

            if (isLoggedOutRef.current) return;

            if (session?.user) {
                // SIGNED_IN: 명시적 로그인 → syncInProgress 무관하게 항상 처리
                // (다른 사람이 로그인하는 경우 이전 세션 오염 방지)
                if (event === 'SIGNED_IN') {
                    // 현재 localStorage 유저와 다른 사람이 로그인하면 즉시 클리어
                    const storedRaw = localStorage.getItem('i_model_user');
                    if (storedRaw) {
                        try {
                            const storedUser = JSON.parse(storedRaw);
                            if (storedUser?.id && storedUser.id !== session.user.id) {
                                console.log('[useAuthSync] Different user detected! Clearing stale session:', storedUser.id, '->', session.user.id);
                                localStorage.removeItem('i_model_user');
                            }
                        } catch (e) { /* ignore */ }
                    }
                    syncInProgressRef.current = true;
                    await syncAndRedirect(session, true);
                    syncInProgressRef.current = false;
                    return;
                }

                // INITIAL_SESSION / TOKEN_REFRESHED 등: 중복 실행 방지
                if (syncInProgressRef.current) return;

                // INITIAL_SESSION + OAuth 콜백: OAuth 복귀 후 세션 복원 → 리다이렉트 필요
                const shouldRedirect = event === 'INITIAL_SESSION' && isOAuthCallbackRef.current;

                // OAuth 콜백 플래그는 첫 번째 이벤트에서만 사용하고 리셋
                if (event === 'INITIAL_SESSION') {
                    isOAuthCallbackRef.current = false;
                }

                // INITIAL_SESSION에서도 다른 유저 세션 오염 방지
                if (event === 'INITIAL_SESSION') {
                    const storedRaw = localStorage.getItem('i_model_user');
                    if (storedRaw) {
                        try {
                            const storedUser = JSON.parse(storedRaw);
                            if (storedUser?.id && storedUser.id !== session.user.id) {
                                console.log('[useAuthSync] Stale session from different user on INITIAL_SESSION. Clearing.');
                                localStorage.removeItem('i_model_user');
                            }
                        } catch (e) { /* ignore */ }
                    }
                }

                syncInProgressRef.current = true;
                await syncAndRedirect(session, shouldRedirect);
                syncInProgressRef.current = false;
            }
        });

        async function syncAndRedirect(session, shouldRedirect) {
            const user = session.user;
            // 이메일 없는 소셜 유저(카카오 등)도 처리
            const email = (user.email || user.user_metadata?.email || '').toLowerCase();
            // 이메일이 없으면 uid 기반 임시 이메일 생성 (DB 저장용)
            const effectiveEmail = email || `social_${user.id.substring(0, 8)}@noemail.local`;

            try {
                // 1. 현재 UUID 계정 확인
                const { data: currentRecord } = await supabase
                    .from('users').select('*').eq('id', user.id).maybeSingle();

                // 2. 이메일로 기존 계정 검색 (이메일이 있는 경우만)
                let emailRecords = [];
                if (email) {
                    const { data: byEmail } = await supabase
                        .from('users').select('*').eq('email', email);
                    emailRecords = byEmail || [];
                }

                // 3. 가장 높은 등급 찾기
                const gradePriority = { VVIP: 4, VIP: 3, GOLD: 2, SILVER: 1, BASIC: 0 };
                let bestRecord = emailRecords.reduce((prev, curr) => {
                    return (gradePriority[curr.grade] || 0) > (gradePriority[prev?.grade] || 0) ? curr : prev;
                }, currentRecord);

                const bestGrade = bestRecord?.grade || 'SILVER';

                if (currentRecord) {
                    // 기존 소셜 계정이 있으면 등급만 업데이트
                    if (gradePriority[bestGrade] > (gradePriority[currentRecord.grade] || 0)) {
                        await supabase.from('users').update({ grade: bestGrade }).eq('id', user.id);
                        currentRecord.grade = bestGrade;
                    }
                    saveUser({ ...currentRecord, ...bestRecord, id: user.id });
                } else {
                    // 처음 로그인한 경우: 기존 계정 정보가 있으면 가져오고, 없으면 새로 생성
                    const rawNickname =
                        user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        (email ? email.split('@')[0] : `user_${user.id.substring(0, 6)}`);
                    const newUser = {
                        id: user.id,
                        nickname: bestRecord?.nickname || `${rawNickname.replace(/\s/g, '')}_${user.id.substring(0, 4)}`,
                        name: bestRecord?.name || rawNickname,
                        email: email || null,
                        grade: bestGrade,
                        joinedAt: new Date().toISOString()
                    };

                    const { data: created, error: insertError } = await supabase
                        .from('users').insert([newUser]).select().single();
                    if (insertError) {
                        console.warn('[useAuthSync] Insert failed, saving locally:', insertError.message);
                    }
                    saveUser(created || newUser);
                }

                console.log(`[useAuthSync] Sync complete. Grade: ${bestGrade}, shouldRedirect: ${shouldRedirect}`);

            } catch (err) {
                console.error('[useAuthSync] Sync failed:', err);
                // 동기화 실패해도 세션은 있으므로 최소한의 로컬 저장
                const rawNickname =
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    effectiveEmail.split('@')[0];
                saveUser({
                    id: user.id,
                    nickname: rawNickname,
                    name: rawNickname,
                    email: email || null,
                    grade: 'SILVER',
                });
            } finally {
                // 동기화 성공/실패 관계없이 shouldRedirect면 이동
                if (shouldRedirect) {
                    redirectToDashboard();
                }
            }
        }

        function redirectToDashboard() {
            const currentPath = window.location.pathname;
            // 메인 페이지나 로그인 페이지에 있을 때만 대시보드로 리다이렉트
            if (currentPath === '/' || currentPath === '/index.html' || currentPath.includes('login')) {
                console.log('[useAuthSync] Redirecting to dashboard...');
                window.location.replace('/home/dashboard');
            }
        }

        return () => subscription.unsubscribe();
    }, []);
};
