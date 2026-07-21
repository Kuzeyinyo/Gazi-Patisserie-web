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
