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

