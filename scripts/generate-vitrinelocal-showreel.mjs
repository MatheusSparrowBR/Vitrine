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
      contacts * 1 + Math.min(items, 4) * 2 + reviews * 2 + promo * 6 +
      push * 2 + actions * 1 + instagram * 1 + whatsapp * 2 + (hasDescription ? 1 : 0);

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
  const selected = scored.find((x) => x.features.promo > 0 && (x.features.items > 0 || x.features.whatsapp > 0)) || scored[0];
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
  try {
    const homeUrl = `${BASE_URL}/${CITY}`;
    const catalogUrl = `${BASE_URL}/${CITY}/empresas?q=${encodeURIComponent(selected.name)}`;
    const profileUrl = selected.url;
    await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page);
    files.home = path.join(CAPTURE_DIR, 'home-real.png');
    await screenshotViewport(page, files.home);

    await page.goto(catalogUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page, { selector: '.mbl-grid' });
    files.catalog = path.join(CAPTURE_DIR, 'catalog-real.png');
    await screenshotViewport(page, files.catalog);

    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await waitForReady(page, { selector: '.mbp-main-card' });
    files.profileHero = path.join(CAPTURE_DIR, 'profile-hero-real.png');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(250);
    await screenshotViewport(page, files.profileHero);

    const contact = page.locator('.mbp-contact-grid').first();
    if (await contact.count()) {
      await contact.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(250);
    }
    files.profileContact = path.join(CAPTURE_DIR, 'profile-contact-real.png');
    await screenshotViewport(page, files.profileContact);

    const offer = page.locator('.mbp-offer-section').first();
    if (await offer.count()) {
      await offer.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(250);
    }
    files.profileOffer = path.join(CAPTURE_DIR, 'profile-offer-real.png');
    await screenshotViewport(page, files.profileOffer);

    const promo = page.locator('.mbp-promo-grid').first();
    if (await promo.count()) {
      await promo.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(250);
      files.promo = path.join(CAPTURE_DIR, 'promotion-real.png');
      await screenshotViewport(page, files.promo);
    }

    const promoData = await page.locator('.mbp-promo-card').evaluateAll((cards) => cards.slice(0, 3).map((card) => ({
      title: (card.querySelector('strong')?.textContent || '').trim(),
      description: (card.querySelector('p')?.textContent || '').trim(),
      price: (card.querySelector('b')?.textContent || '').trim(),
    }))).catch(() => []);

    return { ...files, promoData, profileUrl };
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

function svgIcon(name, size = 28) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    store: `<svg ${common}><path d="M3 9h18"/><path d="M5 9l1-5h12l1 5"/><path d="M5 9v10h14V9"/><path d="M9 19v-6h6v6"/></svg>`,
    bag: `<svg ${common}><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`,
    heart: `<svg ${common}><path d="M20.8 8.9c0 5.5-8.8 10-8.8 10s-8.8-4.5-8.8-10A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 8.8 2.5Z"/></svg>`,
    pin: `<svg ${common}><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg>`,
    wrench: `<svg ${common}><path d="M14.7 6.3a4.2 4.2 0 0 0-5.4 5.4L4 17a2.1 2.1 0 1 0 3 3l5.3-5.3a4.2 4.2 0 0 0 5.4-5.4l-2.8 2.8-2.2-2.2 2.8-2.8Z"/></svg>`,
    car: `<svg ${common}><path d="M5 17h14l-1-6H6l-1 6Z"/><path d="M8 11l1-3h6l1 3"/><circle cx="8" cy="18" r="1.3"/><circle cx="16" cy="18" r="1.3"/></svg>`,
    utensils: `<svg ${common}><path d="M7 3v7"/><path d="M5 3v4a2 2 0 0 0 4 0V3"/><path d="M7 9v12"/><path d="M15 3c-1 2-1 5 1 7v11"/><path d="M15 10h4"/></svg>`,
    star: `<svg ${common}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>`,
  };
  return icons[name] || icons.store;
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
    restaurantes: 'store',
    alimentação: 'utensils',
    lojas: 'bag',
    compras: 'bag',
    serviços: 'wrench',
    saúde: 'heart',
    beleza: 'star',
    turismo: 'pin',
    automóveis: 'car',
  };
  const categoryHtml = categories.slice(0, 6).map((cat, i) => {
    const key = normalize(cat);
    const icon = categoryIconMap[key] || (key.includes('saud') ? 'heart' : key.includes('loj') || key.includes('compr') ? 'bag' : key.includes('serv') ? 'wrench' : 'store');
    return `<div class="category c${i}"><span class="category-icon">${svgIcon(icon, 28)}</span><strong>${escapeHtml(cat)}</strong></div>`;
  }).join('');

  const title = escapeHtml(real.selected?.name || 'Empresa local');
  const promoTitle = escapeHtml(real.promoData?.[0]?.title || 'Nova promoção');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${WIDTH}, initial-scale=1, viewport-fit=cover">
<title>VitrineLocal Showreel</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:#07182a;font-family:Manrope,Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#07182a}
body{background:radial-gradient(circle at 50% 35%,#18385d 0,#0a1d32 40%,#061220 100%)}
#stage{position:relative;width:100%;height:100%;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,rgba(45,125,255,.18),transparent 35%),linear-gradient(180deg,#071b30,#061220)}
.grid{position:absolute;inset:-10%;opacity:.12;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:80px 80px;transform:perspective(700px) rotateX(58deg) translateY(220px) scale(1.25)}
.orb{position:absolute;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,rgba(37,130,255,.2),transparent 68%);filter:blur(8px);left:310px;top:500px}
.logo{position:absolute;top:560px;left:160px;width:760px;height:auto;filter:drop-shadow(0 18px 45px rgba(0,0,0,.25));opacity:0;transform:scale(.88)}
.word{position:absolute;left:70px;right:70px;top:220px;text-align:center;color:#fff;font-weight:900;letter-spacing:-3px;line-height:.95;font-size:108px;opacity:0;transform:translateY(40px);text-transform:uppercase}
.subword{position:absolute;left:110px;right:110px;top:1420px;text-align:center;color:#cfe3ff;font-size:30px;font-weight:700;letter-spacing:.2px;opacity:0;transform:translateY(25px)}
.categories{position:absolute;inset:0;opacity:0}
.category{position:absolute;display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.96);padding:18px 24px;border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.24);color:#0b2037;font-size:29px;letter-spacing:-.5px;white-space:nowrap;opacity:0;transform:translateY(60px) scale(.94)}
.category-icon{display:grid;place-items:center;color:#156eff}
.c0{left:70px;top:440px}.c1{right:64px;top:590px}.c2{left:90px;top:810px}.c3{right:80px;top:920px}.c4{left:120px;top:1140px}.c5{right:70px;top:1260px}
.phone{position:absolute;left:170px;top:300px;width:740px;height:1320px;background:#030a12;border-radius:74px;padding:18px;box-shadow:0 50px 120px rgba(0,0,0,.5),0 0 0 2px rgba(255,255,255,.08);opacity:0;transform:translateY(90px) scale(.92)}
.phone::before{content:"";position:absolute;left:50%;top:24px;transform:translateX(-50%);width:180px;height:44px;border-radius:30px;background:#000;z-index:5;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.screen{position:absolute;inset:18px;border-radius:58px;overflow:hidden;background:#fff}
.screen img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;opacity:0;transition:opacity .65s ease,transform .8s ease;transform:scale(1.02)}
.screen img.active{opacity:1;transform:scale(1)}
.phone.glow{box-shadow:0 50px 120px rgba(0,0,0,.5),0 0 60px rgba(42,122,255,.22)}
.callout{position:absolute;padding:14px 18px;background:rgba(255,255,255,.95);border:1px solid rgba(20,65,110,.08);border-radius:17px;box-shadow:0 16px 40px rgba(0,0,0,.14);font-size:22px;font-weight:850;color:#102944;opacity:0;transform:translateY(24px)}
.callout small{display:block;font-size:12px;color:#74859a;margin-top:5px;font-weight:700}
.ca1{left:44px;top:700px}.ca2{right:40px;top:880px}.ca3{left:45px;top:1120px}.ca4{right:40px;top:1290px}
.section-word{position:absolute;left:55px;right:55px;top:180px;color:#fff;text-align:center;font-size:104px;line-height:.92;font-weight:900;letter-spacing:-4px;text-transform:uppercase;opacity:0;transform:translateY(45px)}
.promo-shell{position:absolute;left:95px;right:95px;top:500px;border:1px solid rgba(255,255,255,.14);border-radius:32px;padding:28px;background:linear-gradient(180deg,rgba(15,44,74,.92),rgba(8,25,42,.92));box-shadow:0 30px 80px rgba(0,0,0,.35);opacity:0;transform:translateY(60px) scale(.96)}
.promo-shell .eyebrow{color:#8dc1ff;font-size:13px;font-weight:900;letter-spacing:1.8px}.promo-shell h2{margin:10px 0 8px;color:#fff;font-size:42px;line-height:1.02;letter-spacing:-1.4px}.promo-shell p{margin:0;color:#bbcee3;font-size:20px;line-height:1.4}.send-btn{margin-top:22px;display:inline-flex;align-items:center;gap:10px;padding:14px 18px;border-radius:14px;background:#2a78ff;color:#fff;font-weight:900;font-size:18px;box-shadow:0 10px 28px rgba(42,120,255,.3)}
.push-card{position:absolute;left:70px;right:70px;top:280px;background:#fff;border-radius:30px;padding:26px 28px;box-shadow:0 30px 90px rgba(0,0,0,.3);display:grid;grid-template-columns:58px 1fr auto;gap:18px;align-items:center;opacity:0;transform:translateY(-40px)}
.push-icon{width:58px;height:58px;border-radius:17px;background:#1671ff;color:#fff;display:grid;place-items:center;font-size:28px}.push-text strong{display:block;color:#11283f;font-size:14px;letter-spacing:.5px;text-transform:uppercase}.push-text b{display:block;color:#0b1f35;font-size:23px;letter-spacing:-.5px;margin-top:4px}.push-text span{display:block;color:#74869a;font-size:15px;margin-top:4px}.push-action{color:#1267e8;font-size:15px;font-weight:900;white-space:nowrap}
.final{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transform:scale(.97);color:#fff}.final img{width:680px;filter:drop-shadow(0 20px 55px rgba(0,0,0,.3));}.final h2{font-size:47px;letter-spacing:-1.5px;margin:36px 0 12px;text-align:center;line-height:1.05}.final p{font-size:26px;color:#bfd5ef;font-weight:700;margin:0}.final .url{margin-top:25px;color:#68a8ff;font-weight:900;font-size:28px}
.motion-line{position:absolute;height:2px;background:linear-gradient(90deg,transparent,#5ea3ff,transparent);filter:blur(.2px);opacity:0}
#line1{left:30px;right:30px;top:480px}.#line2{left:70px;right:70px;top:1240px}
</style></head>
<body>
<div id="stage">
  <div class="bg"></div><div class="grid"></div><div class="orb"></div>
  <img class="logo" id="logo" src="${logoData || ''}" alt="VitrineLocal">
  <div class="word" id="word"></div>
  <div class="subword" id="subword"></div>
  <div class="categories" id="categories">${categoryHtml}</div>
  <div class="phone" id="phone">
    <div class="screen">
      <img id="screenA" class="active" src="${images.home || ''}" alt="Home real VitrineLocal">
      <img id="screenB" src="${images.catalog || ''}" alt="Tela real de empresas">
    </div>
  </div>
  <div class="callout ca1" id="ca1">Avaliação<small>informação real</small></div>
  <div class="callout ca2" id="ca2">Localização<small>informação real</small></div>
  <div class="callout ca3" id="ca3">Produtos &amp; Serviços<small>catálogo real</small></div>
  <div class="callout ca4" id="ca4">Contato<small>WhatsApp / Instagram</small></div>
  <div class="section-word" id="sectionWord"></div>
  <div class="promo-shell" id="promoShell"><div class="eyebrow">PROMOÇÃO REAL</div><h2>${promoTitle}</h2><p>Uma oferta publicada pela empresa no VitrineLocal.</p><div class="send-btn">↗ Enviar notificação</div></div>
  <div class="push-card" id="pushCard"><div class="push-icon">♧</div><div class="push-text"><strong>Nova promoção</strong><b>${escapeHtml(real.selected?.name || 'Empresa local')}</b><span>${promoTitle}</span></div><div class="push-action">Ver oferta →</div></div>
  <div class="final" id="final"><img src="${logoData || ''}" alt="VitrineLocal"><h2>Para quem procura.<br>Para quem empreende.</h2><p>Sua cidade em uma única vitrine.</p><div class="url">vitrinelocal.net</div></div>
</div>
<script>
const START={
 logo:0, cats:3200, home:7000, catalog:12000, profile:16000, offer:22000, contact:26000, promo:30000, push:34000, final:37000
};
const images=${JSON.stringify({home:images.home||'',catalog:images.catalog||'',profileHero:images.profileHero||'',profileContact:images.profileContact||'',profileOffer:images.profileOffer||'',promo:images.promo||''})};
const els={logo:document.getElementById('logo'),word:document.getElementById('word'),subword:document.getElementById('subword'),cats:document.getElementById('categories'),phone:document.getElementById('phone'),screenA:document.getElementById('screenA'),screenB:document.getElementById('screenB'),sectionWord:document.getElementById('sectionWord'),promo:document.getElementById('promoShell'),push:document.getElementById('pushCard'),final:document.getElementById('final')};
const categoryEls=[...document.querySelectorAll('.category')];
const callouts=[...document.querySelectorAll('.callout')];
let currentScreen='home'; let activeLayer='A';
function showScreen(key){if(!images[key]||key===currentScreen)return; const hidden=activeLayer==='A'?els.screenB:els.screenA; const visible=activeLayer==='A'?els.screenA:els.screenB; hidden.src=images[key]; hidden.classList.add('active'); visible.classList.remove('active'); activeLayer=activeLayer==='A'?'B':'A'; currentScreen=key;}
function fade(el,show,x=0,y=0,scale=1){el.style.opacity=show?'1':'0';el.style.transform=show?'translate('+x+'px,'+y+'px) scale('+scale+')':'translate(0,30px) scale(.98)';}
function setText(text,sub=''){els.word.textContent=text;els.subword.textContent=sub;}
function scene(t){
  if(t<3200){
    fade(els.logo,true,0,0,.92+Math.min(t/3200,.08));
    fade(els.phone,false); fade(els.sectionWord,false); fade(els.promo,false); fade(els.push,false); fade(els.final,false); fade(els.cats,false);
    setText('', '');
  } else if(t<7000){
    fade(els.logo,true,0,-180,.62); fade(els.phone,false); fade(els.cats,true);
    categoryEls.forEach((el,i)=>{const local=Math.max(0,Math.min(1,(t-(3200+i*180))/900));el.style.opacity=String(local);el.style.transform='translateY('+((1-local)*35)+'px) scale('+(.94+local*.06)+')';});
    fade(els.word,true,0,108,.75); els.word.textContent='DESCUBRA.'; els.word.style.top='1350px'; els.word.style.fontSize='88px';
  } else if(t<12000){
    fade(els.logo,false); fade(els.cats,false); fade(els.phone,true,0,0,1); els.phone.classList.add('glow'); fade(els.word,true,0,130,.8); els.word.textContent='TUDO EM UM SÓ LUGAR.'; els.word.style.top='160px'; els.word.style.fontSize='72px'; showScreen('home');
  } else if(t<16000){
    fade(els.phone,true,0,0,1.01); fade(els.word,true,0,130,.82); els.word.textContent='ENCONTRE.'; els.word.style.top='160px'; els.word.style.fontSize='96px'; showScreen('catalog');
  } else if(t<22000){
    fade(els.word,true,0,130,.75); els.word.textContent='CONHEÇA ANTES DE ESCOLHER.'; els.word.style.top='150px'; els.word.style.fontSize='70px'; showScreen('profileHero');
    callouts.forEach((el,i)=>{const local=Math.max(0,Math.min(1,(t-(16000+i*300))/900));el.style.opacity=String(local);el.style.transform='translateY('+((1-local)*18)+'px)';});
  } else if(t<26000){
    callouts.forEach((el)=>el.style.opacity='0'); fade(els.word,true,0,130,.82); els.word.textContent='VEJA O QUE ELA OFERECE.'; els.word.style.top='160px'; els.word.style.fontSize='70px'; showScreen('profileOffer');
  } else if(t<30000){
    fade(els.word,true,0,135,.84); els.word.textContent='CONECTE-SE.'; els.word.style.top='165px'; els.word.style.fontSize='92px'; showScreen('profileContact');
  } else if(t<34000){
    fade(els.phone,false); fade(els.word,true,0,0,.72); els.word.style.top='185px'; els.word.style.fontSize='98px'; els.word.textContent='PUBLIQUE.'; fade(els.promo,true,0,70,.98);
  } else if(t<37000){
    fade(els.word,true,0,-410,.62); els.word.textContent='AVISE.'; els.word.style.top='210px'; els.word.style.fontSize='110px'; fade(els.promo,false); fade(els.push,true); 
  } else {
    fade(els.word,false); fade(els.promo,false); fade(els.push,false); fade(els.logo,false); fade(els.final,true,0,0,1);
  }
}
let last=-1; function tick(now){const t=Math.min(DURATION,now-START_TIME); scene(t); last=t; if(t<DURATION+200) requestAnimationFrame(tick);}
const DURATION=${DURATION_MS};
const START_TIME=performance.now();
requestAnimationFrame(tick);
</script></body></html>`;

  await fs.writeFile(COMPOSITION_HTML, html, 'utf8');
}

async function renderComposition() {
  const browser = await chromium.launch({ headless: HEADLESS, args: ['--disable-gpu', '--force-color-profile=srgb'] });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: WIDTH, height: HEIGHT } },
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(COMPOSITION_HTML).toString(), { waitUntil: 'load' });
  await page.waitForTimeout(DURATION_MS + 250);
  const videoPath = await page.video().path();
  await page.close();
  await context.close();
  await browser.close();
  await fs.copyFile(videoPath, RAW_WEBM);
  return RAW_WEBM;
}

async function transcode(raw) {
  console.log('[ffmpeg] enforcing 1080x1920 @ 30fps');
  await execFileAsync('ffmpeg', [
    '-y', '-i', raw,
    '-vf', `fps=${FPS},scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x07182a`,
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    FINAL_MP4,
  ], { maxBuffer: 20 * 1024 * 1024 });
  await execFileAsync('ffmpeg', [
    '-y', '-i', raw,
    '-vf', `fps=${FPS},scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x07182a`,
    '-an', '-c:v', 'libvpx-vp9', '-b:v', '8M', '-deadline', 'good',
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
    await captureMerchantPushIfAuthenticated(captureContext, selected);
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
