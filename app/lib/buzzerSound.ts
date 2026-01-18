/**
 * Plays the buzzer sound effect from audio file
 * Returns a promise that resolves when the sound finishes playing
 */
export function playBuzzerSound(): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio('/sounds/buzzer.mp3');

    audio.onended = () => {
      resolve();
    };

    audio.onerror = (error) => {
      console.error('Error playing buzzer:', error);
      reject(error);
    };

    audio.play().catch((error) => {
      console.error('Error playing buzzer:', error);
      reject(error);
    });
  });
}
