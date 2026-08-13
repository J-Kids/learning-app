/**
 * AI Vision Settings Section
 * Manages the Gemini API key: test-then-save as a single "Enable AI" action, and clear.
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
    if (this.dom.menuSubtitleAiVision) {
      this.dom.menuSubtitleAiVision.textContent = isConfigured ? 'Active & Connected' : 'Not Configured';
    }
    if (this.dom.btnClearAiKey) {
      this.dom.btnClearAiKey.style.display = isConfigured ? 'inline-block' : 'none';
    }
  }

  refreshOnOpen() {
    this.dom.inputGeminiApiKey.value = geminiEngine.getApiKey();
    this.updateStatusBadge();

    const resultEl = document.getElementById('aiTestResult');
    if (resultEl) resultEl.textContent = '';
  }

  handleClearKey() {
    geminiEngine.setApiKey('');
    this.dom.inputGeminiApiKey.value = '';
    this.updateStatusBadge();
    const resultEl = document.getElementById('aiTestResult');
    if (resultEl) resultEl.textContent = '';
    this.showToastCallback('API Key Cleared (Using Local OCR)');
  }

  async handleEnableAi() {
    const key = this.dom.inputGeminiApiKey.value.trim();
    const resultEl = document.getElementById('aiTestResult');
    const btn = this.dom.btnEnableAi;

    if (!key) {
      if (resultEl) {
        resultEl.style.color = '#EF4444';
        resultEl.textContent = '⚠️ Please enter an API key first.';
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Testing...';
    }
    if (resultEl) {
      resultEl.style.color = '#64748B';
      resultEl.textContent = '⏳ Testing API connection...';
    }

    try {
      await geminiEngine.testConnection(key);
      // Only persist the key once it's actually proven to work - the saved
      // key and "verified" are the same thing now, so the badge can't lie.
      geminiEngine.setApiKey(key);
      this.updateStatusBadge();
      if (resultEl) resultEl.textContent = '';
      this.showToastCallback('AI Vision Enabled! ✨');
    } catch (err) {
      if (resultEl) {
        resultEl.style.color = '#EF4444';
        resultEl.textContent = `❌ Connection Failed: ${err.message}`;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ Enable AI';
      }
    }
  }
}
