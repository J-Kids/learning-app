/**
 * AI Settings Modal Controller & API Key Manager
 */

import { geminiEngine } from '../services/gemini/gemini-engine.js';
import { openModal, closeModal } from '../views/navigation.js';

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

    const resultEl = document.getElementById('aiTestResult');
    if (resultEl) resultEl.textContent = '';

    openModal(this.dom.modalAiSettings);
  }

  closeAiSettingsModal() {
    closeModal(this.dom.modalAiSettings);
  }

  handleSaveAiKey() {
    const key = this.dom.inputGeminiApiKey.value.trim();
    if (!key) {
      alert('Please enter a valid Gemini API Key.');
      return;
    }
    geminiEngine.setApiKey(key);
    this.updateAiStatusBadge();
    closeModal(this.dom.modalAiSettings);
    this.showToastCallback('Gemini API Key Saved! ✨');
  }

  handleClearAiKey() {
    geminiEngine.setApiKey('');
    this.dom.inputGeminiApiKey.value = '';
    this.updateAiStatusBadge();
    const resultEl = document.getElementById('aiTestResult');
    if (resultEl) resultEl.textContent = '';
    this.showToastCallback('API Key Cleared (Using Local OCR)');
  }

  async handleTestAiKey() {
    const key = this.dom.inputGeminiApiKey.value.trim();
    const resultEl = document.getElementById('aiTestResult');
    const btn = document.getElementById('btnTestAiKey');

    if (!key) {
      if (resultEl) {
        resultEl.style.color = '#EF4444';
        resultEl.textContent = '⚠️ Please enter an API key to test.';
      }
      return;
    }

    if (btn) btn.textContent = 'Testing...';
    if (resultEl) {
      resultEl.style.color = '#64748B';
      resultEl.textContent = '⏳ Testing API connection...';
    }

    try {
      await geminiEngine.testConnection(key);
      if (resultEl) {
        resultEl.style.color = '#059669';
        resultEl.textContent = '✅ Connection Successful! Gemini API key is valid.';
      }
    } catch (err) {
      if (resultEl) {
        resultEl.style.color = '#EF4444';
        resultEl.textContent = `❌ Connection Failed: ${err.message}`;
      }
    } finally {
      if (btn) btn.textContent = '🔌 Test Connection';
    }
  }
}
