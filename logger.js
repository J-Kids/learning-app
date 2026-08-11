/**
 * Kids Learning App - In-App Logger
 * Captures all console.log/warn/error calls with timestamps.
 * Tap the Build version tag in the header to open the log viewer.
 * Logs persist for the entire session.
 */

(function () {
  const MAX_LOGS = 200;
  const logs = [];

  // --- Intercept console methods ---
  const _log   = console.log.bind(console);
  const _warn  = console.warn.bind(console);
  const _error = console.error.bind(console);

  function formatArgs(args) {
    return args.map(a => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(a, null, 2); } catch { return String(a); }
      }
      return String(a);
    }).join(' ');
  }

  function addLog(level, args) {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);
    const msg  = formatArgs(Array.from(args));
    logs.unshift({ level, time, msg }); // newest first
    if (logs.length > MAX_LOGS) logs.pop();
    refreshLogPanel();
  }

  console.log = function () { _log(...arguments);   addLog('log',   arguments); };
  console.warn = function () { _warn(...arguments); addLog('warn',  arguments); };
  console.error = function () { _error(...arguments); addLog('error', arguments); };

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    addLog('error', [`Unhandled Promise Rejection: ${e.reason}`]);
  });

  // Catch global errors
  window.addEventListener('error', (e) => {
    addLog('error', [`Global Error: ${e.message} @ ${e.filename}:${e.lineno}`]);
  });

  // --- Build the log panel UI ---
  function buildPanel() {
    if (document.getElementById('appLogPanel')) return;

    const overlay = document.createElement('div');
    overlay.id = 'appLogOverlay';
    overlay.style.cssText = `
      display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5);
      z-index:99999; align-items:flex-end; justify-content:center;
    `;

    const panel = document.createElement('div');
    panel.id = 'appLogPanel';
    panel.style.cssText = `
      background:#0F172A; color:#E2E8F0; width:100%; max-height:70vh;
      overflow-y:auto; border-radius:16px 16px 0 0; font-family:monospace;
      font-size:12px; padding:12px 0;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display:flex; justify-content:space-between; align-items:center;
      padding:6px 16px 10px; border-bottom:1px solid #1E293B; position:sticky; top:0;
      background:#0F172A; z-index:1;
    `;
    header.innerHTML = `
      <span style="font-weight:700;font-size:13px;color:#7C3AED;">&#128203; App Logs</span>
      <div style="display:flex;gap:8px;">
        <button id="btnLogCopy" style="background:#1E293B;color:#94A3B8;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">&#128203; Copy</button>
        <button id="btnLogClear" style="background:#1E293B;color:#94A3B8;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">&#128465; Clear</button>
        <button id="btnLogClose" style="background:#7C3AED;color:white;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:11px;">&#10005; Close</button>
      </div>
    `;

    const logList = document.createElement('div');
    logList.id = 'appLogList';
    logList.style.cssText = 'padding:8px 0;';

    panel.appendChild(header);
    panel.appendChild(logList);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Close on overlay backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePanel();
    });

    document.getElementById('btnLogClose').addEventListener('click', closePanel);

    document.getElementById('btnLogClear').addEventListener('click', () => {
      logs.length = 0;
      refreshLogPanel();
    });

    document.getElementById('btnLogCopy').addEventListener('click', () => {
      const text = logs.map(l => `[${l.time}][${l.level.toUpperCase()}] ${l.msg}`).join('\n');
      navigator.clipboard?.writeText(text).then(() => {
        document.getElementById('btnLogCopy').textContent = '✅ Copied!';
        setTimeout(() => { document.getElementById('btnLogCopy').innerHTML = '&#128203; Copy'; }, 2000);
      }).catch(() => {
        // Fallback for mobile
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
    });
  }

  function refreshLogPanel() {
    const list = document.getElementById('appLogList');
    if (!list) return;

    list.innerHTML = '';

    if (logs.length === 0) {
      list.innerHTML = '<div style="padding:16px;color:#475569;text-align:center;">No logs yet</div>';
      return;
    }

    logs.forEach(entry => {
      const row = document.createElement('div');
      row.style.cssText = `
        padding:5px 16px; border-bottom:1px solid #1E293B; line-height:1.5;
        word-break:break-all;
      `;

      const levelColors = { log: '#94A3B8', warn: '#F59E0B', error: '#F87171' };
      const color = levelColors[entry.level] || '#94A3B8';

      row.innerHTML = `
        <span style="color:#475569;font-size:10px;">${entry.time}</span>
        <span style="color:${color};font-weight:700;margin:0 6px;">[${entry.level.toUpperCase()}]</span>
        <span style="color:${entry.level === 'error' ? '#FCA5A5' : entry.level === 'warn' ? '#FDE68A' : '#CBD5E1'};">${escapeHtml(entry.msg)}</span>
      `;
      list.appendChild(row);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function openPanel() {
    const overlay = document.getElementById('appLogOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      refreshLogPanel();
    }
  }

  function closePanel() {
    const overlay = document.getElementById('appLogOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  // --- Expose globally ---
  window.appLogger = { open: openPanel, close: closePanel, logs };

  // --- Attach trigger after DOM ready ---
  function attachTrigger() {
    buildPanel();

    // Tap the Build version tag to open logs
    const buildTag = document.getElementById('appBuildTag');
    if (buildTag) {
      buildTag.style.cursor = 'pointer';
      buildTag.title = 'Tap to view app logs';
      buildTag.addEventListener('click', openPanel);
    }

    // Log that logger is ready
    _log('[AppLogger] Logger initialized. Tap build tag to view logs.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachTrigger);
  } else {
    attachTrigger();
  }
})();
