# -*- coding: utf-8 -*-
"""Патч: квадрат вокруг чёрных дыр давал darkhalo.png (светлый непрозрачный
фон). Заменяем оба PNG-слоя на радиальные градиенты — квадрата быть не может."""
import io

FILES = [
    r'C:\MCreatorWorkspaces\enchanted-universe-web\index.html',
    r'C:\MCreatorWorkspaces\enchanted-universe-web\mobile.html',
]

OLD = """    ctx.save();
    // Слои как в Java: мягкое гало, тёмное гало, сам горизонт.
    const halo = PSR_IMAGES['halo_soft.png'], dark = PSR_IMAGES['darkhalo.png'];
    if (halo && halo.complete && halo.naturalWidth) {
      ctx.globalAlpha = alpha * 0.55;
      ctx.drawImage(halo, x - r * 5.5, y - r * 5.5, r * 11, r * 11);
    }
    if (dark && dark.complete && dark.naturalWidth) {
      ctx.globalAlpha = alpha * 0.75;
      ctx.drawImage(dark, x - r * 2.5, y - r * 2.5, r * 5, r * 5);
    }
    ctx.globalAlpha = alpha * 0.96;"""

NEW = """    ctx.save();
    // Слои вокруг горизонта — ГРАДИЕНТАМИ, а не PNG: у darkhalo.png фон был
    // светлый и непрозрачный, поэтому вокруг дыры появлялся белый квадрат.
    // Градиент заканчивается ровно нулём, у квадрата шансов нет.
    const gHalo = ctx.createRadialGradient(x, y, r * 0.35, x, y, r * 5.4);
    gHalo.addColorStop(0, 'rgba(255,236,206,' + (0.16 * alpha) + ')');
    gHalo.addColorStop(0.55, 'rgba(198,180,255,' + (0.055 * alpha) + ')');
    gHalo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gHalo;
    ctx.beginPath(); ctx.arc(x, y, r * 5.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Тёмный ореол у самого горизонта: мягкая виньетка, тоже без краёв.
    const gDark = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 2.4);
    gDark.addColorStop(0, 'rgba(2,3,10,' + (0.55 * alpha) + ')');
    gDark.addColorStop(1, 'rgba(2,3,10,0)');
    ctx.fillStyle = gDark;
    ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha * 0.96;"""

for path in FILES:
    text = io.open(path, encoding='utf-8').read()
    if text.count(OLD) != 1:
        raise SystemExit('anchor mismatch in ' + path)
    text = text.replace(OLD, NEW)
    io.open(path, 'w', encoding='utf-8').write(text)
    print(path.split('\\')[-1], 'ok')
