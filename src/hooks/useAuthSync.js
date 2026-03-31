import { useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';
import { saveUser, getUser, logoutUser } from '../services/userService';

/**
 * Supabase Auth 상태를 감시하고 로컬 세션과 동기화하는 훅
 * (소셜 로그인 성공 후 돌아왔을 때 세션 확보를 위해 필요)
 */
export const useAuthSync = () => {
    useEffect(() => {
        if (!isSupabaseEnabled()) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[useAuthSync] Auth Event:', event);

            if (event === 'SIGNED_IN' && session?.user) {
                const user = session.user;
                const email = user.email;
                
                // 기존 로컬 유저가 있는지 확인
                const localUser = getUser();
                if (localUser && (localUser.email === email || localUser.nickname === (user.user_metadata?.full_name || email.split('@')[0]))) {
                    // 이미 로그인된 상태나 다름없으므로 추가 처리 불필요하거나 업데이트
                    return;
                }

                // 1. DB에서 사용자 정보 조회 (이메일 기준)
                const { data: dbRows, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (dbRows && dbRows.length > 0) {
                    // 기가입자 -> 로컬 세션 저장
                    saveUser(dbRows[0]);
                    console.log('[useAuthSync] Existing user synced from DB:', email);
                    // 대시보드로 이동하거나 새로고침
                    window.location.reload(); 
                } else if (!error) {
                    // 미가입자 -> 새로운 레코드 생성 (간편가입)
                    const nickname = user.user_metadata?.full_name || email.split('@')[0];
                    const newUser = {
                        nickname,
                        name: user.user_metadata?.full_name || nickname,
                        email: email,
                        phone: '',
                        address: '',
                        grade: 'SILVER',
                        joinedAt: new Date().toISOString(),
                    };

                    const { data: created, error: insertErr } = await supabase
                        .from('users')
                        .insert([newUser])
                        .select()
                        .single();

                    if (!insertErr && created) {
                        saveUser(created);
                        console.log('[useAuthSync] New social user created:', email);
                        window.location.reload();
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                logoutUser();
                // window.location.href = '/';
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);
};
