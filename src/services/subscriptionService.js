/**
 * subscriptionService.js
 * 골드모카 구독 관리 서비스
 */
import { supabase } from './supabaseClient';

/**
 * 구독 생성 (결제 성공 후 호출)
 */
export const createSubscription = async ({ userId, userNickname, planId, months, price, paymentKey, orderId }) => {
    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const { data, error } = await supabase
        .from('subscriptions')
        .insert([{
            user_id: userId,
            user_nickname: userNickname,
            plan_id: planId,
            months,
            price,
            payment_key: paymentKey,
            order_id: orderId,
            status: 'active',
            started_at: startedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
        }])
        .select()
        .single();

    return { data, error };
};

/**
 * 유저 등급을 GOLD로 업그레이드 (users 테이블 업데이트)
 */
export const upgradeUserToGold = async (userId, months) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const { error } = await supabase
        .from('users')
        .update({
            grade: 'GOLD',
            grade_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userId);

    return { error, expiresAt: expiresAt.toISOString() };
};

/**
 * 모든 구독 조회 (어드민용)
 */
export const fetchAllSubscriptions = async () => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*, users(phone)')
        .order('created_at', { ascending: false });

    // Flatten calculations to make it easier to usephone
    const flattened = (data || []).map(s => ({
        ...s,
        phone: s.users?.phone || ''
    }));

    return { data: flattened, error };
};

/**
 * 구독 상태 변경 (어드민용)
 */
export const updateSubscriptionStatus = async (subscriptionId, newStatus) => {
    const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

    return { error };
};

/**
 * 만료된 구독들을 일괄 처리 (expired로 변경)
 */
export const expireOverdueSubscriptions = async () => {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('expires_at', now)
        .select();

    // 만료된 유저들의 등급도 SILVER로 변경
    if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        for (const uid of userIds) {
            // 해당 유저의 다른 active 구독이 있는지 확인
            const { data: activeSubs } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', uid)
                .eq('status', 'active')
                .limit(1);

            if (!activeSubs || activeSubs.length === 0) {
                await supabase
                    .from('users')
                    .update({ grade: 'SILVER', grade_expires_at: null })
                    .eq('id', uid);
            }
        }
    }

    return { expired: data?.length || 0, error };
};

/**
 * 특정 유저의 활성 구독 조회
 */
export const fetchUserActiveSubscription = async (userId) => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('expires_at', { ascending: false })
        .limit(1)
        .single();

    return { data, error };
};
