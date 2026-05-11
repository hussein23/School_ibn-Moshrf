// ===================================================
//  مستورد دروس PDF — الذكاء الاصطناعي Claude
//  يتطلب: PDF.js (محمَّل تلقائياً) + مفتاح Claude API
// ===================================================
(function () {
  'use strict';

  const PDFJS_SRC    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const CLAUDE_URL   = 'https://api.anthropic.com/v1/messages';
  const API_KEY_SESS = 'ibn_claude_api_key';
  const STORAGE_KEY  = 'ibn_moshrf_curriculum';
  const MAX_IMG_DIM  = 650;
  const IMG_QUALITY  = 0.72;
  const MAX_IMAGES   = 5;

  // ── State ──
  let _file        = null;
  let _images      = [];   // [{page, data, selected}]
  let _lesson      = null;
  let _target      = null; // {grade, semIdx, unitIdx, mode, replIdx}

  // ───────────────────────────────────────────────
  //  تحميل PDF.js ديناميكياً (فقط عند الحاجة)
  //  نستخدم Blob URL للـ Worker لتجاوز قيود CORS
  //  على GitHub Pages والمواقع المستضافة على HTTPS
  // ───────────────────────────────────────────────
  function _loadPdfJs() {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) { resolve(); return; }
      const s = document.createElement('script');
      s.src = PDFJS_SRC;
      s.onload = () => {
        // Blob URL trick: يتجاوز قيود CORS بإنشاء worker محلي
        // يقوم باستيراد الـ worker من CDN
        try {
          const blob = new Blob(
            [`importScripts('${PDFJS_WORKER}');`],
            { type: 'application/javascript' }
          );
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        } catch (e) {
          // fallback: استخدام CDN مباشرةً إذا فشل Blob
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        }
        resolve();
      };
      s.onerror = () => reject(new Error('تعذّر تحميل مكتبة PDF.js — تحقق من اتصال الإنترنت'));
      document.head.appendChild(s);
    });
  }

  // ───────────────────────────────────────────────
  //  قراءة ملف Markdown مباشرةً (نص خالص)
  // ───────────────────────────────────────────────
  async function _parseMd(file, onStatus) {
    onStatus?.('📝 قراءة ملف Markdown...');
    const text = await file.text();
    return { text, images: [] };
  }

  // ───────────────────────────────────────────────
  //  استخراج النصوص والصور من PDF
  // ───────────────────────────────────────────────
  async function _parsePdf(file, onStatus) {
    await _loadPdfJs();
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    const n   = pdf.numPages;

    let fullText = '';
    const images = [];

    for (let i = 1; i <= n; i++) {
      onStatus?.(`📄 معالجة الصفحة ${i} من ${n}...`);
      const page = await pdf.getPage(i);

      // ── استخراج النصوص ──
      const tc = await page.getTextContent();
      fullText += tc.items.map(it => it.str).join(' ') + '\n\n';

      // ── فحص وجود صور في الصفحة ──
      const hasImg = await _pageHasImages(page);
      if (hasImg && images.length < MAX_IMAGES) {
        const vp     = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width  = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        const compressed = _compressCanvas(canvas);
        if (compressed) images.push({ page: i, data: compressed, selected: images.length === 0 });
      }
    }

    return { text: fullText.trim(), images };
  }

  // فحص إذا كانت الصفحة تحتوي على عناصر رسومية
  async function _pageHasImages(page) {
    try {
      const ops = await page.getOperatorList();
      // OPS.paintImageXObject = 85
      return ops.fnArray.some(fn => fn === 85);
    } catch { return false; }
  }

  // ضغط canvas إلى JPEG مصغَّر
  function _compressCanvas(src) {
    let w = src.width, h = src.height;
    if (w < 50 || h < 50) return null;
    if (w > MAX_IMG_DIM || h > MAX_IMG_DIM) {
      const r = Math.min(MAX_IMG_DIM / w, MAX_IMG_DIM / h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(src, 0, 0, w, h);
    return c.toDataURL('image/jpeg', IMG_QUALITY);
  }

  // ───────────────────────────────────────────────
  //  استدعاء Claude API (Haiku — سريع وموفّر)
  // ───────────────────────────────────────────────
  async function _callClaude(apiKey, text, images, grade) {
    const gradeMap = { grade4: 'الرابع', grade5: 'الخامس', grade6: 'السادس' };
    const gName    = gradeMap[grade] || grade;
    const hasImgs  = images.length > 0;

    const content = [];

    // إرسال الصور (vision) — أقصاها 4
    images.slice(0, 4).forEach(img => {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: img.data.replace(/^data:image\/jpeg;base64,/, '')
        }
      });
    });

    content.push({
      type: 'text',
      text: `أنت خبير تربوي في مناهج المهارات الرقمية للصف ${gName} الابتدائي في المملكة العربية السعودية.

من النص التالي المستخرج من ملف PDF، أنشئ محتوى الدرس وأعده بصيغة JSON فقط — لا تكتب أي كلام خارج JSON.

التنسيق المطلوب بالضبط:
{
  "name": "اسم الدرس",
  "objectives": [
    "هدف يبدأ بفعل مضارع",
    "..."
  ],
  "summary": "ملخص الدرس في 3-4 جمل عربية بسيطة",
  "keyPoints": [
    "المصطلح (English Term): شرح مختصر مناسب لطالب الصف ${gName}",
    "..."
  ],
  "questions": [
    {"type":"mcq","question":"سؤال؟","options":["الخيار أ","الخيار ب","الخيار ج","الخيار د"],"answer":0},
    {"type":"tf","question":"عبارة للتقييم","answer":true},
    {"type":"match","question":"صل كل مصطلح بمعناه","pairs":[["مصطلح1","تعريف1"],["مصطلح2","تعريف2"],["مصطلح3","تعريف3"]]}
  ]
}

القواعد:
• 4 إلى 6 أهداف تعليمية قابلة للقياس
• 8 إلى 12 نقطة رئيسية تشمل المصطلحات التقنية مع ترجمتها
• 10 أسئلة: 5 اختيار متعدد + 3 صح/خطأ + 2 مطابقة
${hasImgs ? '• لديك صور من الدرس — أنشئ سؤالاً يشير للصورة واكتب "(انظر الصورة)" في نصه' : ''}
• مستوى مناسب تماماً لطلاب الصف ${gName} الابتدائي
• اكتب بالعربية الفصحى البسيطة
• أجب بـ JSON فقط بدون أي تعليق أو نص إضافي

النص المستخرج من الدرس:
${text.slice(0, 7500)}`
    });

    // ── مهلة 90 ثانية لتجنب التجمد ──
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 90_000);

    let res;
    try {
      res = await fetch(CLAUDE_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 4096,
          messages: [{ role: 'user', content }]
        })
      });
    } catch (netErr) {
      clearTimeout(timeout);
      if (netErr.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال (90 ثانية) — تحقق من اتصالك بالإنترنت وأعد المحاولة');
      }
      // Failed to fetch — CORS أو شبكة محجوبة
      throw new Error(
        'تعذّر الاتصال بخادم Claude.\n\n' +
        'الأسباب الشائعة:\n' +
        '• تحقق من اتصال الإنترنت\n' +
        '• قد تكون الشبكة تمنع الاتصال بـ api.anthropic.com\n' +
        '• جرّب إيقاف إضافات المتصفح مؤقتاً\n' +
        '• جرّب من شبكة مختلفة (بيانات الجوال مثلاً)\n' +
        `(تفاصيل: ${netErr.message})`
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || '';
      if (res.status === 401) throw new Error('مفتاح API غير صحيح أو منتهي الصلاحية — تحقق من مفتاحك في console.anthropic.com');
      if (res.status === 403) throw new Error('هذا المفتاح لا يملك صلاحية استخدام API — تحقق من إعدادات حسابك');
      if (res.status === 429) throw new Error('تجاوزت حد الطلبات — انتظر دقيقة وأعد المحاولة');
      if (res.status === 400) throw new Error('خطأ في الطلب: ' + (msg || 'تحقق من صحة مفتاح API'));
      if (res.status >= 500) throw new Error('خادم Claude لا يستجيب حالياً — أعد المحاولة بعد قليل');
      throw new Error(msg || `خطأ ${res.status} من خادم Claude`);
    }

    const data  = await res.json();
    const raw   = data.content?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('لم يتمكن الذكاء الاصطناعي من إنشاء محتوى منظم — أعد المحاولة');

    try {
      return JSON.parse(match[0]);
    } catch {
      throw new Error('خطأ في قراءة استجابة الذكاء الاصطناعي — أعد المحاولة');
    }
  }

  // ───────────────────────────────────────────────
  //  الخطوة 1 — واجهة رفع الملف
  // ───────────────────────────────────────────────
  function _showStep1() {
    _removeModal();
    if (!CURRICULUM) { alert('لم تُحمَّل بيانات المنهج بعد، أعد تحميل الصفحة'); return; }

    const grades = Object.entries(CURRICULUM);
    const savedKey = sessionStorage.getItem(API_KEY_SESS) || '';

    const modal = document.createElement('div');
    modal.id        = 'pim-modal';
    modal.className = 'pim-overlay';
    modal.innerHTML = `
      <div class="pim-box">
        <div class="pim-header">
          <div class="pim-title">📤 رفع درس من PDF</div>
          <button class="pim-close" onclick="window.PdfImporter.close()">✕</button>
        </div>
        <div class="pim-body pim-scroll">

          <!-- مفتاح Claude API -->
          <div class="pim-section">
            <label class="pim-label">
              🔑 مفتاح Claude API
              <span class="pim-badge-safe">محفوظ في الجلسة فقط — لا يُخزَّن في قاعدة البيانات</span>
            </label>
            <div class="pim-api-wrap">
              <input id="pim-apikey" type="password" class="pim-input"
                placeholder="sk-ant-api03-..." autocomplete="off"
                value="${_esc(savedKey)}">
              <button class="pim-eye-btn" title="إظهار/إخفاء المفتاح"
                onclick="window.PdfImporter._toggleEye()">👁</button>
            </div>
            <p class="pim-note">⚠️ المفتاح يُرسَل مباشرةً لـ Anthropic فقط ولا يمر بخوادمنا</p>
          </div>

          <!-- رفع الملف -->
          <div class="pim-section">
            <label class="pim-label">📂 ملف الدرس</label>
            <div class="pim-dropzone" id="pim-dz"
              ondragover="event.preventDefault();this.classList.add('pim-dz-over')"
              ondragleave="this.classList.remove('pim-dz-over')"
              ondrop="window.PdfImporter._onDrop(event)"
              onclick="document.getElementById('pim-file').click()">
              <input type="file" id="pim-file" accept=".pdf,.md" style="display:none"
                onchange="window.PdfImporter._onFileChange(this)">
              <div class="pim-dz-icon">📄</div>
              <div id="pim-dz-text" class="pim-dz-text">اسحب الملف هنا أو اضغط للاختيار</div>
              <div class="pim-dz-hint">يدعم ملفات PDF و Markdown ‎(.md)</div>
            </div>
          </div>

          <!-- موقع الدرس في المنهج -->
          <div class="pim-section">
            <label class="pim-label">📚 موقع الدرس في المنهج</label>
            <div class="pim-selects-row">
              <select id="pim-grade" class="pim-select"
                onchange="window.PdfImporter._onGradeChange()">
                <option value="">— الصف —</option>
                ${grades.map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
              </select>
              <select id="pim-sem" class="pim-select" disabled
                onchange="window.PdfImporter._onSemChange()">
                <option value="">— الفصل —</option>
              </select>
              <select id="pim-unit" class="pim-select" disabled
                onchange="window.PdfImporter._updateReplaceList()">
                <option value="">— الوحدة —</option>
              </select>
            </div>
          </div>

          <!-- وضع الإضافة -->
          <div class="pim-section">
            <label class="pim-label">إضافة الدرس كـ:</label>
            <div class="pim-radios">
              <label class="pim-radio-lbl">
                <input type="radio" name="pim-mode" value="new" checked
                  onchange="window.PdfImporter._onModeChange(this)">
                <span class="pim-radio-txt">درس جديد في نهاية الوحدة</span>
              </label>
              <label class="pim-radio-lbl">
                <input type="radio" name="pim-mode" value="replace"
                  onchange="window.PdfImporter._onModeChange(this)">
                <span class="pim-radio-txt">استبدال درس موجود</span>
              </label>
            </div>
            <select id="pim-replace" class="pim-select pim-replace-sel" style="display:none" disabled>
              <option value="">— اختر الدرس للاستبدال —</option>
            </select>
          </div>

          <div id="pim-error" class="pim-error" style="display:none"></div>

          <div class="pim-footer">
            <button class="pim-btn pim-btn-ghost" onclick="window.PdfImporter.close()">إلغاء</button>
            <button class="pim-btn pim-btn-primary" onclick="window.PdfImporter._process()">
              🚀 استخراج وتوليد بالذكاء الاصطناعي
            </button>
          </div>
        </div>
      </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) _removeModal(); });
    document.body.appendChild(modal);
  }

  // ───────────────────────────────────────────────
  //  الخطوة 2 — شاشة المعالجة
  // ───────────────────────────────────────────────
  function _showProcessing(msg) {
    const el = document.getElementById('pim-proc-msg');
    if (el) { el.textContent = msg; return; }

    _removeModal();
    const modal = document.createElement('div');
    modal.id        = 'pim-modal';
    modal.className = 'pim-overlay';
    modal.innerHTML = `
      <div class="pim-box pim-box-sm">
        <div class="pim-header">
          <div class="pim-title">⚙️ جارٍ المعالجة...</div>
        </div>
        <div class="pim-body" style="text-align:center;padding:40px 28px">
          <div class="pim-spinner"></div>
          <p id="pim-proc-msg" class="pim-proc-msg">${_esc(msg)}</p>
          <p class="pim-note" style="margin-top:8px">قد تستغرق هذه العملية 15-30 ثانية</p>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  // ───────────────────────────────────────────────
  //  الخطوة 3 — واجهة المراجعة والتعديل
  // ───────────────────────────────────────────────
  function _showReview(lesson, images) {
    _removeModal();
    _lesson = lesson;
    _images = images;

    const modal = document.createElement('div');
    modal.id        = 'pim-modal';
    modal.className = 'pim-overlay';
    modal.innerHTML = `
      <div class="pim-box pim-box-wide">
        <div class="pim-header">
          <div class="pim-title">✏️ مراجعة الدرس المُولَّد — عدّل ما تشاء ثم احفظ</div>
          <button class="pim-close" onclick="window.PdfImporter.close()">✕</button>
        </div>
        <div class="pim-body pim-scroll">

          <!-- اسم الدرس -->
          <div class="pim-section">
            <label class="pim-label">📖 اسم الدرس</label>
            <input id="rev-name" class="pim-input pim-input-lg"
              value="${_esc(lesson.name || '')}">
          </div>

          <!-- الأهداف -->
          <div class="pim-section">
            <label class="pim-label">🎯 الأهداف التعليمية</label>
            <div id="rev-objectives" class="pim-list">
              ${(lesson.objectives || []).map((o, i) => _objRow(o, i)).join('')}
            </div>
            <button class="pim-add-btn" onclick="window.PdfImporter._addObj()">+ إضافة هدف</button>
          </div>

          <!-- الملخص -->
          <div class="pim-section">
            <label class="pim-label">📝 ملخص الدرس</label>
            <textarea id="rev-summary" class="pim-textarea" rows="4">${_esc(lesson.summary || '')}</textarea>
          </div>

          <!-- النقاط الرئيسية -->
          <div class="pim-section">
            <label class="pim-label">💡 النقاط الرئيسية</label>
            <div id="rev-keypoints" class="pim-list">
              ${(lesson.keyPoints || []).map((k, i) => _kpRow(k, i)).join('')}
            </div>
            <button class="pim-add-btn" onclick="window.PdfImporter._addKP()">+ إضافة نقطة</button>
          </div>

          <!-- الصور المستخرجة -->
          ${images.length > 0 ? `
          <div class="pim-section">
            <label class="pim-label">
              🖼️ الصور المستخرجة
              <span class="pim-hint">انقر على الصورة لتحديدها أو إلغاء تحديدها</span>
            </label>
            <div class="pim-img-grid" id="rev-images">
              ${images.map((img, i) => `
                <div class="pim-img-card ${img.selected ? 'pim-img-sel' : ''}"
                  id="pim-ic-${i}" onclick="window.PdfImporter._toggleImg(${i})">
                  <img src="${img.data}" class="pim-img-thumb" loading="lazy" alt="صفحة ${img.page}">
                  <div class="pim-img-foot">
                    <span>صفحة ${img.page}</span>
                    <span id="pim-icheck-${i}">${img.selected ? '✅' : '○'}</span>
                  </div>
                </div>`).join('')}
            </div>
          </div>` : ''}

          <!-- الأسئلة -->
          <div class="pim-section">
            <label class="pim-label">❓ الأسئلة
              <span class="pim-hint">${(lesson.questions || []).length} سؤال مُولَّد</span>
            </label>
            <div id="rev-questions">
              ${(lesson.questions || []).map((q, i) => _qBlock(q, i)).join('')}
            </div>
            <div class="pim-add-q-row">
              <button class="pim-add-btn" onclick="window.PdfImporter._addQ('mcq')">+ اختيار متعدد</button>
              <button class="pim-add-btn" onclick="window.PdfImporter._addQ('tf')">+ صح / خطأ</button>
              <button class="pim-add-btn" onclick="window.PdfImporter._addQ('match')">+ مطابقة</button>
            </div>
          </div>

          <div id="pim-error" class="pim-error" style="display:none"></div>

          <div class="pim-footer">
            <button class="pim-btn pim-btn-ghost" onclick="window.PdfImporter.close()">إلغاء</button>
            <button class="pim-btn pim-btn-warn" onclick="window.PdfImporter._showStep1()">↩ إعادة الرفع</button>
            <button class="pim-btn pim-btn-primary" onclick="window.PdfImporter._save()">
              ✅ حفظ الدرس في المنهج
            </button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
  }

  // ── مساعدات بناء الواجهة ──

  function _objRow(val, i) {
    const uid = `obj-${i}-${Date.now()}`;
    return `
      <div class="pim-list-row" id="${uid}">
        <span class="pim-list-drag">⠿</span>
        <input class="pim-input pim-list-inp" data-role="obj" value="${_esc(val)}">
        <button class="pim-del-btn" onclick="document.getElementById('${uid}').remove()">🗑</button>
      </div>`;
  }

  function _kpRow(val, i) {
    const uid = `kp-${i}-${Date.now()}`;
    return `
      <div class="pim-list-row" id="${uid}">
        <span class="pim-list-drag">⠿</span>
        <input class="pim-input pim-list-inp" data-role="kp" value="${_esc(val)}">
        <button class="pim-del-btn" onclick="document.getElementById('${uid}').remove()">🗑</button>
      </div>`;
  }

  function _imgSelect() {
    if (!_images.length) return '';
    const opts = _images.map((img, ii) =>
      `<option value="${ii}">🖼 صفحة ${img.page}</option>`).join('');
    return `
      <div class="pim-q-img-row">
        <label class="pim-hint">صورة مرفقة:</label>
        <select class="pim-select pim-q-img-sel">
          <option value="">بدون صورة</option>
          ${opts}
        </select>
      </div>`;
  }

  function _qBlock(q, i) {
    const uid  = `qb-${i}-${Date.now()}`;
    const badge = { mcq: '🔵 اختيار متعدد', tf: '🟢 صح / خطأ', match: '🟡 مطابقة' }[q.type] || q.type;

    let inner = '';

    if (q.type === 'mcq') {
      const opts = (q.options || ['', '', '', '']).map((opt, oi) => `
        <div class="pim-opt-row">
          <input type="radio" name="ans-${uid}" value="${oi}" ${q.answer === oi ? 'checked' : ''}>
          <input class="pim-input pim-opt-inp" placeholder="الخيار ${oi + 1}" value="${_esc(opt)}">
        </div>`).join('');
      inner = `
        <input class="pim-input pim-q-txt" placeholder="نص السؤال..." value="${_esc(q.question || '')}">
        ${_imgSelect()}
        <div class="pim-opts">${opts}</div>
        <p class="pim-hint" style="margin-top:4px">● حدّد الإجابة الصحيحة بزر الراديو</p>`;

    } else if (q.type === 'tf') {
      inner = `
        <input class="pim-input pim-q-txt" placeholder="نص العبارة..." value="${_esc(q.question || '')}">
        ${_imgSelect()}
        <div class="pim-tf-row">
          <label class="pim-radio-lbl">
            <input type="radio" name="tf-${uid}" value="true" ${q.answer !== false ? 'checked' : ''}>
            <span>✅ صح</span>
          </label>
          <label class="pim-radio-lbl">
            <input type="radio" name="tf-${uid}" value="false" ${q.answer === false ? 'checked' : ''}>
            <span>❌ خطأ</span>
          </label>
        </div>`;

    } else if (q.type === 'match') {
      const pairId = `pairs-${uid}`;
      const pairsHtml = (q.pairs || [['', '']]).map(pair => _pairRow(pair[0], pair[1])).join('');
      inner = `
        <input class="pim-input pim-q-txt" placeholder="تعليمات السؤال..." value="${_esc(q.question || '')}">
        ${_imgSelect()}
        <div class="pim-pairs" id="${pairId}">${pairsHtml}</div>
        <button class="pim-add-btn" style="margin-top:6px"
          onclick="window.PdfImporter._addPair('${pairId}')">+ إضافة زوج</button>`;
    }

    return `
      <div class="pim-q-block" id="${uid}">
        <div class="pim-q-head">
          <span class="pim-q-badge">${badge}</span>
          <button class="pim-del-btn pim-del-q"
            onclick="document.getElementById('${uid}').remove()">🗑 حذف السؤال</button>
        </div>
        <input type="hidden" class="pim-q-type-hidden" value="${q.type}">
        ${inner}
      </div>`;
  }

  function _pairRow(a, b) {
    const uid = `pr-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    return `
      <div class="pim-pair-row" id="${uid}">
        <input class="pim-input pim-pair-a" placeholder="المصطلح" value="${_esc(a)}">
        <span class="pim-pair-arrow">↔</span>
        <input class="pim-input pim-pair-b" placeholder="التعريف" value="${_esc(b)}">
        <button class="pim-del-btn" onclick="document.getElementById('${uid}').remove()">🗑</button>
      </div>`;
  }

  // ───────────────────────────────────────────────
  //  معالجات الأحداث
  // ───────────────────────────────────────────────
  function _onFileChange(inp) {
    const f = inp.files?.[0];
    if (!f) return;

    const isPdf = f.type === 'application/pdf' || f.name.endsWith('.pdf');
    const isMd  = f.type === 'text/markdown' || f.type === 'text/plain' || f.name.endsWith('.md');

    if (!isPdf && !isMd) {
      _setError('نوع الملف غير مدعوم — اختر ملف PDF أو Markdown (md.)'); return;
    }
    if (f.size > 20 * 1024 * 1024) {
      _setError('حجم الملف كبير جداً (الحد الأقصى 20 ميجابايت)'); return;
    }
    _file = f;
    const icon = isMd ? '📝' : '📄';
    const txt = document.getElementById('pim-dz-text');
    if (txt) txt.textContent = `✅ ${icon} ${f.name} (${(f.size / 1024).toFixed(0)} KB)`;
    document.getElementById('pim-dz')?.classList.add('pim-dz-ready');
    _clearError();
  }

  function _onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('pim-dz-over');
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      const inp = document.getElementById('pim-file');
      try {
        const dt = new DataTransfer();
        dt.items.add(f);
        inp.files = dt.files;
      } catch { /* Safari fallback */ }
      _onFileChange({ files: [f] });
    }
  }

  function _toggleEye() {
    const inp = document.getElementById('pim-apikey');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  }

  function _onGradeChange() {
    const grade  = document.getElementById('pim-grade')?.value;
    const semSel = document.getElementById('pim-sem');
    if (!semSel) return;
    semSel.innerHTML = '<option value="">— الفصل —</option>';
    semSel.disabled  = !grade;

    if (grade && CURRICULUM[grade]) {
      CURRICULUM[grade].semesters.forEach((s, i) => {
        semSel.innerHTML += `<option value="${i}">${s.name}</option>`;
      });
    }

    const unitSel = document.getElementById('pim-unit');
    if (unitSel) { unitSel.innerHTML = '<option value="">— الوحدة —</option>'; unitSel.disabled = true; }
    _updateReplaceList();
  }

  function _onSemChange() {
    const grade  = document.getElementById('pim-grade')?.value;
    const semIdx = document.getElementById('pim-sem')?.value;
    const unitSel = document.getElementById('pim-unit');
    if (!unitSel) return;

    unitSel.innerHTML = '<option value="">— الوحدة —</option>';
    unitSel.disabled  = true;

    if (grade && semIdx !== '' && CURRICULUM[grade]) {
      const sem = CURRICULUM[grade].semesters[+semIdx];
      if (sem) {
        sem.units.forEach((u, i) => {
          unitSel.innerHTML += `<option value="${i}">${u.name}</option>`;
        });
        unitSel.disabled = false;
      }
    }
    _updateReplaceList();
  }

  function _updateReplaceList() {
    const sel     = document.getElementById('pim-replace');
    if (!sel) return;
    sel.innerHTML = '<option value="">— اختر الدرس للاستبدال —</option>';

    const grade   = document.getElementById('pim-grade')?.value;
    const semIdx  = document.getElementById('pim-sem')?.value;
    const unitIdx = document.getElementById('pim-unit')?.value;

    if (grade && semIdx !== '' && unitIdx !== '' && CURRICULUM[grade]) {
      const unit = CURRICULUM[grade].semesters[+semIdx]?.units[+unitIdx];
      if (unit) {
        unit.lessons.forEach((l, i) => {
          sel.innerHTML += `<option value="${i}">${l.name}</option>`;
        });
      }
    }
  }

  function _onModeChange(radio) {
    const sel = document.getElementById('pim-replace');
    if (!sel) return;
    const isReplace = radio.value === 'replace';
    sel.style.display = isReplace ? 'block' : 'none';
    sel.disabled      = !isReplace;
  }

  function _toggleImg(i) {
    if (!_images[i]) return;
    _images[i].selected = !_images[i].selected;
    const card  = document.getElementById(`pim-ic-${i}`);
    const check = document.getElementById(`pim-icheck-${i}`);
    card?.classList.toggle('pim-img-sel', _images[i].selected);
    if (check) check.textContent = _images[i].selected ? '✅' : '○';
  }

  function _addObj() {
    const list = document.getElementById('rev-objectives');
    if (!list) return;
    const div = document.createElement('div');
    div.innerHTML = _objRow('', Date.now());
    list.appendChild(div.firstElementChild);
    list.lastElementChild?.querySelector('input')?.focus();
  }

  function _addKP() {
    const list = document.getElementById('rev-keypoints');
    if (!list) return;
    const div = document.createElement('div');
    div.innerHTML = _kpRow('', Date.now());
    list.appendChild(div.firstElementChild);
    list.lastElementChild?.querySelector('input')?.focus();
  }

  function _addQ(type) {
    const container = document.getElementById('rev-questions');
    if (!container) return;
    const defaults = {
      mcq:   { type: 'mcq',   question: '', options: ['', '', '', ''], answer: 0 },
      tf:    { type: 'tf',    question: '', answer: true },
      match: { type: 'match', question: 'صل كل مصطلح بمعناه', pairs: [['', ''], ['', ''], ['', '']] }
    };
    const div = document.createElement('div');
    div.innerHTML = _qBlock(defaults[type], Date.now());
    container.appendChild(div.firstElementChild);
    container.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function _addPair(pairContainerId) {
    const container = document.getElementById(pairContainerId);
    if (!container) return;
    const div = document.createElement('div');
    div.innerHTML = _pairRow('', '');
    container.appendChild(div.firstElementChild);
  }

  // ───────────────────────────────────────────────
  //  تشغيل المعالجة الرئيسية
  // ───────────────────────────────────────────────
  async function _process() {
    const apiKey  = document.getElementById('pim-apikey')?.value?.trim();
    const grade   = document.getElementById('pim-grade')?.value;
    const semIdx  = document.getElementById('pim-sem')?.value;
    const unitIdx = document.getElementById('pim-unit')?.value;
    const mode    = document.querySelector('input[name="pim-mode"]:checked')?.value || 'new';
    const replIdx = mode === 'replace' ? document.getElementById('pim-replace')?.value : null;

    // ── التحقق من المدخلات ──
    if (!apiKey)                              return _setError('أدخل مفتاح Claude API');
    if (!apiKey.startsWith('sk-'))            return _setError('مفتاح API يجب أن يبدأ بـ sk-');
    if (!_file)                               return _setError('اختر ملف PDF أو Markdown أولاً');
    if (!grade)                               return _setError('اختر الصف الدراسي');
    if (semIdx === '' || semIdx == null)       return _setError('اختر الفصل الدراسي');
    if (unitIdx === '' || unitIdx == null)     return _setError('اختر الوحدة الدراسية');
    if (mode === 'replace' && !replIdx)       return _setError('اختر الدرس الذي تريد استبداله');

    // ── حفظ البيانات مؤقتاً ──
    sessionStorage.setItem(API_KEY_SESS, apiKey);
    _target = { grade, semIdx: +semIdx, unitIdx: +unitIdx, mode, replIdx: replIdx != null ? +replIdx : null };

    const isMd = _file.name.endsWith('.md');

    try {
      _showProcessing(isMd ? '📝 قراءة ملف Markdown...' : '📄 قراءة ملف PDF...');

      const parser = isMd ? _parseMd : _parsePdf;
      const { text, images } = await parser(_file, msg => {
        const el = document.getElementById('pim-proc-msg');
        if (el) el.textContent = msg;
      });

      const cleanText = (text || '').trim();
      if (cleanText.length < 5) {
        _showStep1();
        _setError(
          'لم يتمكن البرنامج من قراءة النصوص من هذا الملف.\n\n' +
          'الأسباب الشائعة:\n' +
          '• الملف عبارة عن صور ممسوحة ضوئياً (Scanned PDF) — يجب أن يحتوي PDF على نصوص قابلة للنسخ\n' +
          '• جرّب فتح الملف في Adobe Reader وتحقق من إمكانية تحديد النص بالماوس'
        );
        return;
      }

      const el = document.getElementById('pim-proc-msg');
      if (el) el.textContent = `🤖 الذكاء الاصطناعي يُحلّل المحتوى${images.length ? ` (${images.length} صور مكتشفة)` : ''}...`;

      const lesson = await _callClaude(apiKey, text, images, grade);
      _showReview(lesson, images);

    } catch (err) {
      _showStep1();
      _setError(err.message || 'حدث خطأ غير متوقع، أعد المحاولة');
    }
  }

  // ───────────────────────────────────────────────
  //  حفظ الدرس في المنهج
  // ───────────────────────────────────────────────
  function _save() {
    if (!_target) { _setError('بيانات الهدف مفقودة، أعد الرفع'); return; }
    const { grade, semIdx, unitIdx, mode, replIdx } = _target;

    // ── قراءة بيانات النموذج ──
    const name     = document.getElementById('rev-name')?.value?.trim();
    const summary  = document.getElementById('rev-summary')?.value?.trim();
    const objectives = [...document.querySelectorAll('[data-role="obj"]')]
                          .map(i => i.value.trim()).filter(Boolean);
    const keyPoints  = [...document.querySelectorAll('[data-role="kp"]')]
                          .map(i => i.value.trim()).filter(Boolean);

    if (!name)               return _setError('أدخل اسم الدرس');
    if (objectives.length < 2) return _setError('أضف هدفين على الأقل');
    if (!summary)            return _setError('أضف ملخصاً للدرس');
    if (keyPoints.length < 2) return _setError('أضف نقطتين رئيسيتين على الأقل');

    // ── قراءة الأسئلة ──
    const questions = _readQuestions();
    if (questions === null) return;

    // ── بناء كائن الدرس ──
    const existingId = (mode === 'replace' && replIdx != null)
      ? CURRICULUM[grade].semesters[semIdx].units[unitIdx].lessons[replIdx]?.id
      : null;
    const lessonId = existingId || `custom_${Date.now()}`;

    const newLesson = { id: lessonId, name, objectives, summary, keyPoints, questions };

    // ── تطبيق على CURRICULUM ──
    const unit = CURRICULUM[grade].semesters[semIdx].units[unitIdx];
    if (mode === 'replace' && replIdx != null) {
      unit.lessons[replIdx] = newLesson;
    } else {
      unit.lessons.push(newLesson);
    }

    // ── الحفظ في localStorage (والتزامن مع Firebase إن أمكن) ──
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(CURRICULUM));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        return _setError('مساحة التخزين ممتلئة! قلّل عدد الصور المختارة أو أزل دروساً مخصصة قديمة من لوحة التحكم.');
      }
      throw e;
    }

    // محاولة الرفع لـ Firebase إن كان متاحاً
    if (window.FirebaseDB?.dbSaveCurriculum && window.FirebaseDB?.isFirebaseActive?.()) {
      window.FirebaseDB.dbSaveCurriculum(CURRICULUM);
    }

    _removeModal();
    _showToast(`✅ تم حفظ درس "${name}" في ${CURRICULUM[grade].name}`);
    setTimeout(() => location.reload(), 1800);
  }

  // ── قراءة الأسئلة من النموذج ──
  function _readQuestions() {
    const blocks    = document.querySelectorAll('.pim-q-block');
    const questions = [];

    for (const block of blocks) {
      const type  = block.querySelector('.pim-q-type-hidden')?.value;
      const qText = block.querySelector('.pim-q-txt')?.value?.trim();
      if (!qText) { _setError('أكمل نص جميع الأسئلة أو احذف الفارغة منها'); return null; }

      // صورة مرتبطة
      const imgSel = block.querySelector('.pim-q-img-sel');
      const imgIdx = imgSel && imgSel.value !== '' ? +imgSel.value : -1;
      const imgData = imgIdx >= 0 && _images[imgIdx]?.data ? _images[imgIdx].data : null;

      const q = { type, question: qText };
      if (imgData) q.image = imgData;

      if (type === 'mcq') {
        const opts = [...block.querySelectorAll('.pim-opt-inp')].map(i => i.value.trim());
        if (opts.some(o => !o)) { _setError('أكمل جميع خيارات أسئلة الاختيار المتعدد'); return null; }
        const rad = block.querySelector('input[type="radio"]:checked');
        q.options = opts;
        q.answer  = rad ? +rad.value : 0;

      } else if (type === 'tf') {
        const rad = block.querySelector('input[type="radio"]:checked');
        q.answer  = rad ? rad.value === 'true' : true;

      } else if (type === 'match') {
        const rows  = block.querySelectorAll('.pim-pair-row');
        const pairs = [...rows].map(r => [
          r.querySelector('.pim-pair-a')?.value?.trim() || '',
          r.querySelector('.pim-pair-b')?.value?.trim() || ''
        ]).filter(p => p[0] && p[1]);
        if (pairs.length < 2) { _setError('أضف زوجين على الأقل لأسئلة المطابقة'); return null; }
        q.pairs = pairs;
      }

      questions.push(q);
    }

    return questions;
  }

  // ───────────────────────────────────────────────
  //  مساعدات
  // ───────────────────────────────────────────────
  function _setError(msg) {
    const el = document.getElementById('pim-error');
    if (el) {
      el.textContent = '⚠️ ' + msg;
      el.style.display = 'block';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert('⚠️ ' + msg);
    }
  }

  function _clearError() {
    const el = document.getElementById('pim-error');
    if (el) el.style.display = 'none';
  }

  function _showToast(msg) {
    const t = document.createElement('div');
    t.className = 'pim-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('pim-toast-hide'), 3200);
    setTimeout(() => t.remove(), 3800);
  }

  function _removeModal() { document.getElementById('pim-modal')?.remove(); }

  function _esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                          .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ───────────────────────────────────────────────
  //  API العامة
  // ───────────────────────────────────────────────
  window.PdfImporter = {
    open:       _showStep1,
    close:      _removeModal,
    _showStep1,
    _toggleEye,
    _onFileChange,
    _onDrop,
    _onGradeChange,
    _onSemChange,
    _updateReplaceList,
    _onModeChange,
    _toggleImg,
    _addObj,
    _addKP,
    _addQ,
    _addPair,
    _process,
    _save
  };

})();
