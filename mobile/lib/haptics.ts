import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback utility for mobile app
 * Provides consistent haptic feedback across the app
 */

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

const hapticEnabled = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Trigger haptic feedback
 */
export async function haptic(type: HapticType = 'light'): Promise<void> {
  if (!hapticEnabled) return;

  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch (err) {
    // Silently fail - haptics may not be available on all devices
    console.log('Haptic feedback not available:', err);
  }
}

/**
 * Pre-defined haptic patterns for common actions
 */
export const haptics = {
  // UI Interactions
  buttonPress: () => haptic('light'),
  tabChange: () => haptic('selection'),
  toggle: () => haptic('light'),

  // Battle actions
  recordingStart: () => haptic('medium'),
  recordingStop: () => haptic('heavy'),
  roundStart: () => haptic('heavy'),
  roundEnd: () => haptic('medium'),
  countdownTick: () => haptic('light'),

  // Voting
  vote: () => haptic('success'),

  // Results
  victory: async () => {
    await haptic('success');
    setTimeout(() => haptic('heavy'), 100);
    setTimeout(() => haptic('heavy'), 200);
  },
  defeat: () => haptic('error'),

  // Feedback
  success: () => haptic('success'),
  warning: () => haptic('warning'),
  error: () => haptic('error'),

  // Navigation
  navigate: () => haptic('selection'),
  back: () => haptic('light'),
};

/**
 * React hook for haptic feedback
 */
import { useCallback } from 'react';

export function useHaptics() {
  const trigger = useCallback((type: HapticType) => {
    haptic(type);
  }, []);

  return {
    trigger,
    ...haptics,
  };
}
