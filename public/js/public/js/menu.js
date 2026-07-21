// Gazi Patisserie - menu.js
// menu.json'u ceker, kategorilere gore render eder ve fiyat bilgisi
// girilmemis urunler icin "Fiyat icin sorunuz" notu gosterir.

document.addEventListener('DOMContentLoaded', loadMenu);

async function loadMenu() {
  const root = document.querySelector('[data-menu-root]');
  const navEl = document.querySelector('[data-menu-nav]');

  try {
    const res = await fetch('/api/menu');
    const menu = await res.json();

    if (!menu.categories || !menu.categories.length) {
      root.innerHTML = '<div class="wrap" style="padding:60px 0;text-align:center;">Menu henuz eklenmedi.</div>';
      return;
    }

    navEl.innerHTML = menu.categories
      .map(c => `<button data-nav-target="${c.id}">${c.title}</button>`)
      .join('');

    root.innerHTML = menu.categories.map(renderCategory).join('');

    navEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.navTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const sections = menu.categories.map(c => document.getElementById(c.id));
    const navButtons = [...navEl.querySelectorAll('button')];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navButtons.forEach(b => b.classList.remove('active'));
          const match = navEl.querySelector(`[data-nav-target="${entry.target.id}"]`);
          if (match) match.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach(s => s && observer.observe(s));

  } catch (err) {
    root.innerHTML = '<div class="wrap" style="padding:60px 0;text-align:center;">Menu yuklenirken bir sorun olustu.</div>';
    console.error(err);
  }
}

function renderCategory(cat) {
  return `
    <section class="menu-category" id="${cat.id}">
      <div class="wrap">
        <h2>${escapeHTML(cat.title)}</h2>
        <p>${escapeHTML(cat.description || '')}</p>
        <div class="menu-items">
          ${cat.items.map(renderItem).join('')}
        </div>
      </div>
    </section>`;
}

function renderItem(item) {
  const price = (item.price === null || item.price === undefined || item.price === '')
    ? '<span class="menu-price" style="color:#8a8072;">Fiyat icin sorunuz</span>'
    : `<span class="menu-price">₺${escapeHTML(String(item.price))}</span>`;

  return `
    <article class="menu-card">
      <img src="images/${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" loading="lazy">
      <div class="menu-card-body">
        <h3>${escapeHTML(item.name)} ${price}</h3>
        <p>${escapeHTML(item.description || '')}</p>
      </div>
    </article>`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHTML(str).replace(/"/g, '&quot;');
}
