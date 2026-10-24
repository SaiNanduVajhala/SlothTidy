// SlothTidy — Client Logic

let currentFiles = [];
let currentPlan = [];
let targetDir = '';
let analyzing = false;

// DOM refs
const $ = id => document.getElementById(id);

const dirInput = $('dirInput');
const modelSelect = $('modelSelect');
const checkRename = $('checkRename');
const statusPill = $('ollamaStatusPill');
const statusText = $('ollamaStatusText');
const mascotQuote = $('mascotQuote');
const statTime = $('statTime');
const statFiles = $('statFiles');

const btnSandbox = $('btnSandbox');
const btnUpload = $('btnUpload');
const fileUploadInput = $('fileUploadInput');
const btnScan = $('btnScan');
const btnExplorer = $('btnExplorer');
const btnAnalyze = $('btnAnalyze');
const btnAnalyzeLabel = $('btnAnalyzeLabel');
const btnApply = $('btnApply');
const btnUndo = $('btnUndo');
const btnEmptyInit = $('btnEmptyInit');

const progress = $('progress');
const progressFill = $('progressFill');
const progressPct = $('progressPct');
const progressLabel = $('progressLabel');

const empty = $('empty');
const tableWrap = $('tableWrap');
const tbody = $('tbody');
const checkAll = $('checkAll');

const banner = $('banner');
const bannerTitle = $('bannerTitle');
const bannerDesc = $('bannerDesc');
const btnBannerOpen = $('btnBannerOpen');
const btnBannerUndo = $('btnBannerUndo');

const modal = $('modal');
const btnWhyOpen = $('btnWhyOpen');
const btnCloseX = $('btnCloseX');
const btnCloseModal = $('btnCloseModal');

const quotes = [
  'Your files, your machine, your rules.',
  'Zero bytes sent to external servers.',
  'Qwen3 runs in your RAM — not someone else\'s data center.',
  'Organize once, pay nothing, repeat forever.',
  'Private by architecture, not by policy.'
];

function randomQuote() {
  mascotQuote.textContent = quotes[Math.floor(Math.random() * quotes.length)];
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ─── Status ───
async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    const d = await res.json();
    if (d.status === 'online') {
      statusPill.className = 'pill online';
      statusText.textContent = `Ollama · ${d.models.length} model${d.models.length !== 1 ? 's' : ''}`;
      if (d.models.length) {
        modelSelect.innerHTML = d.models.map(m =>
          `<option value="${m}">${m}</option>`
        ).join('');
        if (d.models.includes('qwen3:1.7b')) modelSelect.value = 'qwen3:1.7b';
      }
      if (!dirInput.value && d.defaultSandbox) {
        dirInput.value = d.defaultSandbox;
        targetDir = d.defaultSandbox;
      }
      if (d.hasUndo) btnUndo.style.display = '';
      if (d.sandboxFileCount > 0) scan();
    } else {
      statusPill.className = 'pill offline';
      statusText.textContent = 'Ollama offline';
    }
  } catch {
    statusPill.className = 'pill offline';
    statusText.textContent = 'Server error';
  }
}

// ─── Scan ───
async function scan() {
  const dir = dirInput.value.trim();
  if (!dir) return;
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory: dir })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);

    currentFiles = d.files || [];
    currentPlan = [];
    targetDir = d.targetDir;
    btnUndo.style.display = d.hasUndo ? '' : 'none';
    banner.style.display = 'none';
    btnApply.style.display = 'none';

    if (!currentFiles.length) {
      empty.style.display = '';
      tableWrap.style.display = 'none';
      btnAnalyze.disabled = true;
    } else {
      empty.style.display = 'none';
      tableWrap.style.display = '';
      btnAnalyze.disabled = false;
      btnAnalyzeLabel.textContent = `Analyze ${currentFiles.length} files`;
      renderRaw(currentFiles);
    }
    randomQuote();
  } catch (e) {
    alert('Scan failed: ' + e.message);
  }
}

// ─── Render raw file list ───
function renderRaw(files) {
  tbody.innerHTML = files.map((f, i) => `
    <tr>
      <td><input type="checkbox" class="fchk" data-i="${i}" checked></td>
      <td>
        <div class="file-name">${esc(f.name)}</div>
        <div class="file-meta">${f.sizeFormatted} · ${f.extension}</div>
      </td>
      <td><span class="tag tag-archive">Unclassified</span></td>
      <td><span style="color:var(--text-3)">Pending…</span></td>
      <td><span class="reason">${esc(f.snippet.slice(0, 50))}…</span></td>
      <td><span class="time-saved">—</span></td>
    </tr>
  `).join('');
}

// ─── Analyze (SSE streaming) ───
async function analyze() {
  if (analyzing || !currentFiles.length) return;
  analyzing = true;
  btnAnalyze.disabled = true;
  progress.style.display = '';
  progressFill.style.width = '0%';
  progressPct.textContent = '0%';
  progressLabel.textContent = `Loading ${modelSelect.value}…`;
  currentPlan = [];

  try {
    const res = await fetch('/api/analyze-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: currentFiles, model: modelSelect.value })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalData = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6);
        try {
          const event = JSON.parse(json);

          if (event.type === 'progress') {
            const pct = Math.round((event.current / event.total) * 100);
            progressFill.style.width = pct + '%';
            progressPct.textContent = pct + '%';
            progressLabel.textContent = `Analyzed ${event.current} of ${event.total} — ${event.result.fileName}`;

            // Add to plan incrementally
            currentPlan.push({
              ...event.result,
              enabled: true,
              originalFile: currentFiles[event.current - 1]
            });
            renderPlan(currentPlan);
          }

          if (event.type === 'done') {
            finalData = event;
          }
        } catch {}
      }
    }

    progressLabel.textContent = 'Analysis complete';
    setTimeout(() => { progress.style.display = 'none'; }, 800);

    if (finalData) {
      statTime.textContent = finalData.totalMinutesSaved + 'm';
      mascotQuote.textContent = `${finalData.totalMinutesSaved} minutes of sorting, handled locally.`;
    }
    btnApply.style.display = '';
  } catch (e) {
    alert('Analysis failed: ' + e.message);
    progress.style.display = 'none';
  } finally {
    analyzing = false;
    btnAnalyze.disabled = false;
  }
}

// ─── Render plan ───
function tagClass(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('finance') || c.includes('invoice')) return 'tag-finance';
  if (c.includes('work') || c.includes('project')) return 'tag-work';
  if (c.includes('code') || c.includes('script')) return 'tag-code';
  if (c.includes('note') || c.includes('list')) return 'tag-notes';
  if (c.includes('log') || c.includes('diag')) return 'tag-logs';
  if (c.includes('media') || c.includes('asset')) return 'tag-media';
  return 'tag-archive';
}

function renderPlan(plan) {
  tbody.innerHTML = plan.map((p, i) => `
    <tr>
      <td><input type="checkbox" class="fchk" data-i="${i}" ${p.enabled ? 'checked' : ''}></td>
      <td>
        <div class="file-name">${esc(p.fileName)}</div>
        <div class="file-meta">${p.originalFile.sizeFormatted} · ${p.originalFile.extension}</div>
      </td>
      <td><span class="tag ${tagClass(p.category)}">${esc(p.category)}</span></td>
      <td><input type="text" class="table-input pname" data-i="${i}" value="${esc(p.proposedName)}"></td>
      <td>
        <div class="reason">${esc(p.reason)}</div>
        <div class="confidence">${(p.confidence * 100).toFixed(0)}% confidence</div>
      </td>
      <td><span class="time-saved">+${p.minutesSaved}m</span></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.pname').forEach(el => {
    el.addEventListener('input', e => {
      const i = +e.target.dataset.i;
      if (currentPlan[i]) currentPlan[i].proposedName = e.target.value.trim();
    });
  });

  tbody.querySelectorAll('.fchk').forEach(el => {
    el.addEventListener('change', e => {
      const i = +e.target.dataset.i;
      if (currentPlan[i]) currentPlan[i].enabled = e.target.checked;
    });
  });
}

// ─── Apply ───
async function apply() {
  if (!currentPlan.length) return;
  btnApply.disabled = true;
  btnApply.textContent = 'Applying…';
  try {
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetDir, plan: currentPlan, renameFiles: checkRename.checked
      })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);

    bannerTitle.textContent = `${d.movedCount} files organized`;
    bannerDesc.textContent = `${d.totalMinutesSaved} minutes saved. Fully reversible.`;
    banner.style.display = '';
    btnApply.style.display = 'none';
    btnUndo.style.display = '';
    statFiles.textContent = d.movedCount;
    mascotQuote.textContent = 'Organized. Zero effort. Back to lounging.';
    scan();
  } catch (e) {
    alert('Apply failed: ' + e.message);
  } finally {
    btnApply.disabled = false;
    btnApply.textContent = 'Apply changes';
  }
}

// ─── Undo ───
async function undo() {
  if (!confirm('Revert files to their original state?')) return;
  try {
    const res = await fetch('/api/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory: targetDir })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    btnUndo.style.display = 'none';
    banner.style.display = 'none';
    scan();
  } catch (e) {
    alert('Undo failed: ' + e.message);
  }
}

// ─── Sandbox ───
async function loadSandbox() {
  try {
    const res = await fetch('/api/init-sample', { method: 'POST' });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    dirInput.value = d.targetDir;
    targetDir = d.targetDir;
    banner.style.display = 'none';
    scan();
  } catch (e) {
    alert('Failed: ' + e.message);
  }
}

// ─── Explorer ───
async function openFolder() {
  try {
    await fetch('/api/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory: dirInput.value.trim() || targetDir })
    });
  } catch {}
}

// ─── Events ───
btnSandbox.addEventListener('click', loadSandbox);
btnEmptyInit.addEventListener('click', loadSandbox);
btnScan.addEventListener('click', scan);
btnAnalyze.addEventListener('click', analyze);
btnApply.addEventListener('click', apply);
btnUndo.addEventListener('click', undo);
btnBannerUndo.addEventListener('click', undo);
btnExplorer.addEventListener('click', openFolder);
btnBannerOpen.addEventListener('click', openFolder);

checkAll.addEventListener('change', e => {
  const on = e.target.checked;
  document.querySelectorAll('.fchk').forEach(c => c.checked = on);
  currentPlan.forEach(p => p.enabled = on);
});

// ─── Upload & Drag-and-Drop ───
if (btnUpload && fileUploadInput) {
  btnUpload.addEventListener('click', () => fileUploadInput.click());

  fileUploadInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const payloads = [];
    for (const f of files) {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result;
          resolve(res.split(',')[1] || '');
        };
        reader.readAsDataURL(f);
      });
      payloads.push({ name: f.name, base64 });
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloads, directory: dirInput.value.trim() || targetDir })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      scan();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      fileUploadInput.value = '';
    }
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      fileUploadInput.files = e.dataTransfer.files;
      fileUploadInput.dispatchEvent(new Event('change'));
    }
  });
}

checkStatus();
