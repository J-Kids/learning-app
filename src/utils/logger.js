/**
 * Kids Learning App - In-App Logger
 * Captures console.log/warn/error calls with timestamps and provides a sliding log drawer.
 */

class AppLogger {
  constructor() {
    this.maxLogs = 200;
    this.logs = [];
    this.initConsoleInterceptors();
  }

  formatArgs(args) {
    return args.map(a => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(a, null, 2); } catch { return String(a); }
      }
      return String(a);
    }).join(' ');
  }

  addLog(level, args) {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);
    const msg  = this.formatArgs(Array.from(args));
    this.logs.unshift({ level, time, msg });
    if (this.logs.length > this.maxLogs) this.logs.pop();
    this.refreshLogPanel();
  }

  initConsoleInterceptors() {
    const _log   = console.log.bind(console);
    const _warn  = console.warn.bind(console);
    const _error = console.error.bind(console);

    console.log   = (...args) => { _log(...args);   this.addLog('log',   args); };
    console.warn  = (...args) => { _warn(...args);  this.addLog('warn',  args); };
    console.error = (...args) => { _error(...args); this.addLog('error', args); };

    window.addEventListener('unhandledrejection', (e) => {
      this.addLog('error', [`Unhandled Promise Rejection: ${e.reason}`]);
    });

    window.addEventListener('error', (e) => {
      this.addLog('error', [`Global Error: ${e.message} @ ${e.filename}:${e.lineno}`]);
    });
  }

  initUi() {
    if (document.getElementById('logDrawerOverlay')) return;

    const drawerHtml = `
      <div id="logDrawerOverlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:none;align-items:flex-end;justify-content:center;">
        <div style="background:#1E293B;color:#F8FAFC;width:100%;max-width:500px;max-height:75vh;border-top-left-radius:20px;border-top-right-radius:20px;display:flex;flex-direction:column;box-shadow:0 -10px 30px rgba(0,0,0,0.5);font-family:monospace;font-size:12px;">
          <div style="padding:14px 18px;background:#0F172A;border-top-left-radius:20px;border-top-right-radius:20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #334155;">
            <span style="font-weight:700;color:#A78BFA;font-size:14px;">📋 Debug Logs</span>
            <div style="display:flex;gap:8px;">
              <button id="btnCopyLogs" style="background:#374151;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;">📋 Copy</button>
              <button id="btnClearLogs" style="background:#374151;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;">🗑️ Clear</button>
              <button id="btnCloseLogs" style="background:#EF4444;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;">✕</button>
            </div>
          </div>
          <div id="logContentBox" style="padding:14px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:6px;white-space:pre-wrap;word-break:break-all;"></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerHtml);

    document.getElementById('btnCloseLogs')?.addEventListener('click', () => this.hide());
    document.getElementById('logDrawerOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'logDrawerOverlay') this.hide();
    });

    document.getElementById('btnClearLogs')?.addEventListener('click', () => {
      this.logs = [];
      this.refreshLogPanel();
    });

    document.getElementById('btnCopyLogs')?.addEventListener('click', () => {
      const text = this.logs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.msg}`).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        alert('Logs copied to clipboard!');
      });
    });

    const buildTag = document.getElementById('appBuildTag');
    if (buildTag) {
      buildTag.addEventListener('click', () => this.show());
    }
  }

  refreshLogPanel() {
    const box = document.getElementById('logContentBox');
    if (!box) return;

    box.innerHTML = this.logs.map(l => {
      let color = '#94A3B8';
      if (l.level === 'warn') color = '#FBBF24';
      if (l.level === 'error') color = '#F87171';
      return `<div style="color:${color};"><span style="color:#64748B;">[${l.time}]</span> ${this.escapeHtml(l.msg)}</div>`;
    }).join('');
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  show() {
    this.initUi();
    const overlay = document.getElementById('logDrawerOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      this.refreshLogPanel();
    }
  }

  hide() {
    const overlay = document.getElementById('logDrawerOverlay');
    if (overlay) overlay.style.display = 'none';
  }
}

export const logger = new AppLogger();
