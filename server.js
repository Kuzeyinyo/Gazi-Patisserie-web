// Gazi Patisserie - server.js
// Basit Express sunucusu: statik siteyi servis eder, yorum/degerlendirme
// API'sini yonetir ve yeni yorumlara Gemini AI ile otomatik cevap uretir.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const REVIEWS_PATH = path.join(__dirname, 'data', 'reviews.json');
const MENU_PATH = path.join(__dirname, 'data', 'menu.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Yardimci fonksiyonlar ----------

function readJSON(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  if (!ADMIN_API_KEY || key !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Yetkisiz. Gecerli x-admin-key basligi gerekli.' });
  }
  next();
}

// Gemini API'sine yorum metnini gonderip isletme adina kisa, sicak bir
// yanit uretir. GEMINI_API_KEY tanimli degilse nazik bir varsayilan
// yanit doner, boylece site anahtar olmadan da calisir.
async function generateAIReply({ name, rating, comment }) {
  const fallback = rating && rating <= 2
    ? `Merhaba ${name || ''}, geri bildiriminiz icin tesekkur ederiz. Yasadiginiz aksakligi duyduğumuza uzulduk, en kisa surede telafi etmek isteriz. Bizi ${'0507 610 31 53'} numarasindan arayabilirsiniz.`
    : `Merhaba ${name || ''}, guzel yorumunuz icin cok tesekkur ederiz! Sizi yine agirlamak icin sabirsizlaniyoruz. - Gazi Patisserie`;

  if (!GEMINI_API_KEY) {
    return fallback;
  }

  try {
    const prompt = `Sen Ankara Mamak'ta bulunan "Gazi Patisserie" adli pastane ve kafenin sosyal medya/yorum
yoneticisisin. Asagida bir musteri yorumu var. Isletme adina, samimi, kisa (en fazla 3 cumle),
turkce ve saygili bir yanit yaz. Sikayet varsa ozur dile ve cozum onerisi sun (telefon: 0507 610 31 53).
Ovgu varsa tesekkur et. Sadece yanit metnini yaz, baska aciklama ekleme.

Musteri adi: ${name || 'Misafir'}
Puan (5 uzerinden): ${rating || 'belirtilmemis'}
Yorum: "${comment}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API hatasi:', response.status, await response.text());
      return fallback;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return (text && text.trim()) || fallback;
  } catch (err) {
    console.error('Gemini cagrisi basarisiz:', err);
    return fallback;
  }
}

// ---------- API rotalari ----------

// Menuyu getir
app.get('/api/menu', (req, res) => {
  const menu = readJSON(MENU_PATH, { categories: [] });
  res.json(menu);
});

// Tum yorumlari getir (en yeni once)
app.get('/api/reviews', (req, res) => {
  const reviews = readJSON(REVIEWS_PATH, []);
  res.json(reviews.slice().reverse());
});

// Yeni yorum ekle + Gemini AI otomatik cevap uret
app.post('/api/reviews', async (req, res) => {
  const { name, rating, comment } = req.body || {};

  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return res.status(400).json({ error: 'Yorum metni bos olamaz.' });
  }

  const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));

  const review = {
    id: crypto.randomUUID(),
    name: (name && name.trim()) || 'Misafir',
    rating: numericRating,
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
    aiReply: null
  };

  const reviews = readJSON(REVIEWS_PATH, []);
  reviews.push(review);
  writeJSON(REVIEWS_PATH, reviews);

  // Yaniti uret ve kaydi guncelle (kullanici bekletilmeden de yapilabilir,
  // basitlik icin burada senkron akista birlikte donduruyoruz).
  const aiReply = await generateAIReply(review);
  review.aiReply = aiReply;
  const updated = readJSON(REVIEWS_PATH, []);
  const idx = updated.findIndex(r => r.id === review.id);
  if (idx !== -1) {
    updated[idx].aiReply = aiReply;
    writeJSON(REVIEWS_PATH, updated);
  }

  res.status(201).json(review);
});

// Bir yorumu sil (sadece admin)
app.delete('/api/reviews/:id', requireAdmin, (req, res) => {
  const reviews = readJSON(REVIEWS_PATH, []);
  const next = reviews.filter(r => r.id !== req.params.id);
  writeJSON(REVIEWS_PATH, next);
  res.json({ ok: true });
});

// Admin: bir yoruma AI yanitini yeniden uret
app.post('/api/reviews/:id/regenerate', requireAdmin, async (req, res) => {
  const reviews = readJSON(REVIEWS_PATH, []);
  const review = reviews.find(r => r.id === req.params.id);
  if (!review) return res.status(404).json({ error: 'Yorum bulunamadi.' });

  review.aiReply = await generateAIReply(review);
  writeJSON(REVIEWS_PATH, reviews);
  res.json(review);
});

app.listen(PORT, () => {
  console.log(`Gazi Patisserie sunucusu http://localhost:${PORT} adresinde calisiyor`);
});
