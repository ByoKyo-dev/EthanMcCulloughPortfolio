// Mobile menu
(function () {
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Close' : 'Menu';
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'Menu';
    }
  });
})();

// Work filters
(function () {
  var filters = document.querySelectorAll('.filter');
  var cards = document.querySelectorAll('.work-grid .card');
  filters.forEach(function (f) {
    f.addEventListener('click', function () {
      var want = f.dataset.filter;
      filters.forEach(function (x) { x.setAttribute('aria-pressed', x === f ? 'true' : 'false'); });
      cards.forEach(function (c) {
        var cats = (c.dataset.cats || '').split(' ');
        c.classList.toggle('is-hidden', want !== 'all' && cats.indexOf(want) === -1);
      });
    });
  });
})();

// Contact form -> FormSubmit (https://formsubmit.co) -> your inbox
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var button = form.querySelector('button[type="submit"]');

  function setStatus(msg, kind) {
    status.textContent = msg;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (form.querySelector('[name="_honey"]').value) return; // spam bot

    var data = new FormData(form);
    button.disabled = true;
    setStatus('Sending…');

    fetch(form.dataset.endpoint, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: data
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok && String(res.body.success) === 'true') {
          form.reset();
          setStatus('Thanks! Your message is on its way. I’ll get back to you soon.', 'ok');
        } else {
          throw new Error(res.body && res.body.message);
        }
      })
      .catch(function () {
        setStatus('Your message didn’t send. Check your connection and try again in a moment.', 'err');
      })
      .finally(function () { button.disabled = false; });
  });
})();

// Footer year
document.querySelectorAll('[data-year]').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});
