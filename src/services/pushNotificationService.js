import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { getUser } from './userService';

export const syncPushTokenWithSupabase = async (userId) => {
  if (!supabase) return;
  const token = localStorage.getItem('push_token');
  if (userId && token) {
    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          device_os: Capacitor.getPlatform()
        }, { onConflict: 'token' });
        
      if (error) console.error('Error saving push token:', error);
      else console.log('Push token synced to Supabase successfully');
    } catch (err) {
      console.error('Exception saving push token:', err);
    }
  }
};

export const initializePushNotifications = async () => {
  if (Capacitor.getPlatform() !== 'android' && Capacitor.getPlatform() !== 'ios') {
    console.log('Push notifications are only available on native devices.');
    return;
  }

  // Request permission
  const permStatus = await PushNotifications.requestPermissions();

  if (permStatus.receive === 'granted') {
    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();
  } else {
    console.warn('Push notification permission denied');
    return;
  }

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration success, token: ' + token.value);
    localStorage.setItem('push_token', token.value);
    
    const currentUser = getUser();
    const userId = currentUser?.id;
    
    // Save token to Supabase if user is logged in
    if (userId) {
      await syncPushTokenWithSupabase(userId);
    }
  });

  // Some issue with our setup and push will not work
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
  });

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    const data = notification.notification.data;
    console.log('Push action performed: ' + JSON.stringify(notification));
    
    // Route user to the appropriate page based on data payload
    if (data && data.route) {
      window.dispatchEvent(new CustomEvent('pushNotificationRoute', { detail: data.route }));
    }
  });
};

export const clearPushToken = async () => {
    // Logic to clear push token on logout if needed
};

/**
 * 관리자 전용: 전체 사용자에게 커스텀 푸시 알림 발송
 * @param {Object} param
 * @param {string} param.title - 푸시 알림 제목
 * @param {string} param.body  - 푸시 알림 내용
 * @param {string} param.route - 탭 후 이동할 라우트 (예: '/agency')
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const sendBroadcastPush = async ({ title, body, route = '/agency' }) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        table: 'custom',
        record: { title, body, route },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.error || '푸시 발송에 실패했습니다.' };
    }

    // 성공/실패 건수 집계
    const results = data?.results || [];
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return { success: true, data, successCount, failCount };
  } catch (err) {
    console.error('[sendBroadcastPush] error:', err);
    return { success: false, error: err.message || '알 수 없는 오류가 발생했습니다.' };
  }
};


/**
 * 관리자 전용: 푸시 발송 내역 조회
 * @param {number} limit - 조회할 최대 건수 (기본값: 10)
 * @returns {Promise<{data?: Array, error?: any}>}
 */
export const fetchPushHistory = async (limit = 10) => {
  if (!supabase) return { data: [], error: 'Supabase not initialized' };
  const { data, error } = await supabase
    .from('push_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
};

/**
 * 관리자 전용: 푸시 토큰 미등록 회원 목록 조회 (앱 미설치 추정)
 * @returns {Promise<{data?: Array, error?: any}>}
 */
export const fetchUsersWithoutPushToken = async () => {
  if (!supabase) return { data: [], error: 'Supabase not initialized' };

  // 1. 푸시 토큰이 등록된 user_id 목록
  const { data: tokenData, error: tokenError } = await supabase
    .from('user_push_tokens')
    .select('user_id');
  if (tokenError) return { data: [], error: tokenError };

  const registeredIds = [...new Set((tokenData || []).map(t => t.user_id))];

  // 2. 전화번호가 있는 전체 회원 조회
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('id, name, phone')
    .not('phone', 'is', null)
    .neq('phone', '');
  if (usersError) return { data: [], error: usersError };

  // 3. 클라이언트 측에서 미등록 필터링
  const noPushUsers = (allUsers || []).filter(u => !registeredIds.includes(u.id));
  return { data: noPushUsers, error: null };
};

/**
 * 관리자 전용: 전화번호가 있는 전체 회원 목록 조회
 * @returns {Promise<{data?: Array, error?: any}>}
 */
export const fetchAllUsersWithPhone = async () => {
  if (!supabase) return { data: [], error: 'Supabase not initialized' };
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone')
    .not('phone', 'is', null)
    .neq('phone', '');
  return { data: data || [], error };
};

