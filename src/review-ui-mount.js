import './review-interactions.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import BusinessReviews from './BusinessReviews.jsx';
import ReviewsPerformanceCard from './ReviewsPerformanceCard.jsx';

const U = import.meta.env.VITE_SUPABASE_URL;
const K = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const db = U && K ? createClient(U, K) : null;

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

async function mountProfile() {
  const host = document.querySelector('.mbp-main-card');
  if (!host || host.querySelector('[data-vl-reviews]')) return;

  const id = await businessId();
  if (!id) return;

  const el = document.createElement('div');
  el.dataset.vlReviews = '1';
  host.appendChild(el);
  createRoot(el).render(React.createElement(BusinessReviews, { businessId: id }));
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
  createRoot(el).render(React.createElement(ReviewsPerformanceCard, { businessId: id }));
}

function run() {
  mountProfile();
  mountAnalytics();
}

new MutationObserver(run).observe(document.body, { subtree: true, childList: true });
run();
