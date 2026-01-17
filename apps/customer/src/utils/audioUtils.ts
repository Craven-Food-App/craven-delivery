// Audio utility functions for notification sounds

/**
 * Generates a beep sound programmatically using Web Audio API
 */
export const generateBeep = (frequency: number = 800, duration: number = 300): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);

      oscillator.onended = () => {
        audioContext.close();
        resolve();
      };
    } catch (error) {
      console.error('Error generating beep:', error);
      resolve();
    }
  });
};

/**
 * Plays an audio file with fallback to generated beep
 */
export const playAudioFile = async (soundFile: string): Promise<void> => {
  try {
    const audio = new Audio(soundFile);
    
    // Set up promise-based audio loading and playing
    return new Promise((resolve, reject) => {
      audio.onloadeddata = () => {
        audio.play()
          .then(() => {
            audio.onended = () => resolve();
          })
          .catch(reject);
      };
      
      audio.onerror = () => {
        console.warn(`Failed to load audio file: ${soundFile}, falling back to generated beep`);
        generateBeep().then(resolve);
      };
      
      // Fallback timeout
      setTimeout(() => {
        console.warn('Audio loading timeout, falling back to generated beep');
        generateBeep().then(resolve);
      }, 2000);
    });
  } catch (error) {
    console.warn('Audio playback failed, using generated beep:', error);
    return generateBeep();
  }
};

/**
 * Plays notification sound with repeat functionality
 */
export const playNotificationSound = async (
  soundFile: string,
  repeatCount: number = 1,
  repeatInterval: number = 1000
): Promise<void> => {
  try {
    for (let i = 0; i < repeatCount; i++) {
      await playAudioFile(soundFile);
      
      // Wait between repeats (except for the last one)
      if (i < repeatCount - 1) {
        await new Promise(resolve => setTimeout(resolve, repeatInterval));
      }
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
    // Final fallback - just play a single beep
    await generateBeep();
  }
};

/**
 * Common notification sound presets
 */
export const NotificationSounds = {
  BEEP_SHORT: () => generateBeep(800, 200),
  BEEP_LONG: () => generateBeep(800, 500),
  BEEP_HIGH: () => generateBeep(1200, 300),
  BEEP_LOW: () => generateBeep(400, 300),
  DOUBLE_BEEP: () => playNotificationSound('', 2, 200), // Will use generated beeps
};