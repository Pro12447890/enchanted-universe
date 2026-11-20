/* Жидкое стекло: ручной выбор сохраняется, автоматическое упрощение — только на этот заход. */
(function (host) {
  'use strict';
  const KEY = 'eu_liquid_glass_mode';

  // Считаем интервалы кадров, а не число вызовов. Короткие окна сглаживают джиттер rAF;
  // восстановление выше 55 FPS прерывает непрерывный трёхсекундный период.
  function createFrameMonitor(onLow) {
    let start = null, frames = 0, slowMs = 0, fps = null, fired = false;
    function reset() { start = null; frames = 0; slowMs = 0; fps = null; fired = false; }
    function sample(now, active = true) {
      if (!active || !Number.isFinite(now)) { reset(); return; }
      if (start === null || now < start) { start = now; frames = 0; return; }
      frames++;
      const elapsed = now - start;
      if (elapsed < 250) return;
      fps = frames * 1000 / elapsed;
      slowMs = fps <= 55 + 1e-6 ? slowMs + elapsed : 0;
      start = now; frames = 0;
      if (!fired && slowMs >= 3000 - 1e-6) { fired = true; onLow(); }
    }
    return {sample, reset, state: () => ({fps, slowMs, fired})};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {createFrameMonitor};
  if (!host.document) return;

  const root = document.documentElement;
  let manual = null, fallback = false, started = false;
  try { const saved = localStorage.getItem(KEY); if (saved === 'glass' || saved === 'classic') manual = saved; } catch (_) {}
  const monitor = createFrameMonitor(() => { fallback = true; apply(); });
  const t = key => host.EUI18N ? host.EUI18N.t(key) : key;
  function apply() {
    const glass = manual === 'glass' || (manual === null && !fallback);
    root.classList.toggle('liquid-glass', glass);
    root.classList.toggle('glass-classic', !glass);
    root.classList.toggle('glass-auto-fallback', manual === null && fallback);
    const button = document.getElementById('glassMode');
    if (!button) return;
    const key = manual === 'glass' ? 'on' : manual === 'classic' ? 'off' : fallback ? 'optimized' : 'auto';
    button.textContent = t('glass.mode.' + key);
    button.title = t('glass.mode.title');
    button.dataset.mode = manual || 'auto';
    button.setAttribute('aria-pressed', String(glass));
    button.setAttribute('aria-label', button.textContent + '. ' + button.title);
  }
  function set(value) {
    manual = value === 'glass' || value === 'classic' ? value : null;
    fallback = false; monitor.reset();
    try { if (manual) localStorage.setItem(KEY, manual); else localStorage.removeItem(KEY); } catch (_) {}
    apply();
  }
  function observeFrame(now) {
    const loading = document.getElementById('loading');
    const active = manual === null && !fallback && !document.hidden &&
      !root.classList.contains('catalog-busy') && (!loading || loading.classList.contains('is-ready'));
    if (manual === null && !fallback) monitor.sample(now, active);
  }
  function frame(now) { observeFrame(now); requestAnimationFrame(frame); }
  function start() {
    if (started) return; started = true; apply();
    document.getElementById('glassMode')?.addEventListener('click', () => set(manual === null ? 'glass' : manual === 'glass' ? 'classic' : 'auto'));
    host.addEventListener('eu-lang', apply);
    document.addEventListener('visibilitychange', () => monitor.reset());
    requestAnimationFrame(frame);
  }
  host.EUPerformanceMode = {start, set, observeFrame, state: () => ({mode: manual || 'auto', fallback, effective: manual === 'classic' || fallback ? 'classic' : 'glass', ...monitor.state()})};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})(typeof window === 'undefined' ? globalThis : window);
