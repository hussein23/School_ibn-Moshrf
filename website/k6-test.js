/**
 * ===============================================
 *  اختبار أداء — موقع المهارات الرقمية
 *  الأداة: k6  |  https://k6.io
 *
 *  طريقة التشغيل:
 *    k6 run k6-test.js
 *
 *  أو مع تقرير HTML:
 *    k6 run --out csv=results.csv k6-test.js
 * ===============================================
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ── المقاييس المخصصة ──────────────────────────
const errorRate      = new Rate('errors');
const pageLoadTime   = new Trend('page_load_time', true);
const totalRequests  = new Counter('total_requests');

// ── إعدادات السيناريو ─────────────────────────
export const options = {
  scenarios: {
    warmup: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },  // إحماء تدريجي
        { duration: '10s', target: 10 },  // ثبات
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'warmup' },
    },
    normal_load: {
      executor: 'ramping-vus',
      startTime: '25s',
      startVUs: 10,
      stages: [
        { duration: '15s', target: 30 },  // تحميل طبيعي
        { duration: '20s', target: 30 },  // ثبات
        { duration: '10s', target: 0  },  // هبوط
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'normal_load' },
    },
    peak_load: {
      executor: 'ramping-vus',
      startTime: '75s',
      startVUs: 30,
      stages: [
        { duration: '10s', target: 60 },  // ذروة
        { duration: '20s', target: 60 },  // ثبات عند الذروة
        { duration: '10s', target: 0  },  // هبوط سريع
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'peak_load' },
    },
    stress_test: {
      executor: 'ramping-vus',
      startTime: '120s',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // ضغط شديد
        { duration: '15s', target: 100 }, // ثبات
        { duration: '5s',  target: 0   }, // هبوط
      ],
      gracefulRampDown: '5s',
      tags: { scenario: 'stress_test' },
    },
  },

  // حدود قبول الأداء (thresholds)
  thresholds: {
    // 95% من الطلبات يجب أن تكتمل في أقل من 500ms
    'http_req_duration{scenario:normal_load}': ['p(95)<500'],
    'http_req_duration{scenario:peak_load}'  : ['p(95)<800'],
    'http_req_duration{scenario:stress_test}': ['p(95)<1500'],

    // نسبة فشل أقل من 1% في التحميل الطبيعي
    'errors{scenario:normal_load}': ['rate<0.01'],
    'errors{scenario:peak_load}'  : ['rate<0.05'],

    // إجمالي معدل الخطأ
    errors: ['rate<0.1'],

    // وقت الاستجابة الكلي
    http_req_duration: ['p(99)<2000', 'avg<400'],
  },
};

// ── الصفحات المختبَرة ─────────────────────────
const BASE_URL = 'https://hussein23.github.io/School_ibn-Moshrf/website';

const PAGES = {
  home      : `${BASE_URL}/`,
  dashboard : `${BASE_URL}/dashboard.html`,
  css       : `${BASE_URL}/css/dashboard.css`,
  dataJs    : `${BASE_URL}/js/data.js`,
  appJs     : `${BASE_URL}/js/app.js`,
  studentAuth:`${BASE_URL}/js/student-auth.js`,
};

// ── الدالة الرئيسية لكل مستخدم افتراضي ─────────
export default function () {

  // ── مجموعة 1: الصفحة الرئيسية ─────────────
  group('الصفحة الرئيسية', function () {
    const startTime = Date.now();
    const res = http.get(PAGES.home, {
      tags: { page: 'home' },
      headers: { 'Accept-Encoding': 'gzip, deflate, br' },
    });

    const duration = Date.now() - startTime;
    pageLoadTime.add(duration);
    totalRequests.add(1);

    const ok = check(res, {
      '✅ status 200'         : (r) => r.status === 200,
      '✅ حجم الصفحة > 1KB'  : (r) => r.body && r.body.length > 1000,
      '✅ وقت < 1000ms'       : (r) => r.timings.duration < 1000,
      '✅ يحتوي على HTML'     : (r) => r.body && r.body.includes('<!DOCTYPE html'),
    });

    errorRate.add(!ok);
  });

  sleep(0.5);

  // ── مجموعة 2: ملفات الأصول ─────────────────
  group('ملفات CSS & JS', function () {
    const responses = http.batch([
      ['GET', PAGES.css,        null, { tags: { page: 'css' } }],
      ['GET', PAGES.dataJs,     null, { tags: { page: 'data-js' } }],
      ['GET', PAGES.appJs,      null, { tags: { page: 'app-js' } }],
    ]);

    responses.forEach((res, i) => {
      totalRequests.add(1);
      const names = ['CSS', 'data.js', 'app.js'];
      const ok = check(res, {
        [`✅ ${names[i]} status 200`]    : (r) => r.status === 200,
        [`✅ ${names[i]} وقت < 800ms`]  : (r) => r.timings.duration < 800,
      });
      errorRate.add(!ok);
    });
  });

  sleep(0.3);

  // ── مجموعة 3: لوحة التحكم ──────────────────
  group('لوحة التحكم', function () {
    const res = http.get(PAGES.dashboard, {
      tags: { page: 'dashboard' },
    });

    totalRequests.add(1);
    const ok = check(res, {
      '✅ dashboard status 200'     : (r) => r.status === 200,
      '✅ dashboard يحتوي PIN modal': (r) => r.body && r.body.includes('pin-overlay'),
      '✅ dashboard وقت < 800ms'   : (r) => r.timings.duration < 800,
    });
    errorRate.add(!ok);
  });

  sleep(0.2);
}

// ── تقرير الملخص ─────────────────────────────
export function handleSummary(data) {
  return {
    'k6-report.html': htmlReport(data),
    'k6-summary.txt': textSummary(data, { indent: '  ', enableColors: true }),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}
