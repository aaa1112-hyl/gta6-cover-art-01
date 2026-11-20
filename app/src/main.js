/* Sunset Cover Studio — editor wiring: photos, panels, caption, export.
   The poster itself is drawn by CoverArt.renderCover in cover.js. */
(function () {
  'use strict';

  var SIZES = {
    '1080x1080': [1080, 1080],
    '1080x1350': [1080, 1350],
    '1920x1080': [1920, 1080]
  };

  var canvas = document.getElementById('coverCanvas');
  var ctx = canvas.getContext('2d');
  var photoInput = document.getElementById('photoInput');
  var photoList = document.getElementById('photoList');
  var titleInput = document.getElementById('titleInput');
  var subtitleInput = document.getElementById('subtitleInput');
  var zoomSlider = document.getElementById('zoomSlider');
  var panelSeg = document.getElementById('panelSeg');
  var sizeLabel = document.getElementById('sizeLabel');
  var exportBtn = document.getElementById('exportBtn');

  var state = {
    title: 'SUNSET DRIVE',
    subtitle: 'NEON NIGHTS \u2022 OCEAN DRIVE',
    layout: 'hero2',
    grade: 'sunset',
    size: '1080x1080',
    photos: [],
    panels: []
  };
  var selectedPanel = 0;
  var fontsReady = false;

  function defaultPanels() {
    var n = CoverArt.panelCount(state.layout);
    var panels = [];
    for (var i = 0; i < n; i++) {
      panels.push({ photo: state.photos.length ? 0 : -1, zoom: 1, ox: 0, oy: 0 });
    }
    return panels;
  }

  function syncPanels() {
    var n = CoverArt.panelCount(state.layout);
    var next = [];
    for (var i = 0; i < n; i++) {
      var old = state.panels[i];
      if (old) {
        next.push(old);
      } else {
        next.push({ photo: state.photos.length ? 0 : -1, zoom: 1, ox: 0, oy: 0 });
      }
    }
    state.panels = next;
    if (selectedPanel >= n) selectedPanel = 0;
  }

  function render() {
    var size = SIZES[state.size] || SIZES['1080x1080'];
    if (canvas.width !== size[0] || canvas.height !== size[1]) {
      canvas.width = size[0];
      canvas.height = size[1];
    }
    CoverArt.renderCover(ctx, size[0], size[1], state);
    sizeLabel.textContent = size[0] + ' \u00d7 ' + size[1];
    renderPanelSeg();
    var panel = state.panels[selectedPanel];
    if (panel) zoomSlider.value = String(panel.zoom || 1);
  }

  function renderPanelSeg() {
    panelSeg.innerHTML = '';
    for (var i = 0; i < state.panels.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Panel ' + (i + 1);
      b.dataset.panel = String(i);
      if (i === selectedPanel) b.classList.add('active');
      b.addEventListener('click', function (e) {
        selectedPanel = Number(e.currentTarget.dataset.panel);
        render();
      });
      panelSeg.appendChild(b);
    }
  }

  function renderPhotoList() {
    photoList.innerHTML = '';
    state.photos.forEach(function (p, i) {
      var img = document.createElement('img');
      img.src = p.dataUrl;
      img.alt = p.name;
      img.title = p.name + ' — click to put it in the selected panel';
      if (state.panels[selectedPanel] && state.panels[selectedPanel].photo === i) {
        img.classList.add('selected');
      }
      img.addEventListener('click', function () {
        if (state.panels[selectedPanel]) {
          state.panels[selectedPanel].photo = i;
          state.panels[selectedPanel].zoom = 1;
          state.panels[selectedPanel].ox = 0;
          state.panels[selectedPanel].oy = 0;
          render();
          renderPhotoList();
        }
      });
      photoList.appendChild(img);
    });
  }

  function addFiles(files) {
    var list = Array.prototype.slice.call(files || []);
    var pending = list.filter(function (f) { return f.type.indexOf('image/') === 0; });
    if (!pending.length) return;
    // Keep the chosen order: store each photo in its input slot, since
    // FileReader/Image loads finish in any order.
    var slots = new Array(pending.length);
    var loaded = 0;
    pending.forEach(function (file, index) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          slots[index] = { img: img, dataUrl: reader.result, name: file.name };
          loaded++;
          if (loaded === pending.length) {
            slots.forEach(function (p) { state.photos.push(p); });
            // First photos fill empty panels in order, cycling when there
            // are fewer photos than panels, so no panel stays empty.
            var pi = 0;
            state.panels.forEach(function (panel) {
              if (panel.photo < 0 && state.photos.length) {
                panel.photo = pi % state.photos.length;
                pi++;
              }
            });
            render();
            renderPhotoList();
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function canvasPoint(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
      scale: canvas.width / r.width
    };
  }

  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    var p = canvasPoint(e);
    var idx = CoverArt.panelAt(state, canvas.width, canvas.height, p.x, p.y);
    if (idx < 0) return;
    selectedPanel = idx;
    var panel = state.panels[idx];
    drag = { x: e.clientX, y: e.clientY, ox: panel.ox || 0, oy: panel.oy || 0, scale: p.scale };
    canvas.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
    render();
    renderPhotoList();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var panel = state.panels[selectedPanel];
    if (!panel || typeof panel.photo !== 'number' || panel.photo < 0) return;
    var photo = state.photos[panel.photo];
    if (!photo || !photo.img.naturalWidth) return;
    var slots = CoverArt.layoutSlots(state.layout);
    var s = slots[selectedPanel];
    var rectW = s.w * canvas.width, rectH = s.h * canvas.height;
    var base = Math.max(rectW / photo.img.naturalWidth, rectH / photo.img.naturalHeight);
    var scale = base * (panel.zoom || 1);
    var overX = Math.max(0, (photo.img.naturalWidth * scale - rectW) / 2);
    var overY = Math.max(0, (photo.img.naturalHeight * scale - rectH) / 2);
    var dx = (e.clientX - drag.x) * drag.scale;
    var dy = (e.clientY - drag.y) * drag.scale;
    panel.ox = overX > 0 ? Math.max(-1, Math.min(1, drag.ox + dx / overX)) : 0;
    panel.oy = overY > 0 ? Math.max(-1, Math.min(1, drag.oy + dy / overY)) : 0;
    render();
  });
  function endDrag() {
    drag = null;
    canvas.classList.remove('dragging');
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', function (e) {
    var p = canvasPoint(e);
    var idx = CoverArt.panelAt(state, canvas.width, canvas.height, p.x, p.y);
    if (idx < 0) return;
    e.preventDefault();
    selectedPanel = idx;
    var panel = state.panels[idx];
    panel.zoom = Math.max(1, Math.min(2.5, (panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.92)));
    render();
  }, { passive: false });

  // Drag a photo file straight onto the preview.
  canvas.addEventListener('dragover', function (e) { e.preventDefault(); });
  canvas.addEventListener('drop', function (e) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  });

  photoInput.addEventListener('change', function () {
    addFiles(photoInput.files);
    photoInput.value = '';
  });
  titleInput.addEventListener('input', function () {
    state.title = titleInput.value;
    render();
  });
  subtitleInput.addEventListener('input', function () {
    state.subtitle = subtitleInput.value;
    render();
  });
  zoomSlider.addEventListener('input', function () {
    var panel = state.panels[selectedPanel];
    if (panel) {
      panel.zoom = Number(zoomSlider.value);
      render();
    }
  });

  function bindSeg(id, key) {
    var seg = document.getElementById(id);
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (x) {
        x.classList.remove('active');
      });
      b.classList.add('active');
      state[key] = b.dataset[key];
      if (key === 'layout') syncPanels();
      render();
    });
  }
  bindSeg('layoutSeg', 'layout');
  bindSeg('gradeSeg', 'grade');
  bindSeg('sizeSeg', 'size');

  exportBtn.addEventListener('click', function () {
    var size = SIZES[state.size] || SIZES['1080x1080'];
    var off = document.createElement('canvas');
    off.width = size[0];
    off.height = size[1];
    CoverArt.renderCover(off.getContext('2d'), size[0], size[1], state);
    off.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sunset-cover-' + state.size + '.png';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);
    }, 'image/png');
  });

  // First render once the poster font is loaded, so the title never falls back.
  state.panels = defaultPanels();
  function boot() {
    if (document.fonts && document.fonts.load) {
      document.fonts.load('100px Anton').then(function () {
        fontsReady = true;
        render();
      }).catch(function () { render(); });
    } else {
      render();
    }
    render();
  }
  boot();
})();
