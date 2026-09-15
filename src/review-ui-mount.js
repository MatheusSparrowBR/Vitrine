import './review-interactions.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { db } from './review-service.js';
import BusinessReviews from './BusinessReviews.jsx';
import ReviewsPerformanceCard from './ReviewsPerformanceCard.jsx';

async function businessId() {
  const p = location.pathname.split('/').filter(Boolean);
  if (p.length !== 3 || p[1] !== 'empresa' || !db) return null;
  const { data: c } = await db
    .from('cities')
    .select('id')
    .eq('slug', p[0])
    .eq('active', true)
    .maybeSingle();
  if (!c) return null;
  const { data: b } = await db
    .from('public_business_directory')
    .select('id')
    .eq('city_id', c.id)
    .eq('slug', decodeURIComponent(p[2]))
    .maybeSingle();
  return b?.id || null;
}

async function isPremiumBusiness(id) {
  if (!db || !id) return false;
  const { data: planId, error: planError } = await db.rpc('get_effective_plan_id', { p_business_id: id });
  if (planError || !planId) return false;
  const { data: plan, error } = await db.from('plans').select('code,features').eq('id', planId).maybeSingle();
  if (error || !plan) return false;
  return plan.code === 'premium' && plan.features?.review_management === true;
}

function mountProfile() {
  const layout = document.querySelector('.mbp-layout');
  if (!layout || layout.querySelector('[data-vl-reviews]')) return;
  businessId().then(id => {
    if (!id || !layout.isConnected || layout.querySelector('[data-vl-reviews]')) return;
    const el = document.createElement('div');
    el.dataset.vlReviews = '1';
    el.className = 'vl-profile-reviews-host';
    layout.appendChild(el);
    createRoot(el).render(React.createElement(BusinessReviews, { businessId: id }));
  });
}

function renderAnalytics(host, id, premium) {
  if (premium) {
    createRoot(host).render(React.createElement(ReviewsPerformanceCard, { businessId: id, premium: true }));
    return;
  }
  createRoot(host).render(React.createElement('section', { className: 'vp-card vp-premium-lock', 'aria-label': 'Reputação Premium' },
    React.createElement('div', { className: 'vp-lock-icon' }, '★'),
    React.createElement('span', { className: 'vp-eyebrow' }, 'EXCLUSIVO PREMIUM'),
    React.createElement('h2', null, 'Reputação e respostas às avaliações'),
    React.createElement('p', null, 'Acompanhe sua nota, distribuição das avaliações e responda seus clientes diretamente pelo Analytics no plano Premium.'),
    React.createElement('a', { href: `/planos?business_id=${encodeURIComponent(id)}`, className: 'vp-lock-button' }, 'Conhecer o Premium →')
  ));
}

function mountAnalytics() {
  const host = document.querySelector('.ca-kpis');
  if (!host || document.querySelector('[data-vl-review-performance]')) return;
  const id = new URLSearchParams(location.search).get('business_id');
  if (!id) return;
  const el = document.createElement('div');
  el.dataset.vlReviewPerformance = '1';
  el.style.gridColumn = '1/-1';
  host.insertAdjacentElement('afterend', el);
  isPremiumBusiness(id).then(premium => renderAnalytics(el, id, premium));
}

function run() {
  mountProfile();
  mountAnalytics();
}

new MutationObserver(run).observe(document.body, { subtree: true, childList: true });
run();
