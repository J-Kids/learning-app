/**
 * AI Vision Settings Section
 * Manages the Gemini API key: save, clear, and test connection.
 */

import { geminiEngine } from '../../services/gemini/gemini-engine.js';

export class AiVisionSettings {
  constructor(dom, showToastCallback) {
    this.dom = dom;
    this.showToastCallback = showToastCallback;
  }

  updateStatusBadge() {
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

  refreshOnOpen() {
    this.dom.inputGeminiApiKey.value = geminiEngine.getApiKey();
    this.updateStatusBadge();

    const resultEl = document.getElementById('aiTestResult');
    if (resultEl) resultEl.textContent = '';
  }

  handleSaveKey() {
    const key = this.dom.inputGeminiApiKey.value.trim();
    if (!key) {
      alert('Please enter a valid Gemini API Key.');
      return;
    }
    geminiEngine.setApiKey(key);
    this.updateStatusBadge();
    this.showToastCallback('Gemini API Key Saved! ✨');
  }

  handleClearKey() {
    geminiEngine.setApiKey('');
    this.dom.inputGeminiApiKey.value = '';
    this.updateStatusBadge();
    const resultEl = document.getElementById('aiTestResult');
    if (resultEl) resultEl.textContent = '';
    this.showToastCallback('API Key Cleared (Using Local OCR)');
  }

  async handleTestKey() {
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
