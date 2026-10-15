/* ==========================================================================
   Admin mode
   - Every visitor: reads assets/data/frames.json and applies saved image
     positions (pan + zoom) and cache-busting versions to [data-frame] images.
   - Ethan: the lock button in the corner unlocks admin mode with a password.
     In admin mode each image frame can be dragged, zoomed, reset or replaced.
     "Save changes" commits the new images and frames.json to the GitHub repo
     through the GitHub API, using an access token stored only in this browser.
   The password is a convenience gate (this is a static site); the GitHub
   token is what actually protects the repo.
   ========================================================================== */
(function () {
  'use strict';

  var ROOT = new URL('../../', document.currentScript.src);
  var DATA_PATH = 'assets/data/frames.json';
  var ADMIN_PATH = 'assets/data/admin.json';
  var MAX_EDGE = 2400;   // uploaded images are resized so their long edge is at most this
  var MAX_ZOOM = 4;

  var frames = {};             // repo path -> { x, y, z, v }
  var dirty = new Set();       // repo paths with unsaved position changes
  var pending = new Map();     // repo path -> Blob (replaced image waiting to be saved)
  var adminOn = false;

  // ---------- storage helpers (never throw) ----------
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }

  // ---------- frames ----------
  function allFrames() { return Array.prototype.slice.call(document.querySelectorAll('[data-frame]')); }
  function imgOf(f) { return f.querySelector('img'); }
  function keyOf(f) {
    var img = imgOf(f);
    if (!img.dataset.key) {
      var u = new URL(img.getAttribute('src').split('?')[0], location.href);
      img.dataset.key = decodeURIComponent(u.pathname.slice(ROOT.pathname.length));
      img.dataset.base = u.href;
    }
    return img.dataset.key;
  }
  function state(key) { return frames[key] || (frames[key] = { x: 50, y: 50, z: 1 }); }
  function apply(f) {
    var key = keyOf(f), img = imgOf(f), st = frames[key];
    if (!st) return;
    img.style.setProperty('--fx', st.x + '%');
    img.style.setProperty('--fy', st.y + '%');
    img.style.setProperty('--z', st.z);
    if (st.v && !pending.has(key) && img.src.indexOf('blob:') !== 0) {
      var want = img.dataset.base + '?v=' + st.v;
      if (img.src !== want) img.src = want;
    }
  }
  function applyAll() { allFrames().forEach(apply); }

  function loadFrames(fresh) {
    return fetch(new URL(DATA_PATH, ROOT).href + (fresh ? '?t=' + Date.now() : ''), { cache: fresh ? 'no-store' : 'default' })
      .then(function (r) { return r.ok ? r.json() : { frames: {} }; })
      .then(function (d) { frames = (d && d.frames) || {}; applyAll(); })
      .catch(function () { /* no saved positions yet */ });
  }

  // ---------- styles for admin UI ----------
  var css = `
  .adm-fab { position: fixed; z-index: 90; right: calc(16px + env(safe-area-inset-right, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #34536f; background: #13293d; color: #fff; cursor: pointer;
    display: grid; place-items: center; opacity: .55; box-shadow: 0 6px 20px rgba(0,0,0,.2); transition: opacity .2s, background .2s; }
  .adm-fab:hover, .adm-fab:focus-visible { opacity: 1; background: #1b98e0; border-color: #1b98e0; }
  html.adm-on .adm-fab { display: none; }
  .adm-dialog { border: 0; border-radius: 6px; padding: 0; width: min(440px, calc(100vw - 32px)); color: #231f20; box-shadow: 0 30px 80px rgba(0,0,0,.35); font-family: inherit; }
  .adm-dialog::backdrop { background: rgba(19,41,61,.6); }
  .adm-dialog form { padding: 26px; display: flex; flex-direction: column; gap: 14px; }
  .adm-dialog h2 { margin: 0; font-size: 1.4rem; font-weight: 900; color: #13293d; }
  .adm-dialog p { margin: 0; color: #566574; font-size: .92rem; }
  .adm-dialog label { display: flex; flex-direction: column; gap: 6px; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #13293d; }
  .adm-dialog input { font: inherit; font-size: 1rem; text-transform: none; letter-spacing: 0; font-weight: 400; padding: 11px 12px; border: 1.5px solid #d5dde4; border-radius: 4px; color: #231f20; }
  .adm-dialog input:focus { outline: none; border-color: #1b98e0; box-shadow: 0 0 0 3px rgba(27,152,224,.25); }
  .adm-dialog .adm-row { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 4px; }
  .adm-dialog .adm-err { color: #b3261e; font-size: .9rem; min-height: 1.2em; }
  .adm-dialog ol { margin: 0; padding-left: 20px; color: #566574; font-size: .88rem; display: flex; flex-direction: column; gap: 4px; }
  .adm-dialog hr { border: 0; border-top: 1px solid #d5dde4; margin: 6px 0; width: 100%; }
  .adm-dialog .adm-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .adm-btn { font: inherit; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; cursor: pointer;
    padding: 10px 14px; border-radius: 4px; border: 1.5px solid #13293d; background: #13293d; color: #fff; }
  .adm-btn:hover { background: #1b98e0; border-color: #1b98e0; }
  .adm-btn.ghost { background: transparent; color: #13293d; }
  .adm-btn.ghost:hover { background: #eef4f9; }
  .adm-btn:disabled { opacity: .45; cursor: not-allowed; }

  .adm-bar { position: fixed; z-index: 90; left: 50%; transform: translateX(-50%); bottom: calc(14px + env(safe-area-inset-bottom, 0px));
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; max-width: calc(100vw - 24px);
    background: #13293d; color: #fff; padding: 10px 12px 10px 16px; border-radius: 8px; box-shadow: 0 14px 40px rgba(0,0,0,.35); font-size: .9rem; }
  .adm-bar .adm-tag { font-weight: 900; text-transform: uppercase; letter-spacing: .08em; font-size: .75rem; background: #1b98e0; padding: 4px 8px; border-radius: 3px; }
  .adm-bar .adm-status { color: #b9c7d4; min-width: 10ch; }
  .adm-bar .adm-btn { border-color: #34536f; background: transparent; padding: 8px 12px; }
  .adm-bar .adm-btn:hover { border-color: #fff; background: transparent; }
  .adm-bar .adm-btn.primary { background: #1b98e0; border-color: #1b98e0; }
  .adm-bar .adm-btn.primary:hover { background: #fff; color: #13293d; border-color: #fff; }

  html.adm-on [data-frame] { outline: 2px dashed #1b98e0; outline-offset: -2px; cursor: move; touch-action: none; user-select: none; }
  html.adm-on [data-frame] img { transition: none !important; pointer-events: none; }
  html.adm-on .card:hover .card-media img { transform: scale(var(--z, 1)); }
  html.adm-on [data-frame].adm-changed { outline-style: solid; }
  .adm-tools { position: absolute; z-index: 5; left: 8px; top: 8px; right: 8px; display: none; align-items: center; gap: 6px; flex-wrap: wrap; cursor: default; }
  html.adm-on .adm-tools { display: flex; }
  .adm-tools button, .adm-tools label { font: inherit; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
    background: rgba(19,41,61,.92); color: #fff; border: 0; border-radius: 4px; padding: 7px 10px; box-shadow: 0 0 0 1px rgba(255,255,255,.3), 0 4px 12px rgba(0,0,0,.25); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .adm-tools button:hover, .adm-tools label:hover { background: #1b98e0; }
  .adm-tools input[type=range] { width: 90px; accent-color: #1b98e0; }
  .adm-tools .adm-zoom { cursor: default; }
  .adm-tools .adm-zoom:hover { background: rgba(19,41,61,.92); }
  .adm-tools input[type=file] { display: none; }
  .adm-badge { position: absolute; z-index: 5; right: 8px; bottom: 8px; display: none; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
    background: #fff; color: #13293d; padding: 4px 8px; border-radius: 3px; pointer-events: none; }
  html.adm-on [data-frame].adm-changed .adm-badge { display: block; }
  .adm-toast { position: fixed; z-index: 95; left: 50%; transform: translateX(-50%); bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    background: #fff; color: #13293d; border-left: 4px solid #1b98e0; padding: 12px 16px; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,.25); max-width: calc(100vw - 32px); font-size: .92rem; }
  .adm-toast.err { border-left-color: #b3261e; }
  `;
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  var ICON_LOCK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';

  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  // ---------- toast ----------
  var toastEl, toastT;
  function toast(msg, isErr) {
    if (!toastEl) { toastEl = el('<div class="adm-toast" role="status" hidden></div>'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.className = 'adm-toast' + (isErr ? ' err' : ''); toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, isErr ? 9000 : 5000);
  }

  // ---------- crypto ----------
  function sha256(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  // ---------- floating button + login ----------
  var fab = el('<button class="adm-fab" type="button" aria-label="Admin mode" title="Admin mode">' + ICON_LOCK + '</button>');
  document.body.appendChild(fab);

  var login = el(
    '<dialog class="adm-dialog" aria-labelledby="adm-login-h"><form method="dialog" novalidate>' +
    '<h2 id="adm-login-h">Admin mode</h2>' +
    '<p>Enter your password to position and replace images on the site.</p>' +
    '<label for="adm-pass">Password<input id="adm-pass" type="password" autocomplete="current-password" required></label>' +
    '<p class="adm-err" id="adm-login-err" role="alert"></p>' +
    '<div class="adm-row"><button class="adm-btn ghost" value="cancel" type="button" data-close>Cancel</button><button class="adm-btn" type="submit">Unlock</button></div>' +
    '</form></dialog>');
  document.body.appendChild(login);
  login.querySelector('[data-close]').onclick = function () { login.close(); };
  fab.onclick = function () { login.querySelector('#adm-login-err').textContent = ''; login.showModal(); login.querySelector('#adm-pass').focus(); };
  login.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = login.querySelector('#adm-pass').value;
    if (!pw) { login.querySelector('#adm-login-err').textContent = 'Enter your password.'; return; }
    Promise.all([
      sha256(pw),
      fetch(new URL(ADMIN_PATH, ROOT).href + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); })
    ]).then(function (res) {
      if (res[0] === res[1].passwordHash) {
        login.querySelector('#adm-pass').value = '';
        login.close(); ssSet('adm', '1'); enterAdmin();
      } else {
        login.querySelector('#adm-login-err').textContent = 'That password is incorrect. Try again.';
      }
    }).catch(function () {
      login.querySelector('#adm-login-err').textContent = 'Couldn’t check the password. Open the site from its web address (not as a file) and try again.';
    });
  });

  // ---------- settings ----------
  function cfg() {
    var guess = location.hostname.endsWith('.github.io') ? location.hostname : '';
    return {
      owner: lsGet('adm-owner') || (guess ? guess.split('.')[0] : ''),
      repo: lsGet('adm-repo') || guess,
      branch: lsGet('adm-branch') || 'main',
      token: lsGet('adm-token') || ''
    };
  }
  var settings = el(
    '<dialog class="adm-dialog" aria-labelledby="adm-set-h"><form method="dialog" novalidate>' +
    '<h2 id="adm-set-h">Admin settings</h2>' +
    '<p id="adm-set-msg">Saving writes your changes to your GitHub repository. These details are kept in this browser only.</p>' +
    '<div class="adm-two"><label for="adm-owner">GitHub username<input id="adm-owner" autocomplete="off" spellcheck="false"></label>' +
    '<label for="adm-repo">Repository<input id="adm-repo" autocomplete="off" spellcheck="false"></label></div>' +
    '<div class="adm-two"><label for="adm-branch">Branch<input id="adm-branch" autocomplete="off" spellcheck="false"></label><span></span></div>' +
    '<label for="adm-token">Access token<input id="adm-token" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></label>' +
    '<ol><li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → Fine-grained tokens → Generate new token</a>.</li>' +
    '<li>Under Repository access, choose <b>Only select repositories</b> and pick this site’s repo.</li>' +
    '<li>Under Permissions → Repository permissions, set <b>Contents</b> to <b>Read and write</b>.</li>' +
    '<li>Generate the token, copy it, and paste it here.</li></ol>' +
    '<hr><label for="adm-newpass">New admin password <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span><input id="adm-newpass" type="password" autocomplete="new-password"></label>' +
    '<p class="adm-err" id="adm-set-err" role="alert"></p>' +
    '<div class="adm-row"><button class="adm-btn ghost" type="button" data-close>Cancel</button><button class="adm-btn" type="submit">Save settings</button></div>' +
    '</form></dialog>');
  document.body.appendChild(settings);
  settings.querySelector('[data-close]').onclick = function () { settings.close(); };
  var afterSettings = null;
  function openSettings(msg, then) {
    var c = cfg();
    ['owner', 'repo', 'branch', 'token'].forEach(function (k) { settings.querySelector('#adm-' + k).value = c[k]; });
    settings.querySelector('#adm-newpass').value = '';
    settings.querySelector('#adm-set-err').textContent = '';
    settings.querySelector('#adm-set-msg').textContent = msg || 'Saving writes your changes to your GitHub repository. These details are kept in this browser only.';
    afterSettings = then || null;
    settings.showModal();
  }
  settings.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = {};
    ['owner', 'repo', 'branch', 'token'].forEach(function (k) { v[k] = settings.querySelector('#adm-' + k).value.trim(); });
    if (!v.owner || !v.repo || !v.token) { settings.querySelector('#adm-set-err').textContent = 'Fill in your GitHub username, repository and access token.'; return; }
    lsSet('adm-owner', v.owner); lsSet('adm-repo', v.repo); lsSet('adm-branch', v.branch || 'main'); lsSet('adm-token', v.token);
    var np = settings.querySelector('#adm-newpass').value;
    var next = Promise.resolve();
    if (np) {
      if (np.length < 8) { settings.querySelector('#adm-set-err').textContent = 'Use at least 8 characters for the new password.'; return; }
      next = sha256(np).then(function (h) {
        return putFile(ADMIN_PATH, utf8ToB64(JSON.stringify({ passwordHash: h }, null, 2) + '\n'), 'Change admin password');
      }).then(function () { toast('Password changed. It takes effect in about a minute.'); });
    }
    next.then(function () {
      settings.close();
      if (afterSettings) { var f = afterSettings; afterSettings = null; f(); }
    }).catch(function (err) { settings.querySelector('#adm-set-err').textContent = err.message; });
  });

  // ---------- GitHub API ----------
  function utf8ToB64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function b64ToUtf8(s) { return decodeURIComponent(escape(atob(s.replace(/\s/g, '')))); }
  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(blob);
    });
  }
  function apiError(r) {
    if (r.status === 401) return new Error('GitHub didn’t accept the access token. Paste a new one in Settings.');
    if (r.status === 403) return new Error('The access token can’t write to this repository. Give it Contents: Read and write.');
    if (r.status === 404) return new Error('GitHub couldn’t find that repository or branch. Check them in Settings.');
    if (r.status === 409 || r.status === 422) return new Error('GitHub reported a conflict. Save again in a moment.');
    return new Error('GitHub returned an error (' + r.status + '). Try saving again.');
  }
  function api(path, opts) {
    var c = cfg();
    var url = 'https://api.github.com/repos/' + encodeURIComponent(c.owner) + '/' + encodeURIComponent(c.repo) +
      '/contents/' + path.split('/').map(encodeURIComponent).join('/') + (opts && opts.method ? '' : '?ref=' + encodeURIComponent(c.branch));
    return fetch(url, Object.assign({ cache: 'no-store' }, opts || {}, {
      headers: { 'Authorization': 'Bearer ' + c.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    })).catch(function () { throw new Error('Couldn’t reach GitHub. Check your connection and try again.'); });
  }
  function getFile(path) {
    return api(path).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw apiError(r);
      return r.json();
    });
  }
  function putFile(path, b64, message, knownSha) {
    var shaP = knownSha !== undefined ? Promise.resolve(knownSha) : getFile(path).then(function (f) { return f ? f.sha : null; });
    return shaP.then(function (sha) {
      var body = { message: message, content: b64, branch: cfg().branch };
      if (sha) body.sha = sha;
      return api(path, { method: 'PUT', body: JSON.stringify(body) });
    }).then(function (r) { if (!r.ok) throw apiError(r); return r.json(); });
  }

  // ---------- admin bar ----------
  var bar, statusEl, saveBtn;
  function buildBar() {
    bar = el('<div class="adm-bar" role="region" aria-label="Admin mode">' +
      '<span class="adm-tag">Admin</span><span class="adm-status" aria-live="polite"></span>' +
      '<button class="adm-btn" type="button" data-act="settings">Settings</button>' +
      '<button class="adm-btn primary" type="button" data-act="save" disabled>Save changes</button>' +
      '<button class="adm-btn" type="button" data-act="exit">Exit</button></div>');
    document.body.appendChild(bar);
    statusEl = bar.querySelector('.adm-status'); saveBtn = bar.querySelector('[data-act=save]');
    bar.querySelector('[data-act=settings]').onclick = function () { openSettings(); };
    bar.querySelector('[data-act=save]').onclick = save;
    bar.querySelector('[data-act=exit]').onclick = exitAdmin;
  }
  function count() { var s = new Set(dirty); pending.forEach(function (_, k) { s.add(k); }); return s.size; }
  function refresh() {
    var n = count();
    statusEl.textContent = n ? n + ' unsaved ' + (n === 1 ? 'change' : 'changes') : 'Drag or zoom any image';
    saveBtn.disabled = n === 0;
    allFrames().forEach(function (f) {
      var k = keyOf(f); f.classList.toggle('adm-changed', dirty.has(k) || pending.has(k));
    });
  }

  // ---------- frame tools ----------
  function addTools(f) {
    if (f.querySelector('.adm-tools')) return;
    var key = keyOf(f);
    var tools = el('<div class="adm-tools">' +
      '<label>Replace<input type="file" accept="image/*"></label>' +
      '<span class="adm-zoom" style="display:inline-flex;align-items:center;gap:6px;background:rgba(19,41,61,.92);box-shadow:0 0 0 1px rgba(255,255,255,.3),0 4px 12px rgba(0,0,0,.25);color:#fff;border-radius:4px;padding:5px 10px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Zoom<input type="range" min="100" max="' + (MAX_ZOOM * 100) + '" step="1" aria-label="Zoom"></span>' +
      '<button type="button" data-act="reset">Reset</button></div>');
    var badge = el('<span class="adm-badge">Unsaved</span>');
    f.appendChild(tools); f.appendChild(badge);
    var range = tools.querySelector('input[type=range]');
    range.value = Math.round(state(key).z * 100);
    ['pointerdown', 'click', 'dblclick'].forEach(function (t) { tools.addEventListener(t, function (e) { e.stopPropagation(); }); });
    range.addEventListener('input', function () { var st = state(key); st.z = range.value / 100; touched(f); });
    tools.querySelector('[data-act=reset]').onclick = function (e) {
      e.preventDefault(); var st = state(key); st.x = 50; st.y = 50; st.z = 1; range.value = 100; touched(f);
    };
    tools.querySelector('input[type=file]').addEventListener('change', function (e) {
      var file = e.target.files[0]; e.target.value = '';
      if (file) replaceImage(f, file);
    });
  }
  function touched(f) { var k = keyOf(f); dirty.add(k); apply(f); refresh(); }

  function replaceImage(f, file) {
    if (!/^image\//.test(file.type)) { toast('That file isn’t an image. Choose a JPG, PNG or WebP.', true); return; }
    var key = keyOf(f), img = imgOf(f);
    var url = URL.createObjectURL(file), src = new Image();
    src.onload = function () {
      var k = Math.min(1, MAX_EDGE / Math.max(src.naturalWidth, src.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.round(src.naturalWidth * k); c.height = Math.round(src.naturalHeight * k);
      var cx = c.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height);
      cx.imageSmoothingQuality = 'high'; cx.drawImage(src, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (blob) {
        pending.set(key, blob);
        var st = state(key); st.x = 50; st.y = 50; st.z = 1;
        var r = f.querySelector('.adm-tools input[type=range]'); if (r) r.value = 100;
        img.removeAttribute('srcset'); img.src = URL.createObjectURL(blob);
        touched(f);
        var fw = f.clientWidth, need = fw * (window.devicePixelRatio || 1);
        if (c.width < need * 0.8) toast('This image is small for this frame and may look soft. Use a larger original if you have one.', true);
      }, 'image/jpeg', 0.86);
    };
    src.onerror = function () { toast('That image couldn’t be opened. Try exporting it as a JPG or PNG.', true); };
    src.src = url;
  }

  // drag to pan: keeps the frame fully covered at every position
  var drag = null;
  function onDown(e) {
    if (!adminOn || e.button > 0) return;
    var f = e.currentTarget, img = imgOf(f);
    if (!img.naturalWidth) return;
    e.preventDefault();
    var key = keyOf(f), st = state(key);
    var fw = f.clientWidth, fh = f.clientHeight;
    var s = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
    var ox = img.naturalWidth * s - fw, oy = img.naturalHeight * s - fh;
    drag = { f: f, key: key, sx: e.clientX, sy: e.clientY, x0: st.x, y0: st.y,
      kx: fw * (st.z - 1) + ox * st.z, ky: fh * (st.z - 1) + oy * st.z, id: e.pointerId };
    f.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var st = state(drag.key);
    if (drag.kx > 0.5) st.x = Math.min(100, Math.max(0, drag.x0 - (e.clientX - drag.sx) / drag.kx * 100));
    if (drag.ky > 0.5) st.y = Math.min(100, Math.max(0, drag.y0 - (e.clientY - drag.sy) / drag.ky * 100));
    st.x = Math.round(st.x * 10) / 10; st.y = Math.round(st.y * 10) / 10;
    touched(drag.f);
  }
  function onUp() { drag = null; }

  // block links (project cards) while editing
  document.addEventListener('click', function (e) {
    if (adminOn && e.target.closest('[data-frame]')) { e.preventDefault(); }
  }, true);

  window.addEventListener('beforeunload', function (e) {
    if (adminOn && count()) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- save ----------
  var saving = false;
  function save() {
    if (saving || !count()) return;
    var c = cfg();
    if (!c.owner || !c.repo || !c.token) { openSettings('Add your GitHub details once, then your changes will save.', save); return; }
    saving = true; saveBtn.disabled = true;
    var keys = Array.from(pending.keys());
    var stamp = Date.now().toString(36);
    var chain = Promise.resolve(), done = 0, total = keys.length + 1;
    statusEl.textContent = 'Saving…';
    keys.forEach(function (key) {
      chain = chain.then(function () {
        statusEl.textContent = 'Uploading image ' + (++done) + ' of ' + (total - 1) + '…';
        return blobToB64(pending.get(key)).then(function (b64) { return putFile(key, b64, 'Replace ' + key); });
      }).then(function () { state(key).v = stamp; dirty.add(key); pending.delete(key); });
    });
    chain.then(function () {
      statusEl.textContent = 'Saving positions…';
      return getFile(DATA_PATH);
    }).then(function (file) {
      var data = { frames: {} };
      if (file && file.content) { try { data = JSON.parse(b64ToUtf8(file.content)); data.frames = data.frames || {}; } catch (e) {} }
      dirty.forEach(function (k) { data.frames[k] = frames[k]; });
      return putFile(DATA_PATH, utf8ToB64(JSON.stringify(data, null, 2) + '\n'), 'Update image positions', file ? file.sha : null);
    }).then(function () {
      dirty.clear(); saving = false; refresh();
      statusEl.textContent = 'Saved';
      toast('Saved. Your changes will be live on the site in about a minute.');
    }).catch(function (err) {
      saving = false; refresh();
      toast(err.message, true);
      if (/token|Settings/.test(err.message)) openSettings(err.message);
    });
  }

  // ---------- enter / exit ----------
  function enterAdmin() {
    adminOn = true;
    document.documentElement.classList.add('adm-on');
    if (!bar) buildBar();
    bar.hidden = false;
    loadFrames(true).then(function () {
      allFrames().forEach(function (f) {
        addTools(f);
        var r = f.querySelector('.adm-tools input[type=range]'); if (r) r.value = Math.round(state(keyOf(f)).z * 100);
        if (!f.dataset.admBound) {
          f.addEventListener('pointerdown', onDown); f.addEventListener('pointermove', onMove);
          f.addEventListener('pointerup', onUp); f.addEventListener('pointercancel', onUp);
          f.dataset.admBound = '1';
        }
        // load lazy images now so they can be dragged
        var img = imgOf(f); if (img.loading === 'lazy') img.loading = 'eager';
      });
      refresh();
    });
  }
  function exitAdmin() {
    if (count() && !window.__admConfirmExit) {
      window.__admConfirmExit = true;
      toast('You have unsaved changes. Click Exit again to discard them, or Save changes first.', true);
      setTimeout(function () { window.__admConfirmExit = false; }, 6000);
      return;
    }
    window.__admConfirmExit = false;
    adminOn = false; ssSet('adm', null);
    document.documentElement.classList.remove('adm-on');
    if (bar) bar.hidden = true;
    if (count()) {
      pending.clear(); dirty.clear();
      allFrames().forEach(function (f) { var img = imgOf(f); if (img.dataset.base) img.src = img.dataset.base; });
      loadFrames(true);
    }
  }

  // ---------- boot ----------
  allFrames().forEach(keyOf);
  if (ssGet('adm') === '1') enterAdmin(); else loadFrames(false);
})();
