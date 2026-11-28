import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/** Short, local sound effects used throughout the learning experience. */
export type SoundEffect = 'drop' | 'correct' | 'correctFinal' | 'fail' | 'failFinal';

const SOURCES: Record<SoundEffect, number> = {
  drop: require('../../assets/sounds/Drop element.m4a'),
  correct: require('../../assets/sounds/Correct.m4a'),
  correctFinal: require('../../assets/sounds/Correct 2.m4a'),
  fail: require('../../assets/sounds/Fail 2.m4a'),
  failFinal: require('../../assets/sounds/Fail.m4a'),
};

type AudioPlayer = ReturnType<typeof createAudioPlayer>;

const players: Partial<Record<SoundEffect, AudioPlayer>> = {};
let audioModeStarted = false;

function ensureAudioMode(): void {
  if (audioModeStarted) return;
  audioModeStarted = true;
  void setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  }).catch(() => {
    // Sound effects are non-critical; a platform without an audio session should
    // not interrupt the action that triggered the effect.
  });
}

function warn(effect: SoundEffect, error: unknown) {
  // Silent by design in release, but in development a missing sound should say why.
  if (__DEV__) console.warn(`[sounds] ${effect} could not play:`, error);
}

function playerFor(effect: SoundEffect): AudioPlayer {
  return players[effect] ?? (players[effect] = createAudioPlayer(SOURCES[effect], { keepAudioSessionActive: true }));
}

/** Loads every effect ahead of time, so the first tap in a lesson is not the one that stays silent. */
export function preloadSounds(): void {
  ensureAudioMode();
  for (const effect of Object.keys(SOURCES) as SoundEffect[]) {
    try {
      playerFor(effect);
    } catch (error) {
      warn(effect, error);
    }
  }
}

/**
 * Plays a local effect from the start. Playback errors never reach the screen: the app has to
 * stay usable when the device is muted or the audio session is unavailable.
 */
export function playSound(effect: SoundEffect): void {
  ensureAudioMode();
  try {
    const player = playerFor(effect);
    // Rewind and play right away. Waiting for the rewind to finish could leave the sound
    // unplayed when the player was still loading.
    void Promise.resolve(player.seekTo(0)).catch((error) => warn(effect, error));
    player.play();
  } catch (error) {
    warn(effect, error);
  }
}
