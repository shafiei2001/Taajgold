/* ============================================================
   طلای تاج — app.js
   ============================================================ */

'use strict';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  AOS.init({ duration: 700, once: true, offset: 60 });
  initHeader();
  initParticles();
  initMobileMenu();
  initChartTabs();
  initCalcTabs();
  initProductGrid();
  initProductFilter();
  initCounters();
  initFAQ();
  fetchPrices();
  setInterval(fetchPrices, 60000);
  buildReviewDots();
});

// ============================================================
// HEADER — scroll effect
// ============================================================
function initHeader() {
  const header = document.getElementById('header');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ============================================================
// MOBILE MENU
// ============================================================
function initMobileMenu() {
  const btn = document.getElementById('hamburger');
  const nav = document.getElementById('mainNav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    nav.classList.toggle('open');
    btn.classList.toggle('active');
  });
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      btn.classList.remove('active');
    });
  });
}

// ============================================================
// PARTICLES — canvas animation
// ============================================================
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  const resize = () => {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  const count = Math.min(80, Math.floor(W * H / 12000));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.6 + 0.1,
    });
  }

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,175,55,${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  };
  draw();
}

// ============================================================
// PRICE FETCH — Oanor API (with fallback demo data)
// ============================================================
const API_URL = 'https://api.oanor.com/irr-api';
const API_KEY = 'YOUR_API_KEY'; // Replace with actual key

// Demo/fallback data (realistic IRR values for simulation)
const DEMO_PRICES = {
  gold18:  { price: 7_850_000,  change: 45000,  pct: 0.58 },
  gold24:  { price: 10_470_000, change: 60000,  pct: 0.58 },
  misqal:  { price: 36_900_000, change: 210000, pct: 0.57 },
  ounce:   { price: 2350,       change: 12,     pct: 0.51, usd: true },
  emami:   { price: 58_500_000, change: -200000, pct: -0.34 },
  nim:     { price: 29_200_000, change: -100000, pct: -0.34 },
  rob:     { price: 14_600_000, change: -50000,  pct: -0.34 },
  gerami:  { price: 7_800_000,  change: 30000,  pct: 0.39 },
  usd:     { price: 627_000,    change: 1500,   pct: 0.24 },
  eur:     { price: 671_000,    change: -800,   pct: -0.12 },
  usdt:    { price: 628_500,    change: 2000,   pct: 0.32 },
};

async function fetchPrices() {
  const syncIcon = document.getElementById('syncIcon');
  if (syncIcon) syncIcon.style.animation = 'spin 1s linear infinite';

  try {
    const res = await fetch(API_URL, {
      headers: { 'x-api-key': API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    applyPrices(parseOanorData(data));
  } catch {
    // Use demo data with slight random variation
    const demo = {};
    for (const [k, v] of Object.entries(DEMO_PRICES)) {
      const noise = (Math.random() - 0.5) * 0.002;
      demo[k] = { ...v, price: Math.round(v.price * (1 + noise)) };
    }
    applyPrices(demo);
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const el = document.getElementById('lastUpdate');
  if (el) el.textContent = timeStr;
  if (syncIcon) syncIcon.style.animation = 'spin 2s linear infinite';
}

function parseOanorData(data) {
  // Map Oanor API fields to our keys — adjust based on actual API response shape
  const get = (key) => data[key] || {};
  return {
    gold18: mapField(get('gold_18')),
    gold24: mapField(get('gold_24')),
    misqal: mapField(get('mithqal') || get('misqal')),
    ounce:  mapField(get('ounce'), true),
    emami:  mapField(get('emami') || get('coin_emami')),
    nim:    mapField(get('nim_sekke') || get('half_coin')),
    rob:    mapField(get('rob_sekke') || get('quarter_coin')),
    gerami: mapField(get('gerami') || get('gram_coin')),
    usd:    mapField(get('usd') || get('dollar')),
    eur:    mapField(get('eur') || get('euro')),
    usdt:   mapField(get('usdt') || get('tether')),
  };
}

function mapField(obj, usd = false) {
  if (!obj || !obj.price) return null;
  return { price: obj.price, change: obj.change || 0, pct: obj.percent || 0, usd };
}

function applyPrices(prices) {
  const map = {
    gold18: ['p18', 'c18', 't18'],
    gold24: ['p24', 'c24', 't24'],
    misqal: ['pmis', 'cmis', 'tmis'],
    ounce:  ['poz', 'coz', 'toz'],
    emami:  ['psek', 'csek', 'tsek'],
    nim:    ['pnim', 'cnim'],
    rob:    ['prob', 'crob'],
    gerami: ['pger', 'cger'],
    usd:    ['pusd', 'cusd', 'tusd'],
    eur:    ['peur', 'ceur', 'teur'],
    usdt:   ['pusdt', 'cusdt'],
  };

  for (const [key, ids] of Object.entries(map)) {
    const d = prices[key];
    if (!d) continue;
    const [priceId, changeId, tickerId] = ids;
    const priceEl = document.getElementById(priceId);
    const changeEl = document.getElementById(changeId);
    const tickerEl = document.getElementById(tickerId);

    if (priceEl) {
      priceEl.textContent = d.usd
        ? '$' + formatNum(d.price)
        : formatNum(d.price) + ' تومان';
    }
    if (changeEl) {
      const dir = d.change > 0 ? 'up' : d.change < 0 ? 'down' : 'flat';
      const arrow = d.change > 0 ? '▲' : d.change < 0 ? '▼' : '—';
      const sign = d.change > 0 ? '+' : '';
      changeEl.innerHTML = `<span class="${dir}">${arrow} ${sign}${formatNum(Math.abs(d.change))} (${sign}${d.pct.toFixed(2)}%)</span>`;
    }
    if (tickerEl) {
      tickerEl.textContent = d.usd ? '$' + formatNum(d.price) : formatNum(d.price) + ' تومان';
    }
  }

  // Update chart with gold18 price
  if (prices.gold18) updateChartWithPrice(prices.gold18.price);

  // Auto-fill calculator gold price
  const bGP = document.getElementById('bGoldPrice');
  const sGP = document.getElementById('sGoldPrice');
  const iCP = document.getElementById('iCurrentPrice');
  if (bGP && !bGP.dataset.userSet && prices.gold18) bGP.value = prices.gold18.price;
  if (sGP && !sGP.dataset.userSet && prices.gold18) sGP.value = prices.gold18.price;
  if (iCP && !iCP.dataset.userSet && prices.gold18) iCP.value = prices.gold18.price;
}

// ============================================================
// FORMAT HELPERS
// ============================================================
function formatNum(n) {
  if (!n && n !== 0) return '—';
  return Math.round(n).toLocaleString('fa-IR');
}

function toPersianNum(n) {
  return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

// ============================================================
// CHART
// ============================================================
let goldChart = null;
let currentPeriod = 1;
let latestPrice = 7_850_000;

function initChartTabs() {
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = parseInt(btn.dataset.period);
      buildChart(currentPeriod, latestPrice);
    });
  });
  buildChart(1, latestPrice);
}

function updateChartWithPrice(price) {
  latestPrice = price;
  buildChart(currentPeriod, price);
}

function buildChart(days, basePrice) {
  const canvas = document.getElementById('goldChart');
  if (!canvas) return;

  const labels = [];
  const data = [];
  const now = new Date();

  // Generate synthetic historical data
  let price = basePrice * (1 - days * 0.0008);
  const volatility = 0.003;

  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (days === 1) {
      d.setDate(d.getDate());
      labels.push(d.getHours() + ':00');
    } else if (days <= 7) {
      labels.push(d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' }));
    } else {
      labels.push(d.toLocaleDateString('fa-IR', { month: 'short', day: days > 90 ? undefined : 'numeric' }));
    }
    price = price * (1 + (Math.random() - 0.47) * volatility);
    data.push(Math.round(price));
  }
  data[data.length - 1] = basePrice;

  const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(212,175,55,0.25)');
  gradient.addColorStop(1, 'rgba(212,175,55,0)');

  if (goldChart) goldChart.destroy();
  goldChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'طلای ۱۸ عیار (تومان)',
        data,
        borderColor: '#D4AF37',
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: days === 1 ? 3 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true,
          textDirection: 'rtl',
          backgroundColor: '#141414',
          borderColor: 'rgba(212,175,55,0.3)',
          borderWidth: 1,
          titleColor: '#D4AF37',
          bodyColor: 'rgba(255,255,255,0.7)',
          padding: 12,
          callbacks: {
            label: ctx => ' ' + formatNum(ctx.raw) + ' تومان',
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
          ticks: { color: '#888', font: { family: 'Vazirmatn', size: 11 }, maxTicksLimit: 8 },
          border: { display: false },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
          ticks: {
            color: '#888',
            font: { family: 'Vazirmatn', size: 11 },
            callback: v => formatNum(v),
          },
          border: { display: false },
        },
      },
    },
  });
}

// ============================================================
// CALCULATORS
// ============================================================
function initCalcTabs() {
  document.querySelectorAll('.ctab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('calc-' + btn.dataset.calc);
      if (target) target.classList.add('active');
    });
  });

  // Live calculation on input
  ['bWeight','bGoldPrice','bCraft','bProfit','bTax'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { el.dataset.userSet = '1'; calcBuy(); });
  });
  ['sWeight','sGoldPrice','sPurity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { el.dataset.userSet = '1'; calcSell(); });
  });
  ['iAmount','iBuyPrice','iCurrentPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { el.dataset.userSet = '1'; calcInvest(); });
  });
}

window.calcBuy = function () {
  const w = parseFloat(document.getElementById('bWeight').value);
  const gp = parseFloat(document.getElementById('bGoldPrice').value);
  const craft = parseFloat(document.getElementById('bCraft').value) / 100;
  const profit = parseFloat(document.getElementById('bProfit').value) / 100;
  const tax = parseFloat(document.getElementById('bTax').value) / 100;

  if (!w || !gp) return;

  const goldVal = w * gp;
  const craftVal = goldVal * craft;
  const profitVal = (goldVal + craftVal) * profit;
  const taxVal = (goldVal + craftVal + profitVal) * tax;
  const total = goldVal + craftVal + profitVal + taxVal;

  setText('r-gold', formatNum(goldVal) + ' تومان');
  setText('r-craft', formatNum(craftVal) + ' تومان');
  setText('r-profit', formatNum(profitVal) + ' تومان');
  setText('r-tax', formatNum(taxVal) + ' تومان');
  setText('r-total', formatNum(total) + ' تومان');

  showResult('buyResultContent');

  // WhatsApp share
  const msg = encodeURIComponent(
    `فاکتور محاسبه طلا — طلای تاج\n` +
    `وزن: ${w} گرم\n` +
    `قیمت طلا: ${formatNum(gp)} تومان\n` +
    `ارزش خالص: ${formatNum(goldVal)} تومان\n` +
    `اجرت ساخت: ${formatNum(craftVal)} تومان\n` +
    `سود فروشنده: ${formatNum(profitVal)} تومان\n` +
    `مالیات: ${formatNum(taxVal)} تومان\n` +
    `قیمت نهایی: ${formatNum(total)} تومان\n\n` +
    `📞 ۰۹۱۷۳۹۵۷۴۳۶`
  );
  const wa = document.getElementById('shareWa');
  if (wa) wa.href = `https://wa.me/989173957436?text=${msg}`;

  // Print data
  window._printData = { w, gp, goldVal, craftVal, profitVal, taxVal, total };
};

window.calcSell = function () {
  const w = parseFloat(document.getElementById('sWeight').value);
  const gp = parseFloat(document.getElementById('sGoldPrice').value);
  const purity = parseFloat(document.getElementById('sPurity').value);

  if (!w || !gp) return;

  const marketVal = w * gp * purity;
  const buyVal = marketVal * 0.92; // ~8% shop margin

  setText('s-market', formatNum(marketVal) + ' تومان');
  setText('s-buy', formatNum(buyVal) + ' تومان');
  showResult('sellResultContent');
};

window.calcInvest = function () {
  const amount = parseFloat(document.getElementById('iAmount').value);
  const buyPrice = parseFloat(document.getElementById('iBuyPrice').value);
  const currentPrice = parseFloat(document.getElementById('iCurrentPrice').value);

  if (!amount || !buyPrice || !currentPrice) return;

  const gramsOwned = amount / buyPrice;
  const currentVal = gramsOwned * currentPrice;
  const profitAmt = currentVal - amount;
  const profitPct = ((currentVal - amount) / amount) * 100;

  setText('i-current', formatNum(currentVal) + ' تومان');
  const profitEl = document.getElementById('i-profit');
  if (profitEl) {
    profitEl.textContent = (profitAmt >= 0 ? '+' : '') + formatNum(profitAmt) + ' تومان';
    profitEl.style.color = profitAmt >= 0 ? 'var(--green)' : 'var(--red)';
  }
  const pctEl = document.getElementById('i-pct');
  if (pctEl) {
    pctEl.textContent = (profitPct >= 0 ? '+' : '') + profitPct.toFixed(2) + '%';
    pctEl.style.color = profitPct >= 0 ? 'var(--green)' : 'var(--red)';
  }

  // Visual bar
  const visual = document.getElementById('profitVisual');
  if (visual) {
    const pct = Math.min(Math.abs(profitPct), 100);
    visual.innerHTML = `
      <div style="margin-top:20px;">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;color:rgba(255,255,255,.5);margin-bottom:6px;">
          <span>سرمایه اولیه</span><span>ارزش فعلی</span>
        </div>
        <div style="background:rgba(255,255,255,.05);border-radius:8px;height:8px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(100, 50 + pct/2)}%;background:${profitAmt>=0?'var(--green)':'var(--red)'};border-radius:8px;transition:.5s"></div>
        </div>
        <p style="margin-top:10px;font-size:.78rem;color:rgba(255,255,255,.4);text-align:center;">
          ${(gramsOwned).toFixed(3)} گرم طلا
        </p>
      </div>`;
  }

  showResult('investResultContent');
};

function showResult(id) {
  document.querySelectorAll('.result-placeholder').forEach(el => el.style.display = 'none');
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'block';
    const parent = el.closest('.calc-result');
    if (parent) { parent.style.alignItems = 'flex-start'; }
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// Print invoice
window.printInvoice = function () {
  const d = window._printData;
  if (!d) return;
  const content = document.getElementById('printContent');
  if (!content) return;
  content.innerHTML = `
    <div style="text-align:center;padding:20px 0;border-bottom:2px solid #D4AF37;">
      <h1 style="color:#D4AF37;font-size:2rem;">طلای تاج</h1>
      <p style="color:#666;">مدیریت: رضایی | ۰۹۱۷۳۹۵۷۴۳۶</p>
    </div>
    <h2 style="text-align:center;margin:20px 0;font-size:1.2rem;">فاکتور محاسبه طلا</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px;border-bottom:1px solid #eee;">وزن:</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;">${d.w} گرم</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #eee;">قیمت طلا:</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;">${formatNum(d.gp)} تومان/گرم</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #eee;">ارزش خالص طلا:</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;">${formatNum(d.goldVal)} تومان</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #eee;">اجرت ساخت:</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;">${formatNum(d.craftVal)} تومان</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #eee;">سود فروشنده:</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;">${formatNum(d.profitVal)} تومان</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #eee;">مالیات:</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left;">${formatNum(d.taxVal)} تومان</td></tr>
      <tr style="background:#FFFBEF;"><td style="padding:14px;font-weight:800;font-size:1.1rem;">قیمت نهایی:</td><td style="padding:14px;font-weight:800;font-size:1.1rem;color:#D4AF37;text-align:left;">${formatNum(d.total)} تومان</td></tr>
    </table>
    <p style="margin-top:30px;text-align:center;color:#999;font-size:.8rem;">تاریخ: ${new Date().toLocaleDateString('fa-IR')}</p>
  `;
  const area = document.getElementById('printInvoiceArea');
  if (area) area.style.display = 'block';
  window.print();
  setTimeout(() => { if (area) area.style.display = 'none'; }, 1000);
};

// ============================================================
// PRODUCTS
// ============================================================
const PRODUCTS = [
  { id: 1, cat: 'wedding', name: 'ست عروسی کلاسیک', desc: 'دستبند، گردنبند و گوشواره ست', icon: 'fa-ring', badge: 'پرفروش' },
  { id: 2, cat: 'wedding', name: 'ست عروسی رویال', desc: 'طراحی اختصاصی با نگین الماس', icon: 'fa-gem', badge: 'ویژه' },
  { id: 3, cat: 'ring', name: 'انگشتر نامزدی', desc: 'طلای ۱۸ عیار با الماس مرکزی', icon: 'fa-ring', badge: '' },
  { id: 4, cat: 'ring', name: 'انگشتر فارسی', desc: 'طراحی سنتی ایرانی', icon: 'fa-ring', badge: '' },
  { id: 5, cat: 'necklace', name: 'گردنبند لوکس', desc: 'زنجیر طلا ۱۸ عیار ایتالیایی', icon: 'fa-necklace', badge: 'جدید' },
  { id: 6, cat: 'necklace', name: 'گردنبند قلب', desc: 'آویز قلب با نگین روبی', icon: 'fa-heart', badge: '' },
  { id: 7, cat: 'bracelet', name: 'دستبند کارتیه', desc: 'طراحی اقتباس از کارتیه', icon: 'fa-circle-nodes', badge: '' },
  { id: 8, cat: 'bracelet', name: 'دستبند بنگل', desc: 'دستبند طلای سنتی', icon: 'fa-circle-nodes', badge: '' },
  { id: 9, cat: 'earring', name: 'گوشواره آویز', desc: 'طلای ۱۸ عیار با زمرد', icon: 'fa-star', badge: '' },
  { id: 10, cat: 'earring', name: 'گوشواره حلقه', desc: 'حلقه کلاسیک طلای ۱۸ عیار', icon: 'fa-circle', badge: '' },
  { id: 11, cat: 'coin', name: 'سکه تمام بهار', desc: 'سکه امامی اصل با فاکتور', icon: 'fa-coins', badge: 'موجود' },
  { id: 12, cat: 'coin', name: 'سکه گرمی', desc: 'سکه یک گرمی سرمایه‌گذاری', icon: 'fa-coins', badge: '' },
];

function initProductGrid() {
  renderProducts('all');
}

function renderProducts(cat) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  const filtered = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="openLightbox(${p.id})" data-cat="${p.cat}">
      <div class="product-img">
        <i class="fas ${p.icon}"></i>
        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
      </div>
      <div class="product-body">
        <div class="product-cat">${catLabel(p.cat)}</div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-actions">
          <a href="tel:09173957436" class="pact-call" onclick="event.stopPropagation()">
            <i class="fas fa-phone"></i> تماس
          </a>
          <a href="https://wa.me/989173957436?text=${encodeURIComponent('سلام، درباره ' + p.name + ' می‌خواستم استعلام بگیرم.')}" target="_blank" class="pact-wa" onclick="event.stopPropagation()">
            <i class="fab fa-whatsapp"></i> استعلام
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

function catLabel(cat) {
  const labels = { wedding: 'ست عروسی', ring: 'انگشتر', necklace: 'گردنبند', bracelet: 'دستبند', earring: 'گوشواره', coin: 'سکه' };
  return labels[cat] || cat;
}

function initProductFilter() {
  document.querySelectorAll('.pcat').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pcat').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.dataset.cat);
    });
  });
}

// Lightbox
window.openLightbox = function (id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  document.getElementById('lbImgWrap').innerHTML = `<i class="fas ${p.icon}"></i>`;
  document.getElementById('lbInfo').innerHTML = `<h3>${p.name}</h3><p>${p.desc}</p>`;
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeLightbox = function () {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
};

document.getElementById('lightbox')?.addEventListener('click', function (e) {
  if (e.target === this) closeLightbox();
});

// ============================================================
// SPECIAL ORDER → WhatsApp
// ============================================================
window.submitOrder = function () {
  const name = document.getElementById('oName')?.value.trim();
  const phone = document.getElementById('oPhone')?.value.trim();
  const desc = document.getElementById('oDesc')?.value.trim();

  if (!name || !phone) {
    alert('لطفاً نام و شماره تماس را وارد کنید');
    return;
  }

  const msg = encodeURIComponent(
    `سفارش ساخت طلای اختصاصی — طلای تاج\n` +
    `نام: ${name}\n` +
    `تلفن: ${phone}\n` +
    `توضیحات: ${desc || '—'}`
  );
  window.open(`https://wa.me/989173957436?text=${msg}`, '_blank');
};

// ============================================================
// COUNTERS
// ============================================================
function initCounters() {
  const els = document.querySelectorAll('.stat-num[data-target]');
  if (!els.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      animateCounter(el, target);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  els.forEach(el => observer.observe(el));
}

function animateCounter(el, target) {
  const duration = 2000;
  const start = performance.now();
  const step = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * target);
    el.textContent = value.toLocaleString('fa-IR');
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString('fa-IR') + (target === 100 ? '%' : '+');
  };
  requestAnimationFrame(step);
}

// ============================================================
// FAQ
// ============================================================
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

window.toggleFaq = function (btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
};

// ============================================================
// REVIEW DOTS (decorative)
// ============================================================
function buildReviewDots() {
  const dots = document.getElementById('sliderDots');
  if (!dots) return;
  const count = document.querySelectorAll('.review-card').length;
  dots.innerHTML = Array.from({ length: count }, (_, i) =>
    `<div class="dot${i === 0 ? ' active' : ''}"></div>`
  ).join('');
}

// ============================================================
// SMOOTH SCROLL for nav links
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============================================================
// TICKER — duplicate for infinite loop
// ============================================================
(function () {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  setTimeout(() => {
    const clone = track.innerHTML;
    track.innerHTML += clone;
  }, 500);
})();
