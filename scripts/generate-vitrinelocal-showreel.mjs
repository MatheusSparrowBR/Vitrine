import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION_MS = 40_000;
const MOBILE_W = 430;
const MOBILE_H = 900;
const DEFAULT_BASE_URL = 'https://www.vitrinelocal.net';
const DEFAULT_CITY = 'laguna';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(ROOT, 'output');
const CAPTURE_DIR = path.join(OUT_DIR, 'captures');
const COMPOSITION_HTML = path.join(OUT_DIR, 'composition.html');
const RAW_WEBM = path.join(OUT_DIR, 'vitrinelocal-launch-showreel.raw.webm');
const FINAL_WEBM = path.join(OUT_DIR, 'vitrinelocal-launch-showreel-30fps.webm');
const FINAL_MP4 = path.join(OUT_DIR, 'vitrinelocal-launch-showreel-30fps.mp4');

const EXCLUDED_NAMES = [
  "d' felipe pizzaria",
  'd felipe pizzaria',
  'd felipe',
  'cabanas villa del mar',
  'cabana villa del mar',
  'serra geral internet',
  'padaria padeirinho',
];
const EXCLUDED_TERMS = ['pizza', 'pizzaria'];

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((v) => v.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const BASE_URL = String(arg('base-url', process.env.VITRINE_BASE_URL || DEFAULT_BASE_URL)).replace(/\/$/, '');
const CITY = String(arg('city', process.env.VITRINE_CITY || DEFAULT_CITY)).toLowerCase();
const STORAGE_STATE = arg('storage-state', process.env.VITRINE_STORAGE_STATE || '');
const HEADLESS = arg('headless', 'true') !== 'false';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isExcluded(name, category = '') {
  const n = normalize(`${name} ${category}`);
  return EXCLUDED_NAMES.some((x) => n.includes(normalize(x))) || EXCLUDED_TERMS.some((x) => n.includes(normalize(x)));
}

function safeUrl(value) {
  try {
    return new URL(value, BASE_URL).toString();
  } catch {
    return '';
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function waitForReady(page, { selector = null, timeout = 20_000 } = {}) {
  await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  if (selector) await page.locator(selector).first().waitFor({ state: 'visible', timeout }).catch(() => {});
  await dismissPopups(page);
  await page.evaluate(() => {
    const bad = /^(carregando|loading|preparando)/i;
    for (const el of document.querySelectorAll('body *')) {
      const text = (el.textContent || '').trim();
      if (text && text.length < 80 && bad.test(text)) {
        // Do not mutate the real page; just return useful state to the caller.
      }
    }
  }).catch(() => {});
}

async function dismissPopups(page) {
  const candidates = [
    'button:has-text("Leve a sua cidade com você")',
    'button:has-text("Fechar")',
    '[aria-label*="Fechar" i]',
    '[aria-label*="close" i]',
    'button:has-text("Agora não")',
    'button:has-text("Não, obrigado")',
  ];
  for (const selector of candidates) {
    const loc = page.locator(selector);
    const count = await loc.count().catch(() => 0);
    for (let i = 0; i < Math.min(count, 3); i += 1) {
      await loc.nth(i).click({ force: true, timeout: 500 }).catch(() => {});
    }
  }
}

async function openPage(context, url) {
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(async () => {
    await page.goto(url, { waitUntil: 'commit', timeout: 30_000 });
  });
  await waitForReady(page);
  return page;
}

async function getLogoData(page) {
  const url = `${BASE_URL}/vitrine-local-header-logo.svg`;
  try {
    const response = await page.request.get(url, { timeout: 15_000 });
    if (!response.ok()) throw new Error(`Logo HTTP ${response.status()}`);
    const buffer = await response.body();
    return `data:image/svg+xml;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.warn('[logo] fallback:', error.message);
    return '';
  }
}

async function collectCategories(page) {
  const categories = await page.locator('.mbl-sticky-categories button').evaluateAll((els) =>
    els.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean).filter((x) => x.toLowerCase() !== 'todos').slice(0, 8)
  ).catch(() => []);
  return categories.length ? categories : ['Restaurantes', 'Lojas', 'Serviços', 'Saúde', 'Beleza', 'Turismo'];
}

async function collectBusinesses(catalogPage) {
  const candidates = await catalogPage.locator('a.mbl-card-main[href*="/empresa/"]').evaluateAll((anchors) =>
    anchors.map((a) => {
      const href = a.getAttribute('href') || '';
      const article = a.closest('article');
      const text = (article?.innerText || a.innerText || '').replace(/\s+/g, ' ').trim();
      const name = (a.querySelector('h2')?.textContent || '').replace(/\s+/g, ' ').trim();
      const category = (a.querySelector('.mbl-category span')?.textContent || '').replace(/\s+/g, ' ').trim();
      return { href, text, name, category };
    })
  ).catch(() => []);

  const seen = new Set();
  return candidates.filter((c) => {
    const url = safeUrl(c.href);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return !isExcluded(c.name, c.category) && !isExcluded(c.text);
  }).map((c) => ({ ...c, url: safeUrl(c.href) }));
}

async function scoreBusiness(context, candidate) {
  const page = await openPage(context, candidate.url);
  try {
    const bodyText = normalize(await page.locator('body').innerText().catch(() => ''));
    const name = (await page.locator('.mbp-company-copy h1').first().textContent().catch(() => candidate.name))?.trim() || candidate.name;
    const category = (await page.locator('.mbp-category').first().textContent().catch(() => candidate.category))?.trim() || candidate.category;
    if (isExcluded(name, category) || isExcluded(bodyText)) return null;

    const count = async (selector) => page.locator(selector).count().catch(() => 0);
    const gallery = await count('.mbp-gallery');
    const logo = await count('.mbp-logo img');
    const cover = await count('.mbp-gallery-main img');
    const galleryThumbs = await count('.mbp-gallery-thumb img');
    const contacts = await count('.mbp-contact-card');
    const items = await count('.mbp-offer-section .mbp-item-card');
    const reviews = await count('.mbp-review-summary');
    const promo = await count('.mbp-promo-grid .mbp-promo-card');
    const push = await count('.mbp-business-notification');
    const actions = await count('.mbp-action-row .mbp-secondary-action');
    const instagram = await count('a[href*="instagram.com"]');
    const whatsapp = await count('a[href*="wa.me"], [data-track="whatsapp"]');
    const description = (await page.locator('.mbp-company-copy p').first().textContent().catch(() => ''))?.trim();
    const hasDescription = description && description.length > 20;

    const score =
      logo * 2 + cover * 2 + gallery * 2 + Math.min(galleryThumbs, 3) * 1 +
      contacts * 1 + Math.min(items, 6) * 5 + reviews * 3 + promo * 12 +
      push * 3 + actions * 1 + instagram * 1 + whatsapp * 2 + (hasDescription ? 1 : 0);

    return {
      ...candidate,
      name,
      category,
      score,
      features: { gallery, logo, cover, galleryThumbs, contacts, items, reviews, promo, push, actions, instagram, whatsapp },
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function chooseBusiness(context, candidates) {
  const scored = [];
  for (const candidate of candidates.slice(0, 20)) {
    try {
      const result = await scoreBusiness(context, candidate);
      if (result) scored.push(result);
    } catch (error) {
      console.warn(`[business] failed ${candidate.name}: ${error.message}`);
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const rich = scored.filter((x) =>
    x.features.promo > 0 ||
    x.features.items > 0 ||
    x.features.reviews > 0 ||
    x.features.galleryThumbs >= 2
  );
  const ranked = rich.length ? rich : scored;
  console.log('[business] top candidates:', ranked.slice(0, 5).map((x) => ({
    name: x.name, score: x.score, promo: x.features.promo,
    items: x.features.items, reviews: x.features.reviews,
    galleryThumbs: x.features.galleryThumbs
  })));
  const selected = ranked[0];
  if (!selected) throw new Error('Nenhuma empresa elegível foi encontrada no catálogo público.');
  console.log('[business] selected:', JSON.stringify(selected, null, 2));
  return selected;
}
async function screenshotViewport(page, file) {
  await page.screenshot({ path: file, type: 'png', fullPage: false, animations: 'disabled' });
  return file;
}

async function captureRealScreens(context, selected) {
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const files = {};

  async function scrollToSelector(selector, offset = 150) {
    const locator = page.locator(selector).first();
    if (!(await locator.count())) return false;
    const y = await locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY).catch(() => null);
    if (typeof y !== 'number') return false;
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), Math.max(0, y - offset));
    await page.waitForTimeout(220);
    return true;
  }

  async function snap(name, file) {
    files[name] = path.join(CAPTURE_DIR, file);
    await screenshotViewport(page, files[name]);
  }

  try {
    const homeUrl = `${BASE_URL}/${CITY}`;
    const catalogUrl = `${BASE_URL}/${CITY}/empresas?q=${encodeURIComponent(selected.name)}`;

    await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page);
    await snap('home', 'home-real.png');

    await page.goto(catalogUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page, { selector: '.mbl-grid' });
    await snap('catalog', 'catalog-real.png');

    await page.goto(selected.url, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page, { selector: '.mbp-main-card' });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(220);
    await snap('profileHero', 'profile-hero-real.png');

    await scrollToSelector('.mbp-contact-grid', 145);
    await snap('profileContact', 'profile-contact-real.png');

    await scrollToSelector('.mbp-offer-section', 125);
    await snap('profileOffer', 'profile-offer-real.png');

    if (await scrollToSelector('.mbp-business-notification', 150)) {
      await snap('profileNotification', 'profile-notification-real.png');
    }

    const promoFound = await scrollToSelector('.mbp-promo-grid', 125);
    if (promoFound) {
      await snap('promo', 'promotion-real.png');
    }

    const promoData = await page.locator('.mbp-promo-card').evaluateAll((cards) => cards.slice(0, 3).map((card) => ({
      title: (card.querySelector('strong')?.textContent || '').trim(),
      description: (card.querySelector('p')?.textContent || '').trim(),
      price: (card.querySelector('b')?.textContent || '').trim(),
    }))).catch(() => []);

    await page.goto(`${BASE_URL}/${CITY}/promocoes`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page);
    if (await page.locator('.promotion-card').count().catch(() => 0)) {
      await snap('promotionsPage', 'promotions-page-real.png');
    }

    await page.goto(`${BASE_URL}/${CITY}/eventos`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page);
    if (await page.locator('.vl-event').count().catch(() => 0)) {
      await snap('eventsPage', 'events-page-real.png');
    }

    return { ...files, promoData, profileUrl: selected.url };
  } finally {
    await page.close().catch(() => {});
  }
}
async function captureMerchantPushIfAuthenticated(context, selected) {
  if (!STORAGE_STATE) return null;
  const statePath = path.resolve(STORAGE_STATE);
  if (!(await exists(statePath))) {
    console.warn('[merchant] storage state not found:', statePath);
    return null;
  }
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/conta`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page);
    const promoNav = page.getByText('Promoções', { exact: true }).first();
    if (await promoNav.count()) await promoNav.click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
    const switcher = page.locator('.account-business-switcher select').first();
    if (await switcher.count()) {
      const options = await switcher.locator('option').evaluateAll((opts) => opts.map((o) => ({ value: o.value, label: (o.textContent || '').trim() })));
      const target = options.find((o) => normalize(o.label) === normalize(selected.name));
      if (target) await switcher.selectOption(target.value).catch(() => {});
    }
    await page.waitForTimeout(700);
    const send = page.getByRole('button', { name: /Enviar notificação/i }).first();
    if (!(await send.count())) return null;
    await send.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
    const confirm = page.locator('.owner-promo-notification-confirm').first();
    if (!(await confirm.count())) return null;
    const file = path.join(CAPTURE_DIR, 'merchant-push-real.png');
    await screenshotViewport(page, file);
    return file;
  } finally {
    await page.close().catch(() => {});
  }
}

function dataUrl(file) {
  return fs.readFile(file).then((buf) => `data:image/png;base64,${buf.toString('base64')}`);
}

function svgIcon(name, size = 30) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    store: `<svg ${common}><path d="M4 10.5h16"/><path d="M5 10.5V20h14v-9.5"/><path d="M3.5 10.5 5 5h14l1.5 5.5"/><path d="M8 20v-5h8v5"/></svg>`,
    bag: `<svg ${common}><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
    shoppingCart: `<svg ${common}><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M3 4h2l2.2 10.5h10.7L20 8H7"/></svg>`,
    heart: `<svg ${common}><path d="M20.8 8.7c0 5.2-8.8 10.2-8.8 10.2S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z"/></svg>`,
    medical: `<svg ${common}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>`,
    star: `<svg ${common}><path d="m12 3.8 2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8Z"/></svg>`,
    scissors: `<svg ${common}><circle cx="7" cy="7" r="2"/><circle cx="7" cy="17" r="2"/><path d="m8.5 8.5 11 11M8.5 15.5 14 10"/></svg>`,
    pin: `<svg ${common}><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>`,
    hotel: `<svg ${common}><path d="M4 20V6h16v14M7 9h3v3H7zM14 9h3v3h-3zM7 15h3v3H7zM14 15h3v3h-3z"/></svg>`,
    home: `<svg ${common}><path d="m3 11 9-7 9 7"/><path d="M5.5 10.5V20h13v-9.5M10 20v-5h4v5"/></svg>`,
    briefcase: `<svg ${common}><rect x="4" y="6.5" width="16" height="12.5" rx="2"/><path d="M9 6.5V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M4 11h16M10 11v2h4v-2"/></svg>`,
    wrench: `<svg ${common}><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.2 2.2-2.6-.7-.7-2.6Z"/></svg>`,
    utensils: `<svg ${common}><path d="M7 3v7.5a2.5 2.5 0 0 0 5 0V3"/><path d="M9.5 3v18M15 3v18"/><path d="M15 3c2.7 1.3 4 3.5 4 6.5v3.5h-4"/></svg>`,
    grid: `<svg ${common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>`
  };
  return icons[name] || icons.grid;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

async function buildComposition(real, logoData, categories) {
  const images = {};
  for (const [key, value] of Object.entries(real)) {
    if (typeof value === 'string' && value.endsWith('.png') && await exists(value)) images[key] = await dataUrl(value);
  }

  const categoryIconMap = {
    restaurantes: 'utensils', alimentação: 'utensils', lojas: 'shoppingCart',
    compras: 'bag', serviços: 'wrench', saúde: 'medical', beleza: 'scissors',
    turismo: 'hotel', automóveis: 'briefcase', imóveis: 'home', pets: 'heart'
  };

  const categoryHtml = categories.slice(0, 6).map((cat, i) => {
    const key = normalize(cat);
    const icon = categoryIconMap[key] || (key.includes('saud') ? 'medical' : key.includes('loj') ? 'shoppingCart' : key.includes('serv') ? 'wrench' : key.includes('tur') ? 'hotel' : 'grid');
    return `<div class="category c${i}"><span class="category-no">0${i + 1}</span><span class="category-icon">${svgIcon(icon, 30)}</span><strong>${escapeHtml(cat)}</strong></div>`;
  }).join('');

  const hasPromotions = Boolean(images.promotionsPage || images.promo);
  const hasEvents = Boolean(images.eventsPage);
  const hasMerchantPush = Boolean(real.merchantPush && images.merchantPush);
  const hasBusinessNotification = Boolean(images.profileNotification);

  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=__WIDTH__, initial-scale=1"><title>VitrineLocal Showreel</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;width:__WIDTH__px;height:__HEIGHT__px;overflow:hidden;background:#061426;font-family:Inter,Manrope,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#fff}
body{background:radial-gradient(circle at 50% 28%,#123a68 0,#091d34 38%,#06111f 100%)}
#stage{position:relative;width:100%;height:100%;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 50% 34%,rgba(67,151,255,.18),transparent 28%),radial-gradient(circle at 20% 75%,rgba(30,105,245,.12),transparent 32%),linear-gradient(180deg,#071b30,#061220)}
.grid{position:absolute;inset:-15%;opacity:.12;background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);background-size:72px 72px;transform:perspective(700px) rotateX(58deg) translateY(240px) scale(1.25)}
.orb{position:absolute;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(46,136,255,.17),transparent 68%);filter:blur(14px);left:230px;top:470px}
.logo{position:absolute;top:585px;left:160px;width:760px;filter:drop-shadow(0 24px 60px rgba(0,0,0,.3));opacity:0;transform:scale(.86)}
.word{position:absolute;left:55px;right:55px;top:160px;text-align:center;color:#fff;font-weight:950;letter-spacing:-4px;line-height:.9;font-size:96px;opacity:0;transform:translateY(35px) scale(.96);text-transform:uppercase;text-shadow:0 16px 50px rgba(0,0,0,.26)}
.categories{position:absolute;inset:0;opacity:0}
.category{position:absolute;display:grid;grid-template-columns:40px 58px 1fr;align-items:center;gap:14px;min-width:420px;background:linear-gradient(180deg,rgba(255,255,255,.99),rgba(245,249,255,.96));padding:16px 20px;border:1px solid rgba(255,255,255,.8);border-radius:24px;box-shadow:0 24px 70px rgba(0,0,0,.26),0 0 0 1px rgba(36,119,255,.07);color:#0b2037;font-size:27px;letter-spacing:-.6px;opacity:0;transform:translateY(55px) scale(.92);white-space:nowrap}
.category-no{font-size:12px;font-weight:900;color:#6f88a4;letter-spacing:1px}.category-icon{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,#1268ff,#46a0ff);color:#fff;box-shadow:0 12px 28px rgba(22,103,255,.32),inset 0 1px 0 rgba(255,255,255,.34)}
.c0{left:45px;top:420px}.c1{right:45px;top:565px}.c2{left:68px;top:765px}.c3{right:54px;top:885px}.c4{left:88px;top:1080px}.c5{right:45px;top:1200px}
.phone{position:absolute;left:170px;top:300px;width:740px;height:1320px;background:#030911;border-radius:76px;padding:16px;box-shadow:0 50px 120px rgba(0,0,0,.56),0 0 0 2px rgba(255,255,255,.09);opacity:0;transform:translateY(90px) scale(.92)}
.phone::before{content:"";position:absolute;left:50%;top:22px;transform:translateX(-50%);width:180px;height:42px;border-radius:28px;background:#000;z-index:5}.screen{position:absolute;inset:16px;border-radius:61px;overflow:hidden;background:#fff}.screen img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;opacity:0}.screen img.active{opacity:1}
.callout{position:absolute;padding:13px 17px;background:rgba(255,255,255,.97);border:1px solid rgba(20,65,110,.08);border-radius:18px;box-shadow:0 18px 46px rgba(0,0,0,.18);font-size:21px;font-weight:900;color:#102944;opacity:0;transform:translateY(20px) scale(.95)}.callout small{display:block;font-size:12px;color:#74859a;margin-top:5px;font-weight:750}
.ca1{left:42px;top:705px}.ca2{right:36px;top:855px}.ca3{left:40px;top:1085px}.ca4{right:34px;top:1275px}
.kicker{position:absolute;left:60px;right:60px;top:1260px;text-align:center;color:#86baff;font-size:14px;font-weight:900;letter-spacing:2px;text-transform:uppercase;opacity:0}
.final{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transform:scale(.97)}.final img{width:680px;filter:drop-shadow(0 20px 55px rgba(0,0,0,.3))}.final h2{font-size:47px;letter-spacing:-1.8px;margin:36px 0 12px;text-align:center;line-height:1.03}.final p{font-size:26px;color:#bfd5ef;font-weight:700;margin:0}.final .url{margin-top:25px;color:#68a8ff;font-weight:900;font-size:28px}
.light{position:absolute;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(68,157,255,.22),transparent 70%);filter:blur(10px);opacity:0}.l1{left:-80px;top:780px}.l2{right:-80px;top:1020px}
</style></head>
<body><div id="stage"><div class="bg"></div><div class="grid"></div><div class="orb"></div><div class="light l1"></div><div class="light l2"></div>
<img class="logo" id="logo" src="__LOGO__" alt="VitrineLocal"><div class="word" id="word"></div><div class="categories" id="categories">__CATS__</div>
<div class="phone" id="phone"><div class="screen"><img id="screenA" class="active" src="__HOME_IMAGE__"><img id="screenB" src=""></div></div>
<div class="callout ca1" id="ca1">Descubra<small>negócios locais</small></div><div class="callout ca2" id="ca2">Compare<small>informações reais</small></div><div class="callout ca3" id="ca3">Veja ofertas<small>conteúdo real</small></div><div class="callout ca4" id="ca4">Conecte-se<small>com a empresa</small></div><div class="kicker" id="kicker"></div>
<div class="final" id="final"><img src="__LOGO__" alt="VitrineLocal"><h2>Para quem procura.<br>Para quem empreende.</h2><p>Sua cidade em uma única vitrine.</p><div class="url">vitrinelocal.net</div></div></div>
<script>
const images=__IMAGES__;
const flags=__FLAGS__;
const $=id=>document.getElementById(id);const els={logo:$('logo'),word:$('word'),cats:$('categories'),phone:$('phone'),a:$('screenA'),b:$('screenB'),final:$('final'),kicker:$('kicker'),l1:document.querySelector('.l1'),l2:document.querySelector('.l2')};
const cats=[...document.querySelectorAll('.category')],calls=[...document.querySelectorAll('.callout')];let layer='a',current='home';
function visible(){return layer==='a'?els.a:els.b}function hidden(){return layer==='a'?els.b:els.a}
function show(key,m=0){if(!images[key])return;if(key!==current){const h=hidden(),v=visible();h.src=images[key];h.classList.add('active');v.classList.remove('active');layer=layer==='a'?'b':'a';current=key}const im=visible();im.style.transform='translate('+Math.sin(m*.7)*8+'px,'+Math.cos(m*.55)*9+'px) scale('+(1.018+Math.sin(m*.8)*.018)+')'}
function fade(e,on,x=0,y=0,s=1){e.style.opacity=on?'1':'0';e.style.transform=on?'translate('+x+'px,'+y+'px) scale('+s+')':'translate(0,26px) scale(.98)'}
function clearCalls(){calls.forEach(x=>x.style.opacity='0')}
function scene(t){
  fade(els.l1,t>6200&&t<35000);fade(els.l2,t>12500&&t<35000);
  if(t<2600){fade(els.logo,true,0,0,.9+Math.min(.1,t/2600));fade(els.phone,false);fade(els.cats,false);fade(els.final,false);fade(els.kicker,false);clearCalls()}
  else if(t<5700){
    fade(els.logo,true,0,-185,.6);fade(els.phone,false);fade(els.cats,true);fade(els.final,false);clearCalls();
    cats.forEach((e,i)=>{const p=Math.max(0,Math.min(1,(t-(2600+i*135))/650));e.style.opacity=p;e.style.transform='translateY('+((1-p)*38)+'px) translateX('+Math.sin(i*1.1)*8+'px) scale('+(0.92+p*.08)+')'})
    fade(els.word,true,0,98,.72);els.word.textContent='DESCUBRA.';els.word.style.top='1370px';els.word.style.fontSize='82px'
  } else if(t<9700){
    fade(els.logo,false);fade(els.cats,false);fade(els.phone,true);fade(els.word,true,0,128,.72);els.word.textContent='TUDO EM UM SÓ LUGAR.';els.word.style.top='145px';els.word.style.fontSize='66px';show('home',(t-5700)/4000)
  } else if(t<13500){
    fade(els.phone,true,0,0,1.01);fade(els.word,true,0,128,.82);els.word.textContent='ENCONTRE.';els.word.style.top='145px';els.word.style.fontSize='96px';show('catalog',(t-9700)/3800)
  } else if(t<17300){
    fade(els.phone,true,0,0,1.02);fade(els.word,true,0,126,.76);els.word.textContent='CONHEÇA.';els.word.style.top='145px';els.word.style.fontSize='92px';show('profileHero',(t-13500)/3800)
    clearCalls();calls[0].style.opacity='1';calls[1].style.opacity='1'
  } else if(t<20500){
    fade(els.phone,true,0,0,1.02);fade(els.word,true,0,126,.82);els.word.textContent='VEJA MAIS.';els.word.style.top='148px';els.word.style.fontSize='88px';show('profileContact',(t-17300)/3200)
    clearCalls();calls[2].style.opacity='1';calls[3].style.opacity='1'
  } else if(t<23500){
    fade(els.phone,true,0,0,1.02);fade(els.word,true,0,128,.8);els.word.textContent='O QUE ELA OFERECE.';els.word.style.top='148px';els.word.style.fontSize='64px';show('profileOffer',(t-20500)/3000);clearCalls()
  } else if(t<27000){
    const key=flags.promos?'promotionsPage':(flags.notification?'profileNotification':'profileOffer');fade(els.phone,true);fade(els.word,true,0,130,.8);els.word.textContent=flags.promos?'PROMOÇÕES.':'FIQUE POR PERTO.';els.word.style.top='150px';els.word.style.fontSize='78px';show(key,(t-23500)/3500);fade(els.kicker,true);els.kicker.textContent=flags.promos?'OFERTAS LOCAIS':'NOTIFICAÇÕES DA EMPRESA';clearCalls()
  } else if(t<30500){
    const key=flags.merchant?'merchantPush':(flags.notification?'profileNotification':'home');fade(els.phone,true,0,0,1.01);fade(els.word,true,0,125,.8);els.word.textContent=flags.merchant?'ENVIE.':'CONECTE-SE.';els.word.style.top='155px';els.word.style.fontSize='88px';show(key,(t-27000)/3500);fade(els.kicker,true);els.kicker.textContent=flags.merchant?'PAINEL DO EMPREENDEDOR':'NOTIFICAÇÃO REAL';clearCalls()
  } else if(t<34000){
    const key=flags.events?'eventsPage':'home';fade(els.phone,true,0,45,.97);fade(els.word,true,0,135,.58);els.word.textContent=flags.events?'AGENDA.':'SUA CIDADE.';els.word.style.top='205px';els.word.style.fontSize='98px';show(key,(t-30500)/3500);fade(els.kicker,true);els.kicker.textContent=flags.events?'EVENTOS EM LAGUNA':'UMA CIDADE EM MOVIMENTO';clearCalls()
  } else if(t<37000){fade(els.phone,false);fade(els.word,true,0,-430,.58);els.word.textContent='VITRINE LOCAL';els.word.style.top='210px';els.word.style.fontSize='92px';fade(els.kicker,false);fade(els.logo,false);clearCalls()}
  else {fade(els.word,false);fade(els.phone,false);fade(els.logo,false);fade(els.kicker,false);fade(els.final,true)}
}
const DURATION=__DURATION__;
const START_TIME=performance.now();
function tick(now){const t=Math.min(DURATION,now-START_TIME);scene(t);if(t<DURATION)requestAnimationFrame(tick)}
requestAnimationFrame(tick);
</script></body></html>`;

  const runtimeImages = JSON.stringify({
    home: images.home || '',
    catalog: images.catalog || '',
    profileHero: images.profileHero || '',
    profileContact: images.profileContact || '',
    profileOffer: images.profileOffer || '',
    profileNotification: images.profileNotification || '',
    promo: images.promo || '',
    promotionsPage: images.promotionsPage || '',
    eventsPage: images.eventsPage || '',
    merchantPush: images.merchantPush || ''
  });
  const runtimeFlags = JSON.stringify({
    promos: hasPromotions,
    events: hasEvents,
    merchant: hasMerchantPush,
    notification: hasBusinessNotification
  });
  const finalHtml = html
    .replaceAll('__WIDTH__', String(WIDTH))
    .replaceAll('__HEIGHT__', String(HEIGHT))
    .replaceAll('__DURATION__', String(DURATION_MS))
    .replaceAll('__LOGO__', logoData || '')
    .replaceAll('__CATS__', categoryHtml)
    .replaceAll('__IMAGES__', runtimeImages)
    .replaceAll('__FLAGS__', runtimeFlags)
    .replaceAll('__HOME_IMAGE__', images.home || '');
  await fs.writeFile(COMPOSITION_HTML, finalHtml, 'utf8');
}
async function renderComposition() {
  console.log('[render] starting Chromium video render');

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-gpu', '--force-color-profile=srgb'],
  });

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: OUT_DIR,
      size: { width: WIDTH, height: HEIGHT },
      fps: FPS,
    },
  });

  const page = await context.newPage();
  const video = page.video();

  let crashed = false;
  page.on('crash', () => {
    crashed = true;
    console.error('[render] Chromium page crashed');
  });
  page.on('pageerror', (error) => {
    console.warn('[render] pageerror:', error.message);
  });
  browser.on('disconnected', () => {
    console.warn('[render] browser disconnected');
  });

  try {
    await page.goto(pathToFileURL(COMPOSITION_HTML).toString(), { waitUntil: 'domcontentloaded' });
    console.log('[render] composition loaded');

    // Do not use page.waitForTimeout here: if Chromium tears down the target,
    // Playwright throws "Target page, context or browser has been closed".
    // A Node timer keeps the render clock independent from the page lifecycle.
    await new Promise((resolve) => setTimeout(resolve, DURATION_MS + 500));

    if (crashed) {
      throw new Error('Chromium encerrou a página durante a renderização.');
    }
    if (page.isClosed()) {
      throw new Error('A página da composição foi fechada antes do fim da renderização.');
    }

    console.log('[render] duration elapsed, finalizing video');
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  if (!video) throw new Error('Playwright não criou o objeto de vídeo.');

  // Playwright guarantees the video file after the page/context is closed.
  const videoPath = await video.path();
  await fs.copyFile(videoPath, RAW_WEBM);

  console.log('[render] raw video:', RAW_WEBM);
  return RAW_WEBM;
}

async function transcode(raw) {
  console.log('[ffmpeg] enforcing 1080x1920 @ 30fps');
  await execFileAsync('ffmpeg', [
    '-y', '-i', raw,
    '-vf', `fps=${FPS},scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x07182a`,
    '-an', '-t', String(DURATION_MS / 1000), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    FINAL_MP4,
  ], { maxBuffer: 20 * 1024 * 1024 });
  await execFileAsync('ffmpeg', [
    '-y', '-i', raw,
    '-vf', `fps=${FPS},scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x07182a`,
    '-an', '-t', String(DURATION_MS / 1000), '-c:v', 'libvpx-vp9', '-b:v', '8M', '-deadline', 'good',
    FINAL_WEBM,
  ], { maxBuffer: 20 * 1024 * 1024 });
}

async function validate(file) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,duration,codec_name',
    '-of', 'json', file,
  ]);
  const info = JSON.parse(stdout).streams?.[0];
  if (!info) throw new Error('ffprobe não encontrou stream de vídeo.');
  const fps = Number(String(info.avg_frame_rate || '0/1').split('/')[0]) / Number(String(info.avg_frame_rate || '0/1').split('/')[1] || 1);
  const duration = Number(info.duration || 0);
  console.log('[validate]', { width: info.width, height: info.height, fps: Number(fps.toFixed(3)), duration: Number(duration.toFixed(3)), codec: info.codec_name });
  if (Number(info.width) !== WIDTH || Number(info.height) !== HEIGHT) throw new Error('Dimensão final incorreta.');
  if (Math.abs(fps - FPS) > 0.05) throw new Error(`FPS final incorreto: ${fps}`);
  if (duration < 38 || duration > 43) throw new Error(`Duração inesperada: ${duration}s`);
}

async function main() {
  await fs.mkdir(CAPTURE_DIR, { recursive: true });
  console.log(`\nVitrineLocal Launch Showreel\nBase: ${BASE_URL}\nCidade: ${CITY}\nSaída: ${OUT_DIR}\n`);

  const captureBrowser = await chromium.launch({ headless: HEADLESS });
  const captureContext = await captureBrowser.newContext({
    viewport: { width: MOBILE_W, height: MOBILE_H },
    deviceScaleFactor: 1,
    storageState: STORAGE_STATE ? path.resolve(STORAGE_STATE) : undefined,
  });

  try {
    const home = await openPage(captureContext, `${BASE_URL}/${CITY}`);
    const logoData = await getLogoData(home);
    const catalog = await openPage(captureContext, `${BASE_URL}/${CITY}/empresas`);
    const categories = await collectCategories(catalog);
    const candidates = await collectBusinesses(catalog);
    console.log('[catalog] candidates:', candidates.length);
    if (!candidates.length) throw new Error('Não foi possível encontrar empresas no catálogo público.');
    const selected = await chooseBusiness(captureContext, candidates);
    const real = await captureRealScreens(captureContext, selected);
    real.selected = selected;
    real.merchantPush = await captureMerchantPushIfAuthenticated(captureContext, selected);
    await buildComposition(real, logoData, categories);
  } finally {
    await captureContext.close().catch(() => {});
    await captureBrowser.close();
  }

  const raw = await renderComposition();
  await transcode(raw);
  await validate(FINAL_MP4);
  await validate(FINAL_WEBM);

  console.log('\n✅ Vídeo gerado:');
  console.log('MP4 :', FINAL_MP4);
  console.log('WEBM:', FINAL_WEBM);
  console.log('RAW :', RAW_WEBM);
  console.log('CAPTURES:', CAPTURE_DIR);
}

main().catch((error) => {
  console.error('\n❌ Geração falhou:', error?.stack || error);
  process.exitCode = 1;
});
