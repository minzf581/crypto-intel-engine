import useSound from 'use-sound';
import { useCallback } from 'react';

// Import sound files (you'll need to add these to public/sounds/)
const SOUND_PATHS = {
  default: '/sounds/notification-default.mp3',
  bell: '/sounds/notification-bell.mp3',
  chime: '/sounds/notification-chime.mp3',
  alert: '/sounds/notification-alert.mp3',
};

export type SoundType = keyof typeof SOUND_PATHS;

export const useNotificationSounds = () => {
  const [playDefault] = useSound(SOUND_PATHS.default);
  const [playBell] = useSound(SOUND_PATHS.bell);
  const [playChime] = useSound(SOUND_PATHS.chime);
  const [playAlert] = useSound(SOUND_PATHS.alert);

  const playSound = useCallback((soundType: SoundType, priority: string = 'medium') => {
    // Don't play sound if user has disabled audio
    if (!('Audio' in window)) return;

    try {
      // Adjust volume based on priority
      const volume = priority === 'critical' ? 1.0 : priority === 'high' ? 0.8 : 0.6;

      switch (soundType) {
        case 'bell':
          playBell();
          break;
        case 'chime':
          playChime();
          break;
        case 'alert':
          playAlert();
          break;
        default:
          playDefault();
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, [playDefault, playBell, playChime, playAlert]);

  const playPrioritySound = useCallback((priority: string) => {
    switch (priority) {
      case 'critical':
        playSound('alert', priority);
        break;
      case 'high':
        playSound('bell', priority);
        break;
      default:
        playSound('default', priority);
    }
  }, [playSound]);

  return {
    playSound,
    playPrioritySound,
  };
}; 