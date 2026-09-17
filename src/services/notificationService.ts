import { COMPANY_LOGO } from './storageService';

export interface PushNotificationPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: string;
  type?: 'booking' | 'reminder' | 'status' | 'system' | 'driver_arrived';
}

type NotificationListener = (notification: PushNotificationPayload) => void;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class NotificationService {
  private listeners: NotificationListener[] = [];
  private permissionState: NotificationPermission = 'default';
  private inAppPushEnabled: boolean = true;
  private pushSubscribed: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        this.permissionState = Notification.permission;
      }
      const savedInApp = localStorage.getItem('adc_in_app_push_enabled');
      this.inAppPushEnabled = savedInApp !== null ? savedInApp === 'true' : true;

      // Automatically attempt to subscribe to Web Push if permission is already granted
      if (this.permissionState === 'granted') {
        this.registerWebPushSubscription().catch(() => {});
      }
    }
  }

  isInIframe(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  isNativePushSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && !this.isInIframe();
  }

  getPermission(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  isInAppPushEnabled(): boolean {
    return this.inAppPushEnabled;
  }

  setInAppPushEnabled(enabled: boolean) {
    this.inAppPushEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('adc_in_app_push_enabled', String(enabled));
    }
  }

  async requestPermission(): Promise<{ granted: boolean; isIframe: boolean; inAppActive: boolean }> {
    this.setInAppPushEnabled(true);

    if (this.isInIframe()) {
      return { granted: false, isIframe: true, inAppActive: true };
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { granted: false, isIframe: false, inAppActive: true };
    }

    try {
      const result = await Notification.requestPermission();
      this.permissionState = result;
      if (result === 'granted') {
        await this.registerWebPushSubscription();
      }
      return {
        granted: result === 'granted',
        isIframe: false,
        inAppActive: true
      };
    } catch (e) {
      console.warn('Push notification request error:', e);
      return { granted: false, isIframe: false, inAppActive: true };
    }
  }

  /**
   * Registers the browser's Service Worker with Web Push Manager so notifications
   * can be delivered through the device operating system even when the app is completely closed.
   */
  async registerWebPushSubscription(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.ready;

      // 1. Fetch server's VAPID public key
      const keyRes = await fetch('/api/push/vapid-key');
      const keyData = await keyRes.json();
      if (!keyData || !keyData.publicKey) {
        return false;
      }

      // 2. Check existing subscription or create new
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });
      }

      // 3. Send subscription to server registry
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: localStorage.getItem('adc_user_id') || undefined,
        }),
      });

      this.pushSubscribed = true;
      return true;
    } catch (err) {
      console.warn('Could not register background Web Push subscription:', err);
      return false;
    }
  }

  subscribe(listener: NotificationListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getVibrationPattern(type: PushNotificationPayload['type'] = 'booking'): number[] {
    switch (type) {
      case 'driver_arrived':
        return [250, 100, 250, 100, 400]; // Double automotive horn cadence
      case 'booking':
        return [70, 40, 110]; // Short joyful confirmation pulse
      case 'reminder':
        return [180, 80, 180, 80, 220]; // Triple reminder alert
      case 'status':
        return [120, 70, 120]; // Soft dual pulse
      case 'system':
      default:
        return [80]; // Subtle single haptic
    }
  }

  async sendMobileNotification(title: string, body: string, type: PushNotificationPayload['type'] = 'booking') {
    const payload: PushNotificationPayload = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title,
      body,
      icon: COMPANY_LOGO,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type
    };

    // 1. Trigger distinct device vibration if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(this.getVibrationPattern(type));
      } catch (e) {
        // ignore
      }
    }

    // 2. Play distinct notification sound for this specific notification type
    this.playNotificationSound(type);

    // 3. Deliver via Service Worker registration (native system notification tray)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        const swOptions: any = {
          body,
          icon: COMPANY_LOGO,
          badge: COMPANY_LOGO,
          tag: payload.id,
          requireInteraction: true,
          data: {
            url: '/',
            ...payload
          },
          actions: [
            { action: 'open_app', title: 'Open Shuttle App / فتح التطبيق' }
          ]
        };
        reg.showNotification(title, swOptions).catch((err) => {
          // Fallback to legacy Notification constructor if SW showNotification fails
          try {
            new Notification(title, { body, icon: COMPANY_LOGO });
          } catch (e) {}
        });
      }).catch(() => {});
    }

    // 4. Also trigger background Web Push on server so closed devices/phones receive it
    try {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          icon: COMPANY_LOGO,
          type,
          url: '/'
        }),
      }).catch(() => {});
    } catch (e) {}

    // 5. Notify in-app mobile push banner listeners (for active foreground screens)
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.error('Error dispatching notification listener:', e);
      }
    });
  }

  /**
   * Dispatches dedicated Driver Arrival notification with vehicle & driver details
   */
  async sendDriverArrivalNotification(
    driverName: string,
    pickupPoint: string = 'نقطة الركوب',
    busModel: string = 'الباص',
    busPlate?: string,
    driverPhone?: string
  ) {
    const title = 'وصل السائق الآن! 🚖 Driver Arrived';
    const plateText = busPlate ? ` [لوحة: ${busPlate}]` : '';
    const phoneText = driverPhone ? ` • هاتف: ${driverPhone}` : '';
    const body = `السائق (${driverName}) وصل الآن إلى ${pickupPoint} بسيارة ${busModel}${plateText}. يرجى التوجه لمكان الركوب فوراً${phoneText}.`;

    return this.sendMobileNotification(title, body, 'driver_arrived');
  }

  /**
   * Schedules a test notification to demonstrate background delivery when the app is closed.
   */
  async scheduleBackgroundTestNotification(delaySeconds: number = 6): Promise<void> {
    const title = 'وصل السائق الآن! 🚖 Driver Arrived';
    const body = 'السائق (احمد جوده) وصل الآن لنقطة الركوب بسيارة سوزوكي. هذا إشعار تم استلامه والتطبيق مغلق!';

    // Ensure SW is ready and register Web Push if not yet
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg.active) {
          reg.active.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            payload: {
              title,
              options: {
                body,
                tag: 'adc_test_closed_' + Date.now(),
                requireInteraction: true,
                vibrate: [300, 150, 300, 150, 300],
              },
              delayMs: delaySeconds * 1000,
            },
          });
        }
      } catch (err) {
        console.warn('SW message scheduling warning:', err);
      }
    }

    // Also trigger server Web Push timer so push network wakes the phone even if process died
    setTimeout(async () => {
      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            type: 'driver_arrived',
            url: '/',
          }),
        });
      } catch (e) {}
    }, delaySeconds * 1000);
  }

  isBackgroundPushSubscribed(): boolean {
    return this.pushSubscribed;
  }

  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return this.audioContext;
    } catch (e) {
      return null;
    }
  }

  /**
   * Synthesizes and plays a unique, distinct acoustic signature for each notification type:
   * - driver_arrived: Energetic two-tone automotive arrival horn chime
   * - booking: Rising 4-note major arpeggio celebrating seat reservation
   * - reminder: Resonant two-pulse station alert bell for departures
   * - status: Warm 3-step marimba progression for transit updates
   * - system: Subtle soft tech pop for UI events
   */
  playNotificationSound(type: PushNotificationPayload['type'] = 'booking') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      switch (type) {
        case 'driver_arrived': {
          // 🚖 Driver Arrival: Two-stage automotive chime fanfare (Beep-Beep flourish)
          // Stage 1: Dual horn chord
          const playHornChord = (freq1: number, freq2: number, startTime: number, duration: number, vol: number) => {
            [freq1, freq2].forEach((freq) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'triangle'; // Richer, warmer than pure sine
              osc.frequency.setValueAtTime(freq, startTime);

              gain.gain.setValueAtTime(0.001, startTime);
              gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
              gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(startTime);
              osc.stop(startTime + duration);
            });
          };

          // First beep (F4 + A4)
          playHornChord(349.23, 440.00, now, 0.12, 0.12);
          // Second resolving chime (G4 + C5 + high shimmer E5)
          playHornChord(392.00, 523.25, now + 0.16, 0.45, 0.14);

          // Sparkle overtone on final note
          const overtone = ctx.createOscillator();
          const overGain = ctx.createGain();
          overtone.type = 'sine';
          overtone.frequency.setValueAtTime(1046.50, now + 0.16); // High C6
          overGain.gain.setValueAtTime(0.05, now + 0.16);
          overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          overtone.connect(overGain);
          overGain.connect(ctx.destination);
          overtone.start(now + 0.16);
          overtone.stop(now + 0.55);
          break;
        }

        case 'booking': {
          // 🎫 Booking Confirmed: 4-note rising C-major triumphant sparkle arpeggio
          const notes = [
            { f: 523.25, d: 0.14, t: 0 },      // C5
            { f: 659.25, d: 0.14, t: 0.08 },   // E5
            { f: 783.99, d: 0.16, t: 0.16 },   // G5
            { f: 1046.50, d: 0.45, t: 0.24 }   // C6 with bell sustain
          ];

          notes.forEach(({ f, d, t }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + t);

            gain.gain.setValueAtTime(0.001, now + t);
            gain.gain.linearRampToValueAtTime(0.12, now + t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + t);
            osc.stop(now + t + d);
          });
          break;
        }

        case 'reminder': {
          // ⏰ Departure Reminder: Resonant 2-tone alert gong/bell (high-low station chime)
          const bells = [
            { f: 880.00, t: 0, d: 0.22, vol: 0.14 },    // A5
            { f: 587.33, t: 0.18, d: 0.50, vol: 0.15 }  // D5 resonant resolve
          ];

          bells.forEach(({ f, t, d, vol }) => {
            // Fundamental tone
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(f, now + t);
            gain1.gain.setValueAtTime(0.001, now + t);
            gain1.gain.linearRampToValueAtTime(vol, now + t + 0.02);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + t + d);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now + t);
            osc1.stop(now + t + d);

            // Metallic 2nd harmonic
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(f * 2, now + t);
            gain2.gain.setValueAtTime(vol * 0.35, now + t);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + t + (d * 0.6));
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + t);
            osc2.stop(now + t + (d * 0.6));
          });
          break;
        }

        case 'status': {
          // 📍 Status / Boarding: Warm 3-step marimba progression
          const steps = [
            { f: 440.00, t: 0, d: 0.14 },     // A4
            { f: 554.37, t: 0.10, d: 0.14 },  // C#5
            { f: 659.25, t: 0.20, d: 0.35 }   // E5
          ];

          steps.forEach(({ f, t, d }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + t);

            gain.gain.setValueAtTime(0.001, now + t);
            gain.gain.linearRampToValueAtTime(0.11, now + t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + t);
            osc.stop(now + t + d);
          });
          break;
        }

        case 'system':
        default: {
          // ⚙️ System Ping: Clean modern subtle micro-click / tech pop
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(740, now);
          osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);

          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }
      }
    } catch (e) {
      // AudioContext policy fallback
    }
  }
}

export const notificationService = new NotificationService();
