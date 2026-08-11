/**
 * AI Settings Modal Controller & API Key Manager
 */

import { geminiEngine } from '../services/gemini/gemini-engine.js';

export class SettingsController {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;
    this.updateAiStatusBadge();
  }

  updateAiStatusBadge() {
    const isConfigured = geminiEngine.isConfigured();
    if (this.dom.aiStatusDot && this.dom.aiStatusText) {
      if (isConfigured) {
        this.dom.aiStatusDot.style.background = 'var(--accent-green)';
        this.dom.aiStatusText.textContent = 'Active & Connected';
      } else {
        this.dom.aiStatusDot.style.background = '#94A3B8';
        this.dom.aiStatusText.textContent = 'Not Configured (Using Local OCR)';
      }
    }
  }

  openAiSettingsModal() {
    this.dom.inputGeminiApiKey.value = geminiEngine.getApiKey();
    this.updateAiStatusBadge();
    this.dom.modalAiSettings.classList.add('active');
  }

  handleSaveAiKey() {
    const key = this.dom.inputGeminiApiKey.value.trim();
    if (!key) {
      alert('Please enter a valid Gemini API Key.');
      return;
    }
    geminiEngine.setApiKey(key);
    this.updateAiStatusBadge();
    this.dom.modalAiSettings.classList.remove('active');
    this.showToastCallback('Gemini API Key Saved! ✨');
  }

  handleClearAiKey() {
    geminiEngine.setApiKey('');
    this.dom.inputGeminiApiKey.value = '';
    this.updateAiStatusBadge();
    this.showToastCallback('API Key Cleared (Using Local OCR)');
  }

  async handleTestAiKey() {
    const key = this.dom.inputGeminiApiKey.value.trim();
    if (!key) {
      alert('Please enter an API key to test.');
      return;
    }

    const btn = document.getElementById('btnTestAiKey');
    if (btn) btn.textContent = 'Testing...';

    try {
      await geminiEngine.testConnection(key);
      alert('✅ Connection Successful! Gemini Vision API key is valid.');
    } catch (err) {
      alert('❌ Connection Failed: ' + err.message);
    } finally {
      if (btn) btn.textContent = 'Test Connection';
    }
  }
}
