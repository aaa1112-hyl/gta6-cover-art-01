/* Sunset Cover Studio — poster render engine (canvas 2D, all art drawn in code).
   No external images, no Rockstar artwork, no game fonts: every shape, palm,
   skyline and letter is drawn here from scratch. */
(function () {
  'use strict';

  // Deterministic pseudo-random numbers, so the same cover renders identically.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var GRADES = {
    sunset: {
      sky: ['#2b0f3d', '#7a1e4d', '#e63e6d', '#ff7a3d', '#ffb347'],
      sun: '#ffd166', sunCore: '#fff3c4', glow: 'rgba(255, 122, 61, 0.55)',
      skyline: '#1d0a2e', tint: 'rgba(255, 110, 60, 0.20)', tint2: 'rgba(255, 46, 136, 0.12)',
      titleFill: '#ffffff', titleStroke: '#241023', titleShadow: '#ff2e88',
      accent: '#ffd166', accent2: '#ff7a3d', border: '#ffffff', panelGlow: null
    },
    neon: {
      sky: ['#050214', '#160b3a', '#3b115f', '#8a1d6d', '#ff2e88'],
      sun: '#ff5da2', sunCore: '#ffe3f1', glow: 'rgba(255, 46, 136, 0.5)',
      skyline: '#070213', tint: 'rgba(64, 224, 255, 0.16)', tint2: 'rgba(255, 46, 136, 0.16)',
      titleFill: '#eafcff', titleStroke: '#12022e', titleShadow: '#00e5ff',
      accent: '#00e5ff', accent2: '#ff2e88', border: '#eafcff', panelGlow: '#00e5ff'
    },
    dusk: {
      sky: ['#0b1e3a', '#173a5e', '#2a5f8a', '#e08a4c', '#f7c873'],
      sun: '#f7c873', sunCore: '#fff6dd', glow: 'rgba(224, 138, 76, 0.5)',
      skyline: '#081426', tint: 'rgba(42, 95, 138, 0.18)', tint2: 'rgba(247, 200, 115, 0.10)',
      titleFill: '#fdf6e3', titleStroke: '#0b1e3a', titleShadow: '#e08a4c',
      accent: '#f7c873', accent2: '#7fb3d5', border: '#fdf6e3', panelGlow: null
    }
  };

  // Panel slots as fractions of the canvas. Each layout: slots + title band.
  var LAYOUTS = {
    hero2: {
      slots: [
        { x: 0.03, y: 0.03, w: 0.58, h: 0.79, tilt: -0.7 },
        { x: 0.64, y: 0.03, w: 0.33, h: 0.385, tilt: 0.6 },
        { x: 0.64, y: 0.435, w: 0.33, h: 0.385, tilt: -0.5 }
      ],
      title: { x: 0.03, y: 0.845, w: 0.94, h: 0.13 }
    },
    hero3: {
      slots: [
        { x: 0.03, y: 0.03, w: 0.58, h: 0.79, tilt: -0.7 },
        { x: 0.64, y: 0.03, w: 0.33, h: 0.25, tilt: 0.6 },
        { x: 0.64, y: 0.30, w: 0.33, h: 0.25, tilt: -0.5 },
        { x: 0.64, y: 0.57, w: 0.33, h: 0.25, tilt: 0.6 }
      ],
      title: { x: 0.03, y: 0.845, w: 0.94, h: 0.13 }
    },
    grid: {
      slots: [
        { x: 0.03, y: 0.03, w: 0.94, h: 0.47, tilt: -0.4 },
        { x: 0.03, y: 0.53, w: 0.30, h: 0.29, tilt: 0.5 },
        { x: 0.35, y: 0.53, w: 0.30, h: 0.29, tilt: -0.5 },
        { x: 0.67, y: 0.53, w: 0.30, h: 0.29, tilt: 0.5 }
      ],
      title: { x: 0.03, y: 0.845, w: 0.94, h: 0.13 }
    }
  };

  function layoutSlots(layout) {
    return (LAYOUTS[layout] || LAYOUTS.hero2).slots;
  }

  function titleBand(layout) {
    return (LAYOUTS[layout] || LAYOUTS.hero2).title;
  }

  function panelCount(layout) {
    return layoutSlots(layout).length;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function drawPalm(ctx, x, y, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    // Trunk: a gentle S-curve.
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(10, -45, 26, -78);
    ctx.stroke();
    // Fronds: seven arcs drooping from the crown.
    ctx.lineWidth = 5;
    for (var i = 0; i < 7; i++) {
      var a = Math.PI * (0.08 + i * 0.14);
      var ex = 26 + Math.cos(a) * 52;
      var ey = -78 - Math.sin(a) * 26 + (i === 3 ? -14 : 0);
      var mx = 26 + Math.cos(a) * 30;
      var my = -78 - Math.sin(a) * 34;
      ctx.beginPath();
      ctx.moveTo(26, -78);
      ctx.quadraticCurveTo(mx, my, ex, ey + 16);
      ctx.stroke();
    }
    // Coconuts.
    ctx.beginPath(); ctx.arc(22, -74, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(31, -72, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawSkyline(ctx, W, H, yBase, color, seed) {
    var rnd = mulberry32(seed);
    ctx.fillStyle = color;
    var x = -10;
    while (x < W + 10) {
      var bw = 26 + rnd() * 70;
      var bh = H * (0.05 + rnd() * 0.16);
      ctx.fillRect(x, yBase - bh, bw, bh);
      // Rooftop antenna on some towers.
      if (rnd() > 0.6) {
        ctx.fillRect(x + bw / 2 - 1, yBase - bh - 16, 2, 16);
        ctx.beginPath(); ctx.arc(x + bw / 2, yBase - bh - 18, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      // Lit windows.
      ctx.save();
      ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
      var cols = Math.floor(bw / 14);
      var rows = Math.floor(bh / 18);
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          if (rnd() > 0.55) {
            ctx.fillRect(x + 5 + c * 14, yBase - bh + 6 + r * 18, 6, 8);
          }
        }
      }
      ctx.restore();
      x += bw + 4 + rnd() * 14;
    }
  }

  function drawSky(ctx, W, H, grade) {
    var g = GRADES[grade] || GRADES.sunset;
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    for (var i = 0; i < g.sky.length; i++) {
      sky.addColorStop(i / (g.sky.length - 1), g.sky[i]);
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun with a warm halo, low on the horizon.
    var sunX = W * 0.72, sunY = H * 0.62, sunR = Math.min(W, H) * 0.13;
    var halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
    halo.addColorStop(0, g.glow);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = g.sunCore;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
    // Neon grade: cut synthwave stripes through the sun.
    if (grade === 'neon') {
      ctx.fillStyle = g.sky[1];
      for (var s = 0; s < 4; s++) {
        var sy = sunY + sunR * (0.05 + s * 0.22);
        var sh = sunR * (0.03 + s * 0.02);
        ctx.fillRect(sunX - sunR - 2, sy, sunR * 2 + 4, sh);
      }
    }

    // Soft clouds.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    var rnd = mulberry32(20261120);
    for (var c = 0; c < 7; c++) {
      var cx = rnd() * W, cy = H * (0.06 + rnd() * 0.3), cw = W * (0.10 + rnd() * 0.16);
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, cw * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Skyline along the bottom, behind the title band.
    drawSkyline(ctx, W, H, H * 0.985, g.skyline, 77);
  }

  function drawPhotoInPanel(ctx, rect, photo, grade) {
    var g = GRADES[grade] || GRADES.sunset;
    if (!photo || !photo.img || !photo.img.naturalWidth) {
      // Empty panel: a painted sunset placeholder with a palm.
      var pg = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      pg.addColorStop(0, '#3b115f');
      pg.addColorStop(0.55, '#e63e6d');
      pg.addColorStop(1, '#ffb347');
      ctx.fillStyle = pg;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      drawPalm(ctx, rect.x + rect.w * 0.72, rect.y + rect.h * 0.92, rect.w / 420, 'rgba(20, 6, 34, 0.9)');
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '700 ' + Math.round(rect.w * 0.055) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+  ADD PHOTO', rect.x + rect.w / 2, rect.y + rect.h * 0.52);
      return;
    }
    var iw = photo.img.naturalWidth, ih = photo.img.naturalHeight;
    var base = Math.max(rect.w / iw, rect.h / ih);
    var scale = base * (photo.zoom || 1);
    var dw = iw * scale, dh = ih * scale;
    var ox = clamp(photo.ox || 0, -1, 1), oy = clamp(photo.oy || 0, -1, 1);
    var dx = rect.x + (rect.w - dw) / 2 + ox * Math.max(0, (dw - rect.w) / 2);
    var dy = rect.y + (rect.h - dh) / 2 + oy * Math.max(0, (dh - rect.h) / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(photo.img, dx, dy, dw, dh);
    // Colour grade tint over the photo.
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = g.tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = g.tint2;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  function fitFont(ctx, text, maxWidth, startPx, family) {
    var px = startPx;
    ctx.font = px + 'px ' + family;
    while (px > 12 && ctx.measureText(text).width > maxWidth) {
      px -= 2;
      ctx.font = px + 'px ' + family;
    }
    return px;
  }

  function drawTitle(ctx, band, state, grade) {
    var g = GRADES[grade] || GRADES.sunset;
    var title = (state.title || '').toUpperCase();
    var sub = state.subtitle || '';
    // Solid dark footer band, so the lettering is always legible over the sky.
    ctx.fillStyle = g.skyline;
    ctx.globalAlpha = 0.96;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = g.accent;
    ctx.fillRect(band.x, band.y, band.w, Math.max(3, band.h * 0.035));
    // Kicker bars above the title.
    var barH = Math.max(4, band.h * 0.06);
    var barY = band.y + band.h * 0.10;
    ctx.fillStyle = g.accent;
    ctx.fillRect(band.x + band.w * 0.02, barY, band.w * 0.16, barH);
    ctx.fillStyle = g.accent2;
    ctx.fillRect(band.x + band.w * 0.02 + band.w * 0.16, barY, band.w * 0.05, barH);

    var textX = band.x + band.w * 0.02;
    var titleY = band.y + band.h * 0.62;
    var px = fitFont(ctx, title, band.w * 0.90, band.h * 0.52, 'Anton, "Arial Narrow", sans-serif');
    ctx.save();
    ctx.translate(textX, titleY);
    ctx.rotate(-0.01);
    ctx.font = px + 'px Anton, "Arial Narrow", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.shadowColor = g.titleShadow;
    ctx.shadowBlur = px * 0.18;
    ctx.shadowOffsetY = px * 0.05;
    ctx.strokeStyle = g.titleStroke;
    ctx.lineWidth = Math.max(3, px * 0.09);
    ctx.strokeText(title, 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = g.titleFill;
    ctx.fillText(title, 0, 0);
    ctx.restore();

    // Subtitle, letterspaced, in the accent colour.
    if (sub) {
      var subPx = Math.max(10, band.h * 0.16);
      ctx.font = '700 ' + subPx + 'px system-ui, sans-serif';
      try { ctx.letterSpacing = Math.round(subPx * 0.35) + 'px'; } catch (e) { /* older canvas */ }
      ctx.fillStyle = g.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(sub.toUpperCase(), textX, band.y + band.h * 0.92);
      try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
    }
  }

  function drawVignette(ctx, W, H) {
    var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10, 2, 24, 0.28)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  // Render the whole poster onto ctx at pixel size W x H.
  function renderCover(ctx, W, H, state) {
    var grade = state.grade || 'sunset';
    var g = GRADES[grade] || GRADES.sunset;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    drawSky(ctx, W, H, grade);

    var slots = layoutSlots(state.layout);
    var border = Math.max(3, Math.round(W * 0.006));
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      var rect = { x: s.x * W, y: s.y * H, w: s.w * W, h: s.h * H };
      var panel = (state.panels && state.panels[i]) || {};
      var photo = null;
      if (typeof panel.photo === 'number' && state.photos && state.photos[panel.photo]) {
        photo = state.photos[panel.photo];
      }
      ctx.save();
      // Slight tilt around the panel centre, poster-collage feel.
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((s.tilt || 0) * Math.PI / 180);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
      ctx.shadowColor = 'rgba(10, 2, 24, 0.55)';
      ctx.shadowBlur = W * 0.02;
      ctx.shadowOffsetY = H * 0.008;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rect.x - border, rect.y - border, rect.w + border * 2, rect.h + border * 2);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      if (g.panelGlow) {
        ctx.strokeStyle = g.panelGlow;
        ctx.lineWidth = Math.max(2, W * 0.002);
        ctx.shadowColor = g.panelGlow;
        ctx.shadowBlur = W * 0.012;
        ctx.strokeRect(rect.x - border, rect.y - border, rect.w + border * 2, rect.h + border * 2);
        ctx.shadowBlur = 0;
      }
      drawPhotoInPanel(ctx, rect, photo, grade);
      ctx.restore();
    }

    // Title band (dark footer with palms, kicker bars and lettering).
    var band = titleBand(state.layout);
    var bandPx = { x: band.x * W, y: band.y * H, w: band.w * W, h: band.h * H };
    drawTitle(ctx, bandPx, state, grade);
    drawVignette(ctx, W, H);
    ctx.restore();
  }

  // Which panel slot contains point (x, y) in canvas pixels, or -1.
  function panelAt(state, W, H, x, y) {
    var slots = layoutSlots(state.layout);
    for (var i = slots.length - 1; i >= 0; i--) {
      var s = slots[i];
      if (x >= s.x * W && x <= (s.x + s.w) * W && y >= s.y * H && y <= (s.y + s.h) * H) return i;
    }
    return -1;
  }

  window.CoverArt = {
    GRADES: GRADES,
    LAYOUTS: LAYOUTS,
    layoutSlots: layoutSlots,
    panelCount: panelCount,
    renderCover: renderCover,
    panelAt: panelAt
  };
})();
