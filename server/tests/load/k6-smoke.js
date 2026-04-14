import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '60s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

export default function () {
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const topics = http.get(`${BASE_URL}/api/topics?sort=latest&limit=12`);
  check(topics, { 'topics 200': (r) => r.status === 200 });

  const trending = http.get(`${BASE_URL}/api/topics/trending`);
  check(trending, { 'trending 200': (r) => r.status === 200 });

  const popularSlides = http.get(`${BASE_URL}/api/slides/popular`);
  check(popularSlides, { 'popular slides 200': (r) => r.status === 200 });

  const slideoFeed = http.get(`${BASE_URL}/api/slideo/feed?page=1&limit=8&sort=popular`);
  check(slideoFeed, { 'slideo feed 200': (r) => r.status === 200 });

  sleep(1);
}
