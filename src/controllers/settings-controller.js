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
import { OfflineEngineSettings } from './settings/offline-engine-settings.js';

export class SettingsController {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;

    this.aiVision = new AiVisionSettings(dom, showToastCallback);
    this.offlineEngine = new OfflineEngineSettings(dom, showToastCallback);
    this.language = new LanguageSettings(dom, showToastCallback);
    this.voice = new VoiceSettings(dom, showToastCallback);

    this.aiVision.updateStatusBadge();
    this.initDebugLogsButton();
    this.initMenuNavigation();
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

  get detailStages() {
    return [this.dom.stageAiVision, this.dom.stageLanguage, this.dom.stageVoice, this.dom.stageOffline];
  }

  get stageSections() {
    return {
      stageAiVision: this.aiVision,
      stageLanguage: this.language,
      stageVoice: this.voice,
      stageOffline: this.offlineEngine
    };
  }

  showStage(stageId) {
    this.dom.settingsMenuStage.style.display = 'none';
    this.detailStages.forEach(stage => {
      if (stage) stage.style.display = stage.id === stageId ? 'block' : 'none';
    });
    // Re-run this section's refresh so state changed in another stage during the
    // same panel session (e.g. toggling Offline Engine, then opening Language) shows up.
    this.stageSections[stageId]?.refreshOnOpen();
  }

  showMenu() {
    this.detailStages.forEach(stage => {
      if (stage) stage.style.display = 'none';
    });
    this.dom.settingsMenuStage.style.display = 'block';
  }

  openSettingsPanel() {
    this.showMenu();
    this.aiVision.refreshOnOpen();
    this.offlineEngine.refreshOnOpen();
    this.language.refreshOnOpen();
    this.voice.refreshOnOpen();
    openModal(this.dom.modalSettingsPanel);
  }

  closeSettingsPanel() {
    closeModal(this.dom.modalSettingsPanel);
  }

  handleEnableAiKey() {
    // Unlike the old single-purpose modal, enabling no longer auto-closes the panel -
    // the drawer now holds four other sections the user may still want to visit.
    this.aiVision.handleEnableAi();
  }

  handleClearAiKey() {
    this.aiVision.handleClearKey();
  }
}
