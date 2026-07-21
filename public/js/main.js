// Gazi Patisserie - main.js
// Populer saatler kadrani, SSS akordiyon ve yorum/degerlendirme akisi.

document.addEventListener('DOMContentLoaded', () => {
  initPopularHours();
  initFAQ();
  initReviews();
  initQR();
  markActiveNav();
});

/* ============ Populer Saatler: Gun Kadrani ============ */
const DAYS = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_SHORT = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];
const HOUR_LABELS = ['06', '09', '12', '15', '18', '21', '00'];

// Saatlik doluluk verisi (0-100), gorsellerdeki egriye gore yaklastirildi.
const POPULAR_HOURS = {
  Pazartesi: [4, 6, 9, 13, 18, 24, 31, 39, 47, 55, 63, 71, 79, 86, 89, 84, 74, 61, 46],
  Sali:      [4, 6, 9, 13, 18, 24, 31, 39, 47, 55, 63, 71, 79, 86, 89, 84, 74, 61, 46],
  Carsamba:  [4, 7, 10, 14, 19, 25, 32, 40, 48, 56, 64, 72, 80, 87, 90, 85, 75, 62, 47],
  Persembe:  [5, 7, 10, 15, 20, 26, 33, 41, 49, 57, 65, 73, 81, 88, 91, 86, 76, 63, 48],
  Cuma:      [6, 9, 13, 19, 26, 34, 42, 50, 58, 68, 78, 88, 94, 96, 95, 89, 78, 62, 44],
  Cumartesi: [7, 11, 16, 23, 31, 40, 49, 58, 68, 80, 90, 96, 98, 94, 85, 73, 58, 43, 30],
  Pazar:     [5, 8, 12, 18, 26, 34, 44, 56, 68, 80, 90, 95, 92, 82, 68, 54, 41, 28, 16]
};

function initPopularHours() {
  const dial = document.querySelector('[data-dial]');
  if (!dial) return;

  const chart = document.querySelector('[data-chart]');
  const labelsEl = document.querySelector('[data-chart-labels]');
  const liveEl = document.querySelector('[data-live]');
  const prevBtn = document.querySelector('[data-hours-prev]');
  const nextBtn = document.querySelector('[data-hours-next]');
  const pointer = document.querySelector('[data-pointer]');

  const today = new Date();
  // JS getDay(): 0=Pazar..6=Cumartesi -> DAYS dizisi Pazartesi'nden basliyor
  const jsDay = today.getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
  let activeIndex = todayIndex;

  // Kadran uzerine 7 gun tikini yerlestir
  const radius = 92;
  DAYS.forEach((day, i) => {
    const angle = (i / 7) * 2 * Math.PI - Math.PI / 2;
    const x = 110 + radius * Math.cos(angle) - 17;
    const y = 110 + radius * Math.sin(angle) - 17;
    const tick = document.createElement('button');
    tick.type = 'button';
    tick.className = 'dial-tick';
    tick.style.left = x + 'px';
    tick.style.top = y + 'px';
    tick.textContent = DAY_SHORT[i];
    tick.setAttribute('aria-label', day + ' populer saatlerini goster');
    tick.addEventListener('click', () => setDay(i));
    dial.appendChild(tick);
  });

  function setDay(index) {
    activeIndex = (index + 7) % 7;
    const day = DAYS[activeIndex];

    // Kadran gostergelerini guncelle
    dial.querySelectorAll('.dial-tick').forEach((t, i) => {
      t.classList.toggle('active', i === activeIndex);
    });
    const angleDeg = (activeIndex / 7) * 360;
    pointer.style.transform = `rotate(${angleDeg}deg)`;

    // Baslik / canli rozet
    document.querySelector('[data-day-title]').textContent = day + ' Gunleri';
    liveEl.textContent = activeIndex === todayIndex ? 'Bugun • Canli' : '';

    // Bar grafik
    const values = POPULAR_HOURS[day];
    chart.innerHTML = '';
    const nowHourSlot = getCurrentHourSlot();
    values.forEach((v, i) => {
      const bar = document.createElement('div');
      bar.className = 'bar' + (activeIndex === todayIndex && i === nowHourSlot ? ' now' : '');
      bar.style.height = Math.max(4, v) + '%';
      bar.title = hourLabelForSlot(i) + ':00 — yaklasik doluluk %' + v;
      chart.appendChild(bar);
    });
  }

  function hourLabelForSlot(i) {
    const hour = (6 + i) % 24;
    return String(hour).padStart(2, '0');
  }

  function getCurrentHourSlot() {
    const h = new Date().getHours();
    const idx = h - 6;
    return idx >= 0 && idx < 19 ? idx : -1;
  }

  labelsEl.innerHTML = HOUR_LABELS.map(h => `<span>${h}</span>`).join('');

  prevBtn.addEventListener('click', () => setDay(activeIndex - 1));
  nextBtn.addEventListener('click', () => setDay(activeIndex + 1));

  setDay(todayIndex);
}

/* ============ SSS Akordiyon (erisilebilirlik/hizmet bilgilerinden) ============ */
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    q.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/* ============ Yorumlar ============ */
function initReviews() {
  const list = document.querySelector('[data-review-list]');
  const form = document.querySelector('[data-review-form]');
  if (!list && !form) return;

  let currentRating = 5;

  if (form) {
    const starButtons = form.querySelectorAll('[data-star]');
    starButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        currentRating = Number(btn.dataset.star);
        starButtons.forEach(b => b.classList.toggle('active', Number(b.dataset.star) <= currentRating));
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.querySelector('[name="name"]').value;
      const comment = form.querySelector('[name="comment"]').value;
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Gonderiliyor...';

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, comment, rating: currentRating })
        });
        if (!res.ok) throw new Error('Sunucu hatasi');
        form.reset();
        currentRating = 5;
        starButtons.forEach(b => b.classList.toggle('active', Number(b.dataset.star) <= 5));
        await loadReviews();
      } catch (err) {
        alert('Yorum gonderilemedi. Lutfen tekrar deneyin.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Yorumu Gonder';
      }
    });
  }

  async function loadReviews() {
    if (!list) return;
    list.innerHTML = '<p class="empty-state">Yorumlar yukleniyor...</p>';
    try {
      const res = await fetch('/api/reviews');
      const reviews = await res.json();
      if (!reviews.length) {
        list.innerHTML = '<p class="empty-state">Henuz yorum yok. Ilk yorumu siz yazin!</p>';
        return;
      }
      list.innerHTML = reviews.map(renderReview).join('');
    } catch (err) {
      list.innerHTML = '<p class="empty-state">Yorumlar yuklenemedi.</p>';
    }
  }

  function renderReview(r) {
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const date = new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    return `
      <article class="review-card">
        <div class="rh">
          <span class="rname">${escapeHTML(r.name)}</span>
          <span class="rstars">${stars}</span>
        </div>
        <div class="rdate">${date}</div>
        <p class="rcomment">${escapeHTML(r.comment)}</p>
        ${r.aiReply ? `<div class="ai-reply"><b>Gazi Patisserie yaniti:</b><br>${escapeHTML(r.aiReply)}</div>` : ''}
      </article>`;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  loadReviews();
}

/* ============ QR Kod (menuye yonlendirir) ============ */
function initQR() {
  const box = document.querySelector('[data-qr]');
  if (!box) return;
  const menuUrl = new URL('menu.html', window.location.href).toString();

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  script.onload = () => {
    // eslint-disable-next-line no-undef
    new QRCode(box, {
      text: menuUrl,
      width: 168,
      height: 168,
      colorDark: '#0f2b2c',
      colorLight: '#f6efe1'
    });
  };
  document.body.appendChild(script);
}

function markActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });
}
