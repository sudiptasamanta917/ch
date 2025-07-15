import Sound from 'react-native-sound';

// Enable playback in silence mode
Sound.setCategory('Playback');

const sounds = {
  move: new Sound('move.mp3', Sound.MAIN_BUNDLE),
  capture: new Sound('capture.mp3', Sound.MAIN_BUNDLE),
  check: new Sound('check.mp3', Sound.MAIN_BUNDLE),
  win: new Sound('win.mp3', Sound.MAIN_BUNDLE),
  lose: new Sound('lose.mp3', Sound.MAIN_BUNDLE),
  draw: new Sound('draw.mp3', Sound.MAIN_BUNDLE),
};

export const playSound = (type) => {
  if (sounds[type]) {
    sounds[type].play((success) => {
      if (!success) {
        console.log('Sound playback failed');
      }
    });
  }
};

export const stopSound = (type) => {
  if (sounds[type]) {
    sounds[type].stop();
  }
};

export const stopAllSounds = () => {
  Object.values(sounds).forEach(sound => sound.stop());
}; 