/**
 * Audio Playback State Controller & Sticky Player Dock
 */

import { ttsPlayer } from '../services/tts/tts-engine.js';

export class AudioController {
  constructor(dom, state, showToastCallback) {
    this.dom = dom;
    this.state = state;
    this.showToastCallback = showToastCallback;

    const savedSpeed = parseFloat(localStorage.getItem('tts_speed'));
    this.currentSpeed = !isNaN(savedSpeed) ? savedSpeed : 1.0;
    this.updateSpeedUi(this.currentSpeed);
  }

  toggleAudioPlayback() {
    if (ttsPlayer.isPlaying) {
      ttsPlayer.pause();
      this.updatePlayButtonState(false);
    } else if (ttsPlayer.isPaused) {
      ttsPlayer.resume();
      this.updatePlayButtonState(true);
    } else {
      this.startAudioPlayback(0);
    }
  }

  startAudioPlayback(startIndex = 0) {
    if (this.state.currentChapterPages.length === 0) return;

    const page = this.state.currentChapterPages[this.state.currentPageIndex];
    const textToRead = this.state.currentLanguage === 'hi' ? page.textHi : page.textEn;

    this.updatePlayButtonState(true);

    ttsPlayer.speakText(
      textToRead,
      this.state.currentLanguage,
      (activeSentenceIdx) => {
        const sentenceSpans = this.dom.textContentBox.querySelectorAll('.sentence-item');
        sentenceSpans.forEach((span, i) => {
          if (i === activeSentenceIdx) {
            span.classList.add('active-reading');
            span.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            span.classList.remove('active-reading');
          }
        });
      },
      () => {
        this.updatePlayButtonState(false);
      },
      startIndex
    );
  }

  updatePlayButtonState(isPlaying) {
    if (this.dom.btnPlayMain) {
      this.dom.btnPlayMain.innerHTML = isPlaying ? '⏸' : '▶';
      this.dom.btnPlayMain.title = isPlaying ? 'Pause Reading' : 'Play Reading';
    }
  }

  changeSpeechSpeed(newSpeed) {
    this.currentSpeed = newSpeed;
    localStorage.setItem('tts_speed', newSpeed);
    ttsPlayer.setRate(newSpeed);
    this.updateSpeedUi(newSpeed);
    this.showToastCallback(`Speed: ${newSpeed.toFixed(1)}x`);
  }

  updateSpeedUi(speed) {
    if (this.dom.speedValueDisplay) {
      this.dom.speedValueDisplay.textContent = `${speed.toFixed(1)}x`;
    }
    if (this.dom.btnSpeedDec) {
      this.dom.btnSpeedDec.disabled = speed <= 0.1;
    }
    if (this.dom.btnSpeedInc) {
      this.dom.btnSpeedInc.disabled = speed >= 2.0;
    }
  }
}
