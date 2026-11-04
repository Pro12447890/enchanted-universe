/* Жесты только на холсте карты: браузерный масштаб остальных элементов не запрещён. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EUMapTouch = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function attach(canvas, options) {
    const points = new Map();
    const cancelledClicks = new Map();
    const pruneCancelled = () => { for (const [id, p] of cancelledClicks) if (p.until < performance.now()) cancelledClicks.delete(id); };
    const minZoom = options.minZoom ?? 0.04, maxZoom = options.maxZoom ?? 20000;
    let tap = null, multi = false, moving = false, pair = null, inputType = 'touch';
    const disposers = [];
    canvas.style.touchAction = 'none';
    const listen = (target, name, fn, opts) => {
      target.addEventListener(name, fn, opts);
      disposers.push(() => target.removeEventListener(name, fn, opts));
    };
    const center = () => {
      const r = canvas.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const activity = () => options.onActivity?.(points.size > 0);
    const begin = () => {
      if (moving) return;
      moving = true;
      options.onGestureStart?.(inputType);
    };
    function rebasePair() {
      if (points.size < 2) { pair = null; return; }
      const [a, b] = [...points.entries()];
      if (pair && pair.ids[0] === a[0] && pair.ids[1] === b[0]) return;
      const c = { ...options.getCamera() }, mid = { x: (a[1].x + b[1].x) / 2, y: (a[1].y + b[1].y) / 2 };
      const ctr = center();
      pair = {
        ids: [a[0], b[0]], distance: Math.max(8, Math.hypot(a[1].x - b[1].x, a[1].y - b[1].y)), zoom: c.z,
        world: { x: c.x + (mid.x - ctr.x) / c.z, y: c.y + (mid.y - ctr.y) / c.z }
      };
    }
    function down(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pruneCancelled(); cancelledClicks.delete(e.pointerId);
      if (points.size === 0) {
        inputType = e.pointerType || 'touch';
        tap = { x: e.clientX, y: e.clientY, time: performance.now() };
        multi = false; moving = false; pair = null;
      }
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { canvas.setPointerCapture?.(e.pointerId); } catch (_) { /* legacy touch */ }
      e.preventDefault?.();
      activity();
      if (points.size >= 2) { multi = true; tap = null; begin(); rebasePair(); }
    }
    function move(e) {
      const previous = points.get(e.pointerId);
      if (!previous) {
        const aborted = cancelledClicks.get(e.pointerId);
        if (aborted) { aborted.x = e.clientX; aborted.y = e.clientY; e.preventDefault?.(); }
        return;
      }
      e.preventDefault?.();
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (points.size >= 2) {
        rebasePair();
        const a = points.get(pair.ids[0]), b = points.get(pair.ids[1]), ctr = center();
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const distance = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
        const z = clamp(pair.zoom * distance / pair.distance, minZoom, maxZoom);
        options.setCamera({ x: pair.world.x - (mid.x - ctr.x) / z, y: pair.world.y - (mid.y - ctr.y) / z, z });
      } else {
        if (!moving && tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) <= (inputType === 'mouse' ? 3 : 7)) return;
        const wasMoving = moving;
        begin();
        const c = options.getCamera();
        // Первый шаг включает весь пройденный порог, последующие — только delta.
        const origin = !wasMoving && tap ? tap : previous;
        options.setCamera({ x: c.x - (e.clientX - origin.x) / c.z, y: c.y - (e.clientY - origin.y) / c.z, z: c.z });
      }
    }
    function end(e, cancelled) {
      if (!points.has(e.pointerId)) {
        const aborted = cancelledClicks.get(e.pointerId);
        if (aborted) {
          aborted.x = e.clientX; aborted.y = e.clientY; aborted.until = performance.now() + 500;
          e.preventDefault?.();
        }
        return;
      }
      const isTap = !cancelled && points.size === 1 && !multi && !moving && tap
        && performance.now() - tap.time < 550 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) <= 10;
      points.delete(e.pointerId);
      try { if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      if (points.size < 2) pair = null; else rebasePair();
      activity();
      if (isTap) options.onTap?.(e.clientX, e.clientY, inputType);
      if (!points.size) {
        if(moving||multi)options.onGestureEnd?.(e.clientX,e.clientY,inputType);
        tap = null; pair = null; moving = false; multi = false;
      }
    }
    function cancel() {
      pruneCancelled();
      // Палец ещё может быть на экране. Ранний releasePointerCapture позволял
      // Chrome превратить отпускание над новым меню в клик «Сгенерировать».
      for (const [id, p] of points) cancelledClicks.set(id, { ...p, until: performance.now() + 1000 });
      points.clear(); tap = null; pair = null; moving = false; multi = false; activity();
    }
    if (typeof document !== 'undefined') listen(document, 'click', e => {
      pruneCancelled();
      if (!e.isTrusted) return;
      const found = [...cancelledClicks.entries()].find(([id, p]) =>
        (e.pointerId == null || e.pointerId === id) && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 14);
      if (!found) return;
      cancelledClicks.delete(found[0]); e.preventDefault(); e.stopImmediatePropagation();
    }, true);
    if (typeof window === 'undefined' || window.PointerEvent) {
      listen(canvas, 'pointerdown', down, { passive: false });
      listen(canvas, 'pointermove', move, { passive: false });
      listen(canvas, 'pointerup', e => end(e, false));
      listen(canvas, 'pointercancel', e => end(e, true));
      listen(canvas, 'lostpointercapture', e => end(e, true));
    } else {
      // Старый Safari: те же формулы, без одновременной обработки Pointer/Touch.
      const pointer = t => ({ pointerId: t.identifier, pointerType: 'touch', clientX: t.clientX, clientY: t.clientY });
      listen(canvas, 'touchstart', e => { e.preventDefault(); for (const t of e.changedTouches) down(pointer(t)); }, { passive: false });
      listen(canvas, 'touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) move(pointer(t)); }, { passive: false });
      listen(canvas, 'touchend', e => { for (const t of e.changedTouches) end(pointer(t), false); }, { passive: false });
      listen(canvas, 'touchcancel', e => { for (const t of e.changedTouches) end(pointer(t), true); }, { passive: false });
    }
    // Safari gesture events блокируем только на карте, не на тексте интерфейса.
    for (const name of ['gesturestart', 'gesturechange', 'gestureend']) listen(canvas, name, e => e.preventDefault(), { passive: false });
    if (typeof window !== 'undefined') {
      listen(window, 'blur', cancel);
      listen(window, 'resize', cancel);
    }
    return { activeCount: () => points.size, cancel, destroy: () => { cancel(); disposers.forEach(fn => fn()); } };
  }
  return { attach };
});
