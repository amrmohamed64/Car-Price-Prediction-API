/* ─────────────────────────────────────────────────────────────────
   CarIQ — AI Car Price Prediction Dashboard
   script.js
   ───────────────────────────────────────────────────────────────── */

'use strict';

/* ─── Config ──────────────────────────────────────────────────────── */
const API_BASE = 'https://car-price-prediction-api-ebjh.onrender.com';
const API_PREDICT = `${API_BASE}/predict`;
const API_HEALTH = `${API_BASE}/`;

/* ─── Demo payload matching the FastAPI CarFeatures schema ─────────── */
const DEMO_DATA = {
  CarName: 'toyota corolla',
  fueltype: 'gas',
  aspiration: 'std',
  doornumber: 'four',
  carbody: 'sedan',
  drivewheel: 'fwd',
  enginelocation: 'front',
  enginetype: 'ohc',
  cylindernumber: 'four',
  fuelsystem: 'mpfi',
  wheelbase: 98.8,
  carlength: 168.8,
  carwidth: 64.1,
  carheight: 53.5,
  curbweight: 2548,
  enginesize: 130,
  boreratio: 3.47,
  stroke: 2.68,
  compressionratio: 9.0,
  horsepower: 111,
  peakrpm: 5000,
  citympg: 21,
  highwaympg: 27,
};

/* ─── DOM References ─────────────────────────────────────────────── */
const form = document.getElementById('predictionForm');
const predictBtn = document.getElementById('predictBtn');
const btnLoader = document.getElementById('btnLoader');
const fillDemoBtn = document.getElementById('fillDemoBtn');
const resultCard = document.getElementById('resultCard');
const placeholderCard = document.getElementById('placeholderCard');

const priceValue = document.getElementById('priceValue');
const resultBrand = document.getElementById('resultBrand');
const resultMessage = document.getElementById('resultMessage');
const priceLow = document.getElementById('priceLow');
const priceHigh = document.getElementById('priceHigh');
const rangeFill = document.getElementById('rangeFill');
const rangeThumb = document.getElementById('rangeThumb');
const resultMeta = document.getElementById('resultMeta');

const apiStatusDot = document.getElementById('apiStatusDot');
const apiStatusText = document.getElementById('apiStatusText');

const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

/* ─── Toast Notification ─────────────────────────────────────────── */
let toastTimer = null;

function showToast(message, type = 'info') {
  clearTimeout(toastTimer);
  toast.className = `toast toast--${type}`;
  toastMessage.textContent = message;

  /* Update icon based on type */
  const icon = toast.querySelector('.toast-icon');
  icon.innerHTML =
    type === 'error'
      ? '<circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
      : type === 'success'
        ? '<circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
        : '<circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4m0 4h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';

  requestAnimationFrame(() => toast.classList.add('show'));
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ─── Hamburger Menu ─────────────────────────────────────────────── */
hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('active');
  hamburger.setAttribute('aria-expanded', isOpen);
  mobileMenu.classList.toggle('open', isOpen);
  mobileMenu.setAttribute('aria-hidden', !isOpen);
});

/* Close mobile menu on link click */
mobileMenu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

/* ─── Smooth scroll offset for sticky nav ────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  });
});

/* ─── Intersection Observer — fade-in on scroll ──────────────────── */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
);

document.querySelectorAll('.fade-in').forEach((el) => {
  el.style.animationPlayState = 'paused';
  observer.observe(el);
});

/* ─── Counter animation ──────────────────────────────────────────── */
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const isDecimal = target % 1 !== 0;
  const duration = 1800;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;
    el.textContent = isDecimal ? current.toFixed(1) : Math.round(current);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 },
);

document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));

/* ─── API Health Check ───────────────────────────────────────────── */
async function checkApiHealth() {
  apiStatusDot.className = 'status-dot checking';
  apiStatusText.textContent = 'Checking...';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(API_HEALTH, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      apiStatusDot.className = 'status-dot online';
      apiStatusText.textContent = 'Online';
    } else {
      throw new Error('Non-OK response');
    }
  } catch {
    apiStatusDot.className = 'status-dot offline';
    apiStatusText.textContent = 'Offline';
  }
}

checkApiHealth();
setInterval(checkApiHealth, 30_000);

/* ─── Fill Demo Data ─────────────────────────────────────────────── */
fillDemoBtn.addEventListener('click', () => {
  Object.entries(DEMO_DATA).forEach(([key, value]) => {
    const el = form.elements[key];
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      /* Tiny visual feedback */
      el.classList.add('demo-flash');
      setTimeout(() => el.classList.remove('demo-flash'), 400);
    }
  });
  showToast('Demo data loaded — Toyota Corolla defaults applied.', 'info');
});

/* ─── Form Validation ────────────────────────────────────────────── */
function getFieldValue(name) {
  const el = form.elements[name];
  if (!el) return null;
  const val = el.value.trim();
  return val === '' ? null : val;
}

function validateForm() {
  let valid = true;
  const errors = {};

  const carName = getFieldValue('CarName');
  if (!carName || carName.trim().split(/\s+/).length < 1) {
    errors['carName'] = 'Please enter a car name (e.g. "toyota corolla")';
    valid = false;
  }

  const numericFields = [
    { name: 'wheelbase', min: 80, max: 130, label: 'Wheelbase' },
    { name: 'carlength', min: 140, max: 210, label: 'Car Length' },
    { name: 'carwidth', min: 55, max: 75, label: 'Car Width' },
    { name: 'carheight', min: 45, max: 65, label: 'Car Height' },
    { name: 'curbweight', min: 1000, max: 5000, label: 'Curb Weight' },
    { name: 'enginesize', min: 60, max: 500, label: 'Engine Size' },
    { name: 'boreratio', min: 2, max: 5, label: 'Bore Ratio' },
    { name: 'stroke', min: 2, max: 5, label: 'Stroke' },
    { name: 'compressionratio', min: 6, max: 25, label: 'Compression Ratio' },
    { name: 'horsepower', min: 40, max: 500, label: 'Horsepower' },
    { name: 'peakrpm', min: 3000, max: 8000, label: 'Peak RPM' },
    { name: 'citympg', min: 10, max: 70, label: 'City MPG' },
    { name: 'highwaympg', min: 15, max: 80, label: 'Highway MPG' },
  ];

  numericFields.forEach(({ name, min, max, label }) => {
    const raw = getFieldValue(name);
    if (raw === null) {
      errors[name] = `${label} is required`;
      valid = false;
    } else {
      const num = parseFloat(raw);
      if (isNaN(num) || num < min || num > max) {
        errors[name] = `${label} must be between ${min} and ${max}`;
        valid = false;
      }
    }
  });

  const selectFields = [
    'fueltype',
    'aspiration',
    'doornumber',
    'carbody',
    'drivewheel',
    'enginelocation',
    'enginetype',
    'cylindernumber',
    'fuelsystem',
  ];
  selectFields.forEach((name) => {
    if (!getFieldValue(name)) {
      errors[name] = 'Required';
      valid = false;
    }
  });

  /* Show/clear inline errors */
  Object.keys(errors).forEach((name) => {
    const errEl = document.getElementById(`${name}Error`);
    const inputEl = form.elements[name];
    if (inputEl) inputEl.classList.add('error');
    if (errEl) errEl.textContent = errors[name];
  });

  /* Clear previous error styles for valid fields */
  [...form.elements].forEach((el) => {
    if (el.name && !errors[el.name]) {
      el.classList.remove('error');
      const errEl = document.getElementById(`${el.name}Error`);
      if (errEl) errEl.textContent = '';
    }
  });

  return valid;
}

/* ─── Build Payload ──────────────────────────────────────────────── */
function buildPayload() {
  return {
    CarName: getFieldValue('CarName'),
    fueltype: getFieldValue('fueltype'),
    aspiration: getFieldValue('aspiration'),
    doornumber: getFieldValue('doornumber'),
    carbody: getFieldValue('carbody'),
    drivewheel: getFieldValue('drivewheel'),
    enginelocation: getFieldValue('enginelocation'),
    enginetype: getFieldValue('enginetype'),
    cylindernumber: getFieldValue('cylindernumber'),
    fuelsystem: getFieldValue('fuelsystem'),
    wheelbase: parseFloat(getFieldValue('wheelbase')),
    carlength: parseFloat(getFieldValue('carlength')),
    carwidth: parseFloat(getFieldValue('carwidth')),
    carheight: parseFloat(getFieldValue('carheight')),
    curbweight: parseInt(getFieldValue('curbweight'), 10),
    enginesize: parseInt(getFieldValue('enginesize'), 10),
    boreratio: parseFloat(getFieldValue('boreratio')),
    stroke: parseFloat(getFieldValue('stroke')),
    compressionratio: parseFloat(getFieldValue('compressionratio')),
    horsepower: parseInt(getFieldValue('horsepower'), 10),
    peakrpm: parseInt(getFieldValue('peakrpm'), 10),
    citympg: parseInt(getFieldValue('citympg'), 10),
    highwaympg: parseInt(getFieldValue('highwaympg'), 10),
  };
}

/* ─── Display Result ─────────────────────────────────────────────── */
function displayResult(data) {
  const price = data.predicted_price;
  const brand = data.brand;

  /* Estimate ±12% confidence range */
  const low = price * 0.88;
  const high = price * 1.12;
  /* Position thumb at ~50% since model returns point estimate */
  const pct = 50;

  /* Animate price count-up */
  animatePriceCountUp(priceValue, price);

  resultBrand.textContent = brand.charAt(0).toUpperCase() + brand.slice(1);
  resultMessage.textContent = data.message;

  priceLow.textContent = formatCurrency(low);
  priceHigh.textContent = formatCurrency(high);

  rangeFill.style.width = `${pct}%`;
  rangeThumb.style.left = `${pct}%`;

  /* Meta tags */
  const payload = buildPayload();
  resultMeta.innerHTML = [
    payload.carbody,
    payload.fueltype,
    payload.cylindernumber + ' cyl',
    payload.drivewheel.toUpperCase(),
    payload.horsepower + ' hp',
  ]
    .map((t) => `<span class="meta-tag">${t}</span>`)
    .join('');

  /* Show result, hide placeholder */
  placeholderCard.hidden = true;
  resultCard.hidden = false;

  /* Scroll result into view on mobile */
  if (window.innerWidth < 1024) {
    setTimeout(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

function animatePriceCountUp(el, target) {
  const duration = 900;
  const start = performance.now();
  const startVal = parseFloat(el.textContent.replace(/,/g, '')) || 0;

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startVal + (target - startVal) * eased;
    el.textContent = formatNumber(current);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = formatNumber(target);
  }
  requestAnimationFrame(tick);
}

function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}
function formatCurrency(n) {
  return '$' + formatNumber(n);
}

/* ─── Form Submit ────────────────────────────────────────────────── */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast('Please fix the highlighted fields before predicting.', 'error');
    return;
  }

  /* Loading state */
  predictBtn.classList.add('loading');
  predictBtn.disabled = true;

  const payload = buildPayload();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(API_PREDICT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    displayResult(data);
    showToast('Price prediction complete!', 'success');

    /* Refresh API status after successful call */
    apiStatusDot.className = 'status-dot online';
    apiStatusText.textContent = 'Online';
  } catch (err) {
    if (err.name === 'AbortError') {
      showToast('Request timed out. Is the API server running?', 'error');
    } else {
      showToast(`Error: ${err.message}`, 'error');
    }
    apiStatusDot.className = 'status-dot offline';
    apiStatusText.textContent = 'Offline';
  } finally {
    predictBtn.classList.remove('loading');
    predictBtn.disabled = false;
  }
});

/* ─── Clear field errors on input ────────────────────────────────── */
form.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.name) return;
  el.classList.remove('error');
  const errEl = document.getElementById(`${el.name}Error`);
  if (errEl) errEl.textContent = '';
});

/* ─── Micro-interaction: card tilt on mouse move ─────────────────── */
document.querySelectorAll('.glass-card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 4;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 4;
    card.style.transform = `perspective(800px) rotateX(${-y}deg) rotateY(${x}deg) translateY(-2px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

/* ─── Navbar shadow on scroll ────────────────────────────────────── */
const navbar = document.querySelector('.navbar');
window.addEventListener(
  'scroll',
  () => {
    navbar.style.boxShadow = window.scrollY > 10 ? '0 4px 24px rgba(0,0,0,0.3)' : 'none';
  },
  { passive: true },
);
