/**
 * Settings Panel Orchestrator
 * Opens/closes the left slide-in Settings drawer and wires up its sections:
 * AI Vision, Translation Language, Voice Accent, Offline Engine, Debug Logs.
 */

import { logger } from '../utils/logger.js';
import { openModal, closeModal } from '../views/navigation.js';
import { AiVisionSettings } from './settings/ai-vision-settings.js';
import { LanguageSettings } from './settings/language-settings.js';
import { VoiceSettings } from './settings/voice-settings.js';

export class SettingsController {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;

    this.aiVision = new AiVisionSettings(dom, showToastCallback);
    this.language = new LanguageSettings(dom, showToastCallback);
    this.voice = new VoiceSettings(dom, showToastCallback);

    this.aiVision.updateStatusBadge();
    this.initOfflineToggle();
    this.initDebugLogsButton();
    this.initMenuNavigation();
  }

  initOfflineToggle() {
    if (!this.dom.checkPreferOffline) return;
    this.dom.checkPreferOffline.checked = localStorage.getItem('prefer_offline_ocr') === 'true';
    this.dom.checkPreferOffline.addEventListener('change', (e) => {
      localStorage.setItem('prefer_offline_ocr', e.target.checked ? 'true' : 'false');
      this.showToastCallback(e.target.checked ? 'Offline scanning preferred ⚡' : 'AI Vision scanning re-enabled ✨');
    });
  }

  initDebugLogsButton() {
    this.dom.btnOpenDebugLogs?.addEventListener('click', () => logger.show());
  }

  initMenuNavigation() {
    document.querySelectorAll('#modalSettingsPanel [data-open-stage]').forEach(btn => {
      btn.addEventListener('click', () => this.showStage(btn.dataset.openStage));
    });
    document.querySelectorAll('#modalSettingsPanel [data-back-to-menu]').forEach(btn => {
      btn.addEventListener('click', () => this.showMenu());
    });
  }

  showStage(stageId) {
    this.dom.settingsMenuStage.style.display = 'none';
    [this.dom.stageAiVision, this.dom.stageLanguage, this.dom.stageVoice].forEach(stage => {
      if (stage) stage.style.display = stage.id === stageId ? 'block' : 'none';
    });
  }

  showMenu() {
    [this.dom.stageAiVision, this.dom.stageLanguage, this.dom.stageVoice].forEach(stage => {
      if (stage) stage.style.display = 'none';
    });
    this.dom.settingsMenuStage.style.display = 'block';
  }

  openSettingsPanel() {
    this.showMenu();
    this.aiVision.refreshOnOpen();
    this.language.refreshOnOpen();
    this.voice.refreshOnOpen();
    openModal(this.dom.modalSettingsPanel);
  }

  closeSettingsPanel() {
    closeModal(this.dom.modalSettingsPanel);
  }

  handleSaveAiKey() {
    // Unlike the old single-purpose modal, saving no longer auto-closes the panel -
    // the drawer now holds four other sections the user may still want to visit.
    this.aiVision.handleSaveKey();
  }

  handleClearAiKey() {
    this.aiVision.handleClearKey();
  }

  handleTestAiKey() {
    this.aiVision.handleTestKey();
  }
}
