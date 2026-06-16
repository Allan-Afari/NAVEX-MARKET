import { Capacitor } from '@capacitor/core';

// Optional Capacitor plugins - these need to be installed separately
// import { LocalNotifications } from '@capacitor/local-notifications';
// import { PushNotifications } from '@capacitor/push-notifications';
// import { StatusBar } from '@capacitor/status-bar';
// import { SplashScreen } from '@capacitor/splash-screen';
// import { Device } from '@capacitor/device';
// import { App } from '@capacitor/app';
// import { Network } from '@capacitor/network';

/**
 * Check if running on native platform
 */
export const isNative = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if running on Android
 */
export const isAndroid = () => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if running on iOS
 */
export const isIOS = () => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if running on web
 */
export const isWeb = () => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Get device information
 */
export const getDeviceInfo = async () => {
  if (!isNative()) {
    return {
      platform: 'web',
      model: 'Web Browser',
      osVersion: 'Unknown',
      appVersion: '1.0.0',
    };
  }

  // Requires @capacitor/device plugin
  // const info = await Device.getInfo();
  return {
    platform: Capacitor.getPlatform(),
    model: 'Native Device',
    osVersion: 'Unknown',
    appVersion: '1.0.0',
  };
};

/**
 * Request local notification permissions
 * Requires @capacitor/local-notifications plugin
 */
export const requestNotificationPermissions = async () => {
  if (!isNative()) return false;
  // Plugin not installed, return false
  return false;
};

/**
 * Schedule a local notification
 * Requires @capacitor/local-notifications plugin
 */
export const scheduleNotification = async (
  title: string,
  body: string,
  scheduleAt?: Date,
  id?: number
) => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Schedule notification (plugin not installed):', title);
};

/**
 * Cancel a notification
 * Requires @capacitor/local-notifications plugin
 */
export const cancelNotification = async (id: number) => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Cancel notification (plugin not installed):', id);
};

/**
 * Cancel all notifications
 * Requires @capacitor/local-notifications plugin
 */
export const cancelAllNotifications = async () => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Cancel all notifications (plugin not installed)');
};

/**
 * Initialize push notifications
 * Requires @capacitor/push-notifications plugin
 */
export const initializePushNotifications = async () => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Initialize push notifications (plugin not installed)');
};

/**
 * Set status bar style
 * Requires @capacitor/status-bar plugin
 */
export const setStatusBarStyle = async (style: 'dark' | 'light') => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Set status bar style (plugin not installed):', style);
};

/**
 * Hide splash screen
 * Requires @capacitor/splash-screen plugin
 */
export const hideSplashScreen = async () => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Hide splash screen (plugin not installed)');
};

/**
 * Show splash screen
 * Requires @capacitor/splash-screen plugin
 */
export const showSplashScreen = async () => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Show splash screen (plugin not installed)');
};

/**
 * Add app state listener
 * Requires @capacitor/app plugin
 */
export const addAppStateListener = (callback: (state: { isActive: boolean }) => void) => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Add app state listener (plugin not installed)');
};

/**
 * Get network status
 * Requires @capacitor/network plugin
 */
export const getNetworkStatus = async () => {
  if (!isNative()) {
    return { connected: true, connectionType: 'wifi' };
  }
  // Plugin not installed, return default
  return { connected: true, connectionType: 'unknown' };
};

/**
 * Add network status listener
 * Requires @capacitor/network plugin
 */
export const addNetworkStatusListener = (callback: (status: { connected: boolean; connectionType: string }) => void) => {
  if (!isNative()) return;
  // Plugin not installed, do nothing
  console.log('Add network status listener (plugin not installed)');
};

/**
 * Vibrate device
 */
export const vibrate = async (duration: number) => {
  if (!isNative()) return;

  try {
    // This requires the @capacitor/haptics plugin
    // await Haptics.vibrate({ duration });
    console.log('Vibrate for', duration, 'ms');
  } catch (error) {
    console.error('Error vibrating device:', error);
  }
};

/**
 * Share content
 */
export const shareContent = async (title: string, text: string, url?: string) => {
  if (!isNative()) {
    // Fallback to web share API
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (error) {
        console.error('Error sharing on web:', error);
        return false;
      }
    }
    return false;
  }

  try {
    // This requires the @capacitor/share plugin
    // await Share.share({ title, text, url, dialogTitle: title });
    console.log('Share:', title, text, url);
    return true;
  } catch (error) {
    console.error('Error sharing:', error);
    return false;
  }
};

/**
 * Copy to clipboard
 */
export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

/**
 * Open external link
 */
export const openExternalLink = async (url: string) => {
  try {
    // This requires the @capacitor/browser plugin
    // await Browser.open({ url });
    window.open(url, '_blank');
  } catch (error) {
    console.error('Error opening external link:', error);
  }
};

/**
 * Get current app version
 * Requires @capacitor/device plugin
 */
export const getAppVersion = async () => {
  if (!isNative()) return '1.0.0';
  // Plugin not installed, return default
  return '1.0.0';
};

/**
 * Check for app updates
 */
export const checkForUpdates = async () => {
  if (!isNative()) return false;

  try {
    // This would integrate with your update mechanism
    // For now, return false
    return false;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
};

/**
 * Initialize mobile app
 */
export const initializeMobileApp = async () => {
  if (!isNative()) return;

  try {
    // Set status bar style
    await setStatusBarStyle('dark');

    // Hide splash screen after a delay
    setTimeout(async () => {
      await hideSplashScreen();
    }, 2000);

    // Initialize push notifications
    await initializePushNotifications();

    // Add network status listener
    addNetworkStatusListener((status) => {
      console.log('Network status changed:', status);
    });

    console.log('Mobile app initialized');
  } catch (error) {
    console.error('Error initializing mobile app:', error);
  }
};
