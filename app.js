/* ============================================================
   طلای تاج — app.js  (v2 — fixed & optimised)
   ============================================================ */
'use strict';

// ============================================================
// CONFIG  ← کلید API را اینجا وارد کنید
// ============================================================
const API_KEY = 'oanor_live_05909d41959110495cedb8944829d80acea760812f5dd2dc9fcb7e59c1facc12';   // ← جایگزین کنید
const API_URL = 'https://api.oanor.com/irr-api';
const REFRESH_MS = 60_000;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  AOS.init({ duration: 700, once: true, offset: 60 });
  initHeader();
  initParticles();
  initMobileMenu();
  initSmoothScroll();   // FIX: moved inside DOMContentLoaded
  initChartTabs();
  initCalcTabs();
  initProductGrid();
  initProductFilter();
  initCounters();
  initFAQ();
  initTickerOnce();     // FIX: clone only once
  fetchPrices();
  setInterval(fetchPrices, REFRESH_MS);
  buildReviewDots();
});

// ============================================================
// HEADER
// ============================================================
function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
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
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    })
  );
}

// ============================================================
// SMOOTH SCROLL
// ============================================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        const offset = 80; // header height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ============================================================
// PARTICLES
// ============================================================
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, rafId = null;
  const particles = [];

  const resize = () => {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  };

  const resizeObs = window.ResizeObserver
    ? new ResizeObserver(resize)
    : null;
  if (resizeObs) resizeObs.observe(canvas);
  else window.addEventListener('resize', resize);
  resize();

  const count = Math.min(70, Math.floor((W * H) / 14000));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.1,
    });
  }

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,175,55,${p.a})`;
      ctx.fill();
    }
    rafId = requestAnimationFrame(draw);
  };

  // Pause when tab hidden (perf)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(rafId); }
    else { rafId = requestAnimationFrame(draw); }
  });
  draw();
}

// ============================================================
// PRICE FETCH — Oanor API  ★ FIXED
// ============================================================

// Fallback demo prices (تومان)
const DEMO = {
  gold18: { price:7_850_000,  change:45_000,   pct:0.58 },
  gold24: { price:10_470_000, change:60_000,   pct:0.58 },
  misqal: { price:36_900_000, change:210_000,  pct:0.57 },
  ounce:  { price:2350,       change:12,       pct:0.51, usd:true },
  emami:  { price:58_500_000, change:-200_000, pct:-0.34 },
  nim:    { price:29_200_000, change:-100_000, pct:-0.34 },
  rob:    { price:14_600_000, change:-50_000,  pct:-0.34 },
  gerami: { price:7_800_000,  change:30_000,   pct:0.39 },
  usd:    { price:627_000,    change:1_500,    pct:0.24 },
  eur:    { price:671_000,    change:-800,     pct:-0.12 },
  usdt:   { price:628_500,    change:2_000,    pct:0.32 },
};

let apiWorking = false;  // track whether real API is live

async function fetchPrices() {
  const syncIcon = document.getElementById('syncIcon');
  if (syncIcon) syncIcon.style.animationDuration = '0.8s';

  // Skip API call if key not set
  if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
    showApiStatus('demo');
    applyPrices(demoWithNoise());
    updateTimestamp();
    if (syncIcon) syncIcon.style.animationDuration = '2s';
    return;
  }

  // FIX: proper AbortController for Safari compatibility
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(API_URL, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const raw = await res.json();
    console.log('[طلای تاج] API response:', raw); // debug — remove in production

    const parsed = parseOanorResponse(raw);
    const hasData = Object.values(parsed).some(v => v && v.price > 0);

    if (!hasData) {
      throw new Error('API returned empty or unrecognised data structure');
    }

    apiWorking = true;
    showApiStatus('live');
    applyPrices(parsed);

  } catch (err) {
    clearTimeout(timer);
    console.warn('[طلای تاج] API error, using demo data:', err.message);
    apiWorking = false;
    showApiStatus('demo');
    applyPrices(demoWithNoise());
  }

  updateTimestamp();
  if (syncIcon) syncIcon.style.animationDuration = '2s';
}

// ★ FIXED: robust multi-format Oanor response parser
function parseOanorResponse(raw) {
  // Oanor API can return flat object OR nested — handle both
  // Inspect raw in browser console to find exact field names
  const r = raw?.data ?? raw; // some versions wrap in {data:{}}

  const grab = (...keys) => {
    for (const k of keys) {
      const v = r?.[k];
      if (v !== undefined && v !== null) return v;
    }
    return null;
  };

  const field = (val, usd = false) => {
    if (val === null || val === undefined) return null;
    // value might be number or object {price, change, percent}
    if (typeof val === 'number') return { price: val, change: 0, pct: 0, usd };
    if (typeof val === 'object') {
      const price = val.price ?? val.value ?? val.sell ?? val.p ?? 0;
      const change = val.change ?? val.diff ?? val.d ?? 0;
      const pct = val.percent ?? val.pct ?? val.dp ?? 0;
      return price ? { price, change, pct, usd } : null;
    }
    return null;
  };

  return {
    gold18: field(grab('gold_18','geram_18','18','g18','gold18')),
    gold24: field(grab('gold_24','geram_24','24','g24','gold24')),
    misqal: field(grab('mithqal','misqal','mesghal','mesgal')),
    ounce:  field(grab('ounce','oz','gold_ounce'), true),
    emami:  field(grab('emami','coin_emami','sekke_emami','full_coin','bahar')),
    nim:    field(grab('nim','nim_sekke','half_coin','sekke_nim')),
    rob:    field(grab('rob','rob_sekke','quarter_coin','sekke_rob')),
    gerami: field(grab('gerami','gram_coin','sekke_gerami','1gram')),
    usd:    field(grab('usd','dollar','dolar','USD')),
    eur:    field(grab('eur','euro','EUR')),
    usdt:   field(grab('usdt','tether','USDT')),
  };
}

function demoWithNoise() {
  const out = {};
  for (const [k, v] of Object.entries(DEMO)) {
    const noise = (Math.random() - 0.5) * 0.001;
    out[k] = { ...v, price: Math.round(v.price * (1 + noise)) };
  }
  return out;
}

function showApiStatus(mode) {
  let bar = document.getElementById('apiStatusBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'apiStatusBar';
    bar.style.cssText = `
      position:fixed;bottom:90px;left:24px;z-index:9999;
      padding:7px 14px;border-radius:20px;font-size:.75rem;font-weight:700;
      font-family:Vazirmatn,sans-serif;direction:rtl;
      box-shadow:0 2px 12px rgba(0,0,0,.2);transition:opacity .5s;
    `;
    document.body.appendChild(bar);
  }
  if (mode === 'live') {
    bar.style.background = '#22c55e';
    bar.style.color = '#fff';
    bar.textContent = '● قیمت زنده';
    bar.style.opacity = '1';
    setTimeout(() => { bar.style.opacity = '0'; }, 4000);
  } else {
    bar.style.background = '#f59e0b';
    bar.style.color = '#000';
    bar.textContent = '⚠ داده آزمایشی — کلید API وارد نشده';
    bar.style.opacity = '1';
  }
}

function updateTimestamp() {
  const el = document.getElementById('lastUpdate');
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ============================================================
// APPLY PRICES TO DOM
// ============================================================
const PRICE_MAP = {
  gold18: ['p18',   'c18',   't18'],
  gold24: ['p24',   'c24',   't24'],
  misqal: ['pmis',  'cmis',  'tmis'],
  ounce:  ['poz',   'coz',   'toz'],
  emami:  ['psek',  'csek',  'tsek'],
  nim:    ['pnim',  'cnim'],
  rob:    ['prob',  'crob'],
  gerami: ['pger',  'cger'],
  usd:    ['pusd',  'cusd',  'tusd'],
  eur:    ['peur',  'ceur',  'teur'],
  usdt:   ['pusdt', 'cusdt'],
};

function applyPrices(prices) {
  for (const [key, [priceId, changeId, tickerId]] of Object.entries(PRICE_MAP)) {
    const d = prices[key];
    if (!d || !d.price) continue;

    const priceEl  = document.getElementById(priceId);
    const changeEl = document.getElementById(changeId);
    const tickerEl = tickerId ? document.getElementById(tickerId) : null;

    const formatted = d.usd
      ? '$' + formatNum(d.price, 0)
      : formatNum(d.price) + ' تومان';

    if (priceEl) {
      // Animate value change
      priceEl.classList.add('price-flash');
      priceEl.textContent = formatted;
      setTimeout(() => priceEl.classList.remove('price-flash'), 600);
    }
    if (tickerEl) tickerEl.textContent = formatted;

    if (changeEl) {
      const up   = d.change > 0;
      const down = d.change < 0;
      const dir  = up ? 'up' : down ? 'down' : 'flat';
      const arrow = up ? '▲' : down ? '▼' : '—';
      const sign  = up ? '+' : '';
      const abs   = formatNum(Math.abs(d.change));
      const pct   = Math.abs(d.pct).toFixed(2);
      changeEl.innerHTML =
        `<span class="${dir}">${arrow} ${sign}${abs} (${sign}${pct}%)</span>`;
    }
  }

  // Update chart with real gold18 price
  if (prices.gold18?.price) updateChartWithPrice(prices.gold18.price);

  // FIX: only auto-fill calculator if the field is empty (not userSet)
  autoFillCalc('bGoldPrice', prices.gold18?.price);
  autoFillCalc('sGoldPrice', prices.gold18?.price);
  autoFillCalc('iCurrentPrice', prices.gold18?.price);
}

function autoFillCalc(id, price) {
  if (!price) return;
  const el = document.getElementById(id);
  // Only fill if field is empty AND user hasn't typed in it
  if (el && !el.dataset.userTyped && !el.value) {
    el.value = price;
    el.placeholder = formatNum(price);
  }
}

// ============================================================
// FORMAT HELPERS
// ============================================================
function formatNum(n, decimals = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('fa-IR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ============================================================
// CHART
// ============================================================
let goldChart    = null;
let currentPeriod = 1;
let latestPrice   = 7_850_000;

function initChartTabs() {
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = parseInt(btn.dataset.period, 10);
      buildChart(currentPeriod, latestPrice);
    });
  });
  // Defer first chart build to ensure canvas has dimensions
  requestAnimationFrame(() => buildChart(1, latestPrice));
}

function updateChartWithPrice(price) {
  latestPrice = price;
  buildChart(currentPeriod, price);
}

function buildChart(days, basePrice) {
  const canvas = document.getElementById('goldChart');
  if (!canvas) return;

  // FIX: wait for canvas to have non-zero dimensions
  if (canvas.offsetWidth === 0) {
    setTimeout(() => buildChart(days, basePrice), 200);
    return;
  }

  const labels = [];
  const data   = [];
  const now    = new Date();

  let price = basePrice * (1 - days * 0.0006);
  const volatility = 0.0025;

  const pointCount = days === 1 ? 24 : days;
  for (let i = pointCount; i >= 0; i--) {
    const d = new Date(now);
    if (days === 1) {
      d.setHours(d.getHours() - i);
      labels.push(d.getHours() + ':۰۰');
    } else {
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('fa-IR', {
        month: 'short',
        day: days > 90 ? undefined : 'numeric',
      }));
    }
    price = price * (1 + (Math.random() - 0.47) * volatility);
    data.push(Math.round(price));
  }
  data[data.length - 1] = basePrice;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 280);
  gradient.addColorStop(0, 'rgba(212,175,55,0.22)');
  gradient.addColorStop(1, 'rgba(212,175,55,0)');

  if (goldChart) { goldChart.destroy(); goldChart = null; }

  goldChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'طلای ۱۸ عیار (تومان)',
        data,
        borderColor: '#D4AF37',
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: days === 1 ? 2 : 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
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
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            color: '#888',
            font: { family: 'Vazirmatn', size: 11 },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          position: 'left',
          grid: { color: 'rgba(0,0,0,0.05)' },
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
      const panel = document.getElementById('calc-' + btn.dataset.calc);
      if (panel) panel.classList.add('active');
    });
  });

  // FIX: track user typing with 'input' event; only set userTyped flag
  ['bWeight','bGoldPrice','bCraft','bProfit','bTax'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', e => {
      e.target.dataset.userTyped = '1';
      calcBuy();
    });
  });
  ['sWeight','sGoldPrice','sPurity'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', e => {
      e.target.dataset.userTyped = '1';
      calcSell();
    });
  });
  ['iAmount','iBuyPrice','iCurrentPrice'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', e => {
      e.target.dataset.userTyped = '1';
      calcInvest();
    });
  });
}

window.calcBuy = function () {
  const w      = parseFloat(document.getElementById('bWeight')?.value) || 0;
  const gp     = parseFloat(document.getElementById('bGoldPrice')?.value) || 0;
  const craft  = (parseFloat(document.getElementById('bCraft')?.value) || 0) / 100;
  const profit = (parseFloat(document.getElementById('bProfit')?.value) || 0) / 100;
  const tax    = (parseFloat(document.getElementById('bTax')?.value) || 0) / 100;

  if (!w || !gp) return;

  const goldVal   = w * gp;
  const craftVal  = goldVal * craft;
  const profitVal = (goldVal + craftVal) * profit;
  const taxVal    = (goldVal + craftVal + profitVal) * tax;
  const total     = goldVal + craftVal + profitVal + taxVal;

  setTxt('r-gold',   formatNum(goldVal)   + ' تومان');
  setTxt('r-craft',  formatNum(craftVal)  + ' تومان');
  setTxt('r-profit', formatNum(profitVal) + ' تومان');
  setTxt('r-tax',    formatNum(taxVal)    + ' تومان');
  setTxt('r-total',  formatNum(total)     + ' تومان');

  showCalcResult('buyResultContent');

  const waMsg = `فاکتور محاسبه طلا — طلای تاج\nوزن: ${w} گرم\nقیمت طلا: ${formatNum(gp)} تومان/گرم\nارزش خالص: ${formatNum(goldVal)} تومان\nاجرت ساخت: ${formatNum(craftVal)} تومان\nسود فروشنده: ${formatNum(profitVal)} تومان\nمالیات: ${formatNum(taxVal)} تومان\nقیمت نهایی: ${formatNum(total)} تومان\n📞 ۰۹۱۷۳۹۵۷۴۳۶`;
  const waEl = document.getElementById('shareWa');
  if (waEl) waEl.href = `https://wa.me/989173957436?text=${encodeURIComponent(waMsg)}`;

  window._printData = { w, gp, goldVal, craftVal, profitVal, taxVal, total };
};

window.calcSell = function () {
  const w      = parseFloat(document.getElementById('sWeight')?.value) || 0;
  const gp     = parseFloat(document.getElementById('sGoldPrice')?.value) || 0;
  const purity = parseFloat(document.getElementById('sPurity')?.value) || 0.75;

  if (!w || !gp) return;

  const marketVal = w * gp * purity;
  const buyVal    = marketVal * 0.92;

  setTxt('s-market', formatNum(marketVal) + ' تومان');
  setTxt('s-buy',    formatNum(buyVal)    + ' تومان');
  showCalcResult('sellResultContent');
};

window.calcInvest = function () {
  const amount       = parseFloat(document.getElementById('iAmount')?.value) || 0;
  const buyPrice     = parseFloat(document.getElementById('iBuyPrice')?.value) || 0;
  const currentPrice = parseFloat(document.getElementById('iCurrentPrice')?.value) || 0;

  if (!amount || !buyPrice || !currentPrice) return;

  const grams      = amount / buyPrice;
  const currentVal = grams * currentPrice;
  const profitAmt  = currentVal - amount;
  const profitPct  = (profitAmt / amount) * 100;

  setTxt('i-current', formatNum(currentVal) + ' تومان');

  const profitEl = document.getElementById('i-profit');
  if (profitEl) {
    profitEl.textContent = (profitAmt >= 0 ? '+' : '') + formatNum(profitAmt) + ' تومان';
    profitEl.style.color = profitAmt >= 0 ? '#22c55e' : '#ef4444';
  }
  const pctEl = document.getElementById('i-pct');
  if (pctEl) {
    pctEl.textContent = (profitPct >= 0 ? '+' : '') + Math.abs(profitPct).toFixed(2) + '%';
    pctEl.style.color = profitPct >= 0 ? '#22c55e' : '#ef4444';
  }

  const visual = document.getElementById('profitVisual');
  if (visual) {
    const pct = Math.min(Math.abs(profitPct), 100);
    const barW = Math.min(100, 50 + pct / 2);
    const color = profitAmt >= 0 ? '#22c55e' : '#ef4444';
    visual.innerHTML = `
      <div style="margin-top:20px">
        <div style="display:flex;justify-content:space-between;font-size:.76rem;color:rgba(255,255,255,.45);margin-bottom:6px">
          <span>سرمایه اولیه</span><span>ارزش فعلی</span>
        </div>
        <div style="background:rgba(255,255,255,.06);border-radius:8px;height:8px;overflow:hidden">
          <div style="height:100%;width:${barW}%;background:${color};border-radius:8px;transition:.5s"></div>
        </div>
        <p style="margin-top:10px;font-size:.76rem;color:rgba(255,255,255,.35);text-align:center">
          معادل ${grams.toFixed(4)} گرم طلا
        </p>
      </div>`;
  }
  showCalcResult('investResultContent');
};

function showCalcResult(id) {
  // Hide all placeholders in this panel
  const el = document.getElementById(id);
  if (!el) return;
  const panel = el.closest('.calc-panel');
  panel?.querySelectorAll('.result-placeholder').forEach(p => { p.style.display = 'none'; });
  el.style.display = 'block';
  const wrap = el.closest('.calc-result');
  if (wrap) wrap.style.alignItems = 'flex-start';
}

function setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// Print Invoice
window.printInvoice = function () {
  const d = window._printData;
  if (!d) { alert('ابتدا محاسبه کنید'); return; }
  const area = document.getElementById('printInvoiceArea');
  const content = document.getElementById('printContent');
  if (!area || !content) return;

  content.innerHTML = `
    <div style="text-align:center;padding:20px 0;border-bottom:2px solid #D4AF37;margin-bottom:24px">
      <h1 style="color:#D4AF37;font-size:1.8rem;margin:0">طلای تاج</h1>
      <p style="color:#666;margin:4px 0">مدیریت: رضایی &nbsp;|&nbsp; ۰۹۱۷۳۹۵۷۴۳۶</p>
    </div>
    <h2 style="text-align:center;margin-bottom:20px;font-size:1.1rem">فاکتور محاسبه طلا</h2>
    <table style="width:100%;border-collapse:collapse;direction:rtl">
      ${row('وزن', d.w + ' گرم')}
      ${row('قیمت طلا', formatNum(d.gp) + ' تومان/گرم')}
      ${row('ارزش خالص طلا', formatNum(d.goldVal) + ' تومان')}
      ${row('اجرت ساخت', formatNum(d.craftVal) + ' تومان')}
      ${row('سود فروشنده', formatNum(d.profitVal) + ' تومان')}
      ${row('مالیات', formatNum(d.taxVal) + ' تومان')}
      <tr style="background:#FFFBEF">
        <td style="padding:14px;font-weight:800;font-size:1.05rem">قیمت نهایی</td>
        <td style="padding:14px;font-weight:800;font-size:1.05rem;color:#D4AF37;text-align:left">${formatNum(d.total)} تومان</td>
      </tr>
    </table>
    <p style="margin-top:28px;text-align:center;color:#aaa;font-size:.78rem">
      تاریخ صدور: ${new Date().toLocaleDateString('fa-IR')}
    </p>`;

  area.style.display = 'block';
  window.print();
  setTimeout(() => { area.style.display = 'none'; }, 1500);
};

function row(label, val) {
  return `<tr><td style="padding:10px;border-bottom:1px solid #eee">${label}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:left">${val}</td></tr>`;
}

// ============================================================
// PRODUCTS
// ============================================================
const PRODUCTS = [
  { id:1,  cat:'wedding',  name:'ست عروسی کلاسیک',  desc:'دستبند، گردنبند و گوشواره ست',     icon:'fa-ring',         badge:'پرفروش' },
  { id:2,  cat:'wedding',  name:'ست عروسی رویال',    desc:'طراحی اختصاصی با نگین الماس',      icon:'fa-gem',          badge:'ویژه' },
  { id:3,  cat:'ring',     name:'انگشتر نامزدی',     desc:'طلای ۱۸ عیار با الماس مرکزی',      icon:'fa-ring',         badge:'' },
  { id:4,  cat:'ring',     name:'انگشتر فارسی',      desc:'طراحی سنتی ایرانی',                icon:'fa-ring',         badge:'' },
  { id:5,  cat:'necklace', name:'گردنبند لوکس',      desc:'زنجیر طلا ۱۸ عیار ایتالیایی',     icon:'fa-link',         badge:'جدید' },  // FIX: fa-necklace invalid
  { id:6,  cat:'necklace', name:'گردنبند قلب',       desc:'آویز قلب با نگین روبی',             icon:'fa-heart',        badge:'' },
  { id:7,  cat:'bracelet', name:'دستبند کارتیه',     desc:'طراحی اقتباس از کارتیه',           icon:'fa-circle-dot',   badge:'' },
  { id:8,  cat:'bracelet', name:'دستبند بنگل',       desc:'دستبند طلای سنتی',                 icon:'fa-circle-dot',   badge:'' },
  { id:9,  cat:'earring',  name:'گوشواره آویز',      desc:'طلای ۱۸ عیار با زمرد',             icon:'fa-star',         badge:'' },
  { id:10, cat:'earring',  name:'گوشواره حلقه',      desc:'حلقه کلاسیک طلای ۱۸ عیار',        icon:'fa-circle',       badge:'' },
  { id:11, cat:'coin',     name:'سکه تمام بهار',     desc:'سکه امامی اصل با فاکتور رسمی',     icon:'fa-coins',        badge:'موجود' },
  { id:12, cat:'coin',     name:'سکه گرمی',          desc:'سکه یک گرمی سرمایه‌گذاری',        icon:'fa-coins',        badge:'' },
];

const CAT_LABELS = {
  wedding:'ست عروسی', ring:'انگشتر', necklace:'گردنبند',
  bracelet:'دستبند', earring:'گوشواره', coin:'سکه',
};

function initProductGrid() { renderProducts('all'); }

function renderProducts(cat) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  const list = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
  grid.innerHTML = list.map(p => {
    const waText = encodeURIComponent(`سلام، درباره ${p.name} می‌خواستم استعلام بگیرم.`);
    return `
    <div class="product-card" onclick="openLightbox(${p.id})" data-cat="${p.cat}" role="button" tabindex="0">
      <div class="product-img">
        <i class="fas ${p.icon}" aria-hidden="true"></i>
        ${p.badge ? `<div class="product-badge">${p.badge}</div>` : ''}
      </div>
      <div class="product-body">
        <div class="product-cat">${CAT_LABELS[p.cat] || p.cat}</div>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-actions">
          <a href="tel:09173957436" class="pact-call" onclick="event.stopPropagation()" aria-label="تماس برای ${p.name}">
            <i class="fas fa-phone" aria-hidden="true"></i> تماس
          </a>
          <a href="https://wa.me/989173957436?text=${waText}" target="_blank" rel="noopener"
             class="pact-wa" onclick="event.stopPropagation()" aria-label="واتساپ برای ${p.name}">
            <i class="fab fa-whatsapp" aria-hidden="true"></i> استعلام
          </a>
        </div>
      </div>
    </div>`;
  }).join('');

  // Keyboard accessibility
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') card.click();
    });
  });
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
  const wrap = document.getElementById('lbImgWrap');
  const info = document.getElementById('lbInfo');
  if (wrap) wrap.innerHTML = `<i class="fas ${p.icon}" aria-hidden="true"></i>`;
  if (info) info.innerHTML = `<h3>${p.name}</h3><p>${p.desc}</p>`;
  const lb = document.getElementById('lightbox');
  if (lb) { lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); }
  document.body.style.overflow = 'hidden';
};

window.closeLightbox = function () {
  const lb = document.getElementById('lightbox');
  if (lb) { lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); }
  document.body.style.overflow = '';
};

document.getElementById('lightbox')?.addEventListener('click', function (e) {
  if (e.target === this) closeLightbox();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// ============================================================
// SPECIAL ORDER → WhatsApp
// ============================================================
window.submitOrder = function () {
  const name  = document.getElementById('oName')?.value.trim();
  const phone = document.getElementById('oPhone')?.value.trim();
  const desc  = document.getElementById('oDesc')?.value.trim();

  if (!name || !phone) {
    showToast('لطفاً نام و شماره تماس را وارد کنید', 'warn');
    return;
  }
  if (!/^[۰-۹0-9]{10,11}$/.test(phone.replace(/\s/g,''))) {
    showToast('شماره تماس معتبر نیست', 'warn');
    return;
  }

  const msg = encodeURIComponent(
    `سفارش ساخت طلای اختصاصی — طلای تاج\nنام: ${name}\nتلفن: ${phone}\nتوضیحات: ${desc || '—'}`
  );
  window.open(`https://wa.me/989173957436?text=${msg}`, '_blank', 'noopener');
};

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(msg, type = 'info') {
  let toast = document.getElementById('toastMsg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.style.cssText = `
      position:fixed;top:90px;left:50%;transform:translateX(-50%);
      padding:12px 24px;border-radius:12px;font-size:.88rem;font-weight:600;
      font-family:Vazirmatn,sans-serif;z-index:9999;direction:rtl;
      box-shadow:0 4px 20px rgba(0,0,0,.2);transition:opacity .3s;
    `;
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'warn' ? '#f59e0b' : '#22c55e';
  toast.style.color = '#000';
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ============================================================
// COUNTERS
// ============================================================
function initCounters() {
  const els = document.querySelectorAll('.stat-num[data-target]');
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.target, 10);
      animateCounter(el, target);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}

function animateCounter(el, target) {
  const duration = 1800;
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target).toLocaleString('fa-IR');
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString('fa-IR') + (target === 100 ? '%' : '+');
  };
  requestAnimationFrame(tick);
}

// ============================================================
// FAQ
// ============================================================
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => toggleFaqItem(btn));
  });
}

window.toggleFaq = function (btn) { toggleFaqItem(btn); };

function toggleFaqItem(btn) {
  const item   = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => {
    i.classList.remove('open');
    i.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    item.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

// ============================================================
// REVIEW DOTS
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
// TICKER  — FIX: clone only once, never re-clone on price update
// ============================================================
function initTickerOnce() {
  const track = document.getElementById('tickerTrack');
  if (!track || track.dataset.cloned) return;
  track.dataset.cloned = '1';
  // Wait until prices are populated then clone
  setTimeout(() => {
    track.innerHTML += track.innerHTML;
  }, 1500);
}

// ============================================================
// PRICE FLASH CSS (injected once)
// ============================================================
(function injectFlashCSS() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes priceFlash {
      0%   { color: inherit; }
      30%  { color: #D4AF37; }
      100% { color: inherit; }
    }
    .price-flash { animation: priceFlash .6s ease; }
  `;
  document.head.appendChild(style);
})();
