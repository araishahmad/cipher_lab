const BASE_URL = "http://127.0.0.1:5000";

// Tab switching — hides all panels and activates the one matching the given name

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === name) btn.classList.add('active');
  });
}

// Updates the shifted-alphabet preview whenever the user changes the Caesar shift value

function updateShiftPreview() {
  const shift = parseInt(document.getElementById('caesar-shift').value) || 3;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const shifted = letters.split('').map(c =>
    letters[(letters.indexOf(c) + shift) % 26]
  ).join(' ');
  document.getElementById('shift-preview').textContent = shifted;
}

function adjustShift(delta) {
  const el  = document.getElementById('caesar-shift');
  const val = Math.min(25, Math.max(1, (parseInt(el.value) || 3) + delta));
  el.value  = val;
  updateShiftPreview();
}

document.addEventListener('DOMContentLoaded', () => {
  updateShiftPreview();
  document.getElementById('caesar-shift').addEventListener('input', updateShiftPreview);
});

// Keeps the mode description text in sync with whichever AES mode radio is selected

function updateModeInfo() {
  const mode = document.querySelector('input[name="aes-mode"]:checked')?.value || 'CBC';
  const info = document.getElementById('mode-info-text');
  info.textContent = mode === 'GCM'
    ? 'Galois/Counter Mode — encrypts and authenticates; detects any tampering on decrypt'
    : 'Cipher Block Chaining — each block XORed with previous ciphertext block';
}

// Random key generator — 'alpha' gives a 10-char letter-only key (Vigenère),
// 'strong' gives a 20-char alphanumeric + symbol key suitable for AES passwords

function generateKey(inputId, type) {
  let chars, length;
  if (type === 'alpha') {
    chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    length = 10;
  } else {
    chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    length = 20;
  }
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  document.getElementById(inputId).value =
    Array.from(arr).map(b => chars[b % chars.length]).join('');
}

// Renders labeled rows of results into the output box;
// turns the border green on success or red on error

function showResult(boxId, rows, isError) {
  const box = document.getElementById(boxId);
  box.className = 'result-box ' + (isError ? 'error' : 'success');
  box.innerHTML = rows.map(([label, value, cls]) =>
    `<div class="result-row">
       <div class="result-label">${label}</div>
       <div class="result-value mono ${cls || ''}">${escapeHtml(value)}</div>
     </div>`
  ).join('');
}

function showError(boxId, msg) {
  const box = document.getElementById(boxId);
  box.className = 'result-box error';
  box.innerHTML = `<div class="result-error">${escapeHtml(msg)}</div>`;
}

// Caesar cipher — sends the text and shift to the backend, then shows the result
// and draws the alphabet-shift grid visualization

async function caesarAction(action) {
  const text  = document.getElementById('caesar-text').value.trim();
  const shift = parseInt(document.getElementById('caesar-shift').value);
  if (!text) { alert("Enter some text first."); return; }

  try {
    const res  = await fetch(`${BASE_URL}/caesar/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, shift })
    });
    const data = await res.json();

    showResult('caesar-output', [
      ['ACTION',     action.toUpperCase()],
      ['INPUT',      text],
      ['SHIFT USED', String(shift)],
      ['OUTPUT',     data.result],
    ]);

    renderCaesarViz(shift, text, data.result, action);

  } catch { alert("Cannot connect to backend. Start app.py first."); }
}

function renderCaesarViz(shift, input, output, action) {
  const viz = document.getElementById('caesar-viz');
  const container = document.getElementById('caesar-alphabet-viz');
  viz.classList.remove('hidden');

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  container.innerHTML = letters.split('').map((c, i) => {
    const shifted = letters[(i + shift) % 26];
    return `<div class="alpha-cell">
      <div class="alpha-plain">${c}</div>
      <div class="alpha-cipher" style="animation-delay:${i * 0.02}s">${shifted}</div>
    </div>`;
  }).join('');
}

// Vigenère cipher — sends text + keyword to the backend, then renders the
// key-expansion visualization showing how the keyword maps over the plaintext

async function vigenereAction(action) {
  const text = document.getElementById('vigenere-text').value.trim();
  const key  = document.getElementById('vigenere-key').value.trim();
  if (!text) { alert("Enter some text first."); return; }
  if (!key)  { alert("Enter a keyword."); return; }

  try {
    const res  = await fetch(`${BASE_URL}/vigenere/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, key })
    });
    const data = await res.json();

    if (data.error) { showError('vigenere-output', data.error); return; }

    showResult('vigenere-output', [
      ['ACTION',  action.toUpperCase()],
      ['INPUT',   text],
      ['KEYWORD', key.toUpperCase()],
      ['OUTPUT',  data.result],
    ]);

    renderVigenereViz(text, key.toUpperCase());

  } catch { alert("Cannot connect to backend. Start app.py first."); }
}

function renderVigenereViz(text, key) {
  const viz = document.getElementById('vigenere-viz');
  const container = document.getElementById('vigenere-key-viz');
  viz.classList.remove('hidden');

  const letters = text.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 20);
  const keyChars = letters.split('').map((_, i) => key[i % key.length]);

  container.innerHTML = `
    <div class="key-exp-row">${letters.split('').map((c, i) =>
      `<div class="key-exp-char text-char" style="animation-delay:${i*0.03}s">${c}</div>`
    ).join('')}</div>
    <div class="key-exp-row">${keyChars.map((c, i) =>
      `<div class="key-exp-char key-char" style="animation-delay:${i*0.03}s">${c}</div>`
    ).join('')}</div>
    <div class="key-exp-row">${keyChars.map((c, i) =>
      `<div class="key-exp-char shift-num" style="animation-delay:${i*0.03}s">${c.charCodeAt(0)-65}</div>`
    ).join('')}</div>
  `;
}

// AES text encryption/decryption — posts text + password + mode to the backend
// and draws the pipeline diagram (Plaintext → PBKDF2 → IV → AES → Ciphertext)

async function aesAction(action) {
  const text = document.getElementById('aes-text').value.trim();
  const key  = document.getElementById('aes-key').value.trim();
  const mode = document.querySelector('input[name="aes-mode"]:checked').value;
  if (!text) { alert("Enter some text first."); return; }
  if (!key)  { alert("Enter a password."); return; }

  try {
    const res  = await fetch(`${BASE_URL}/aes/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, key, mode })
    });
    const data = await res.json();

    if (data.error) { showError('aes-output', data.error); return; }

    const modeNote = mode === 'GCM'
      ? 'Includes authentication tag — tampering detected on decrypt'
      : 'Standard block chaining mode';

    showResult('aes-output', [
      ['ACTION',         action.toUpperCase()],
      ['MODE',           `AES-256 ${mode} — ${modeNote}`],
      ['KEY DERIVATION', 'PBKDF2 · 200,000 rounds · SHA-256 · 32-byte key'],
      ['INPUT',          text],
      ['OUTPUT',         data.result],
    ]);

    renderAesPipelineViz(action, mode);

  } catch { alert("Cannot connect to backend. Start app.py first."); }
}

function renderAesPipelineViz(action, mode) {
  const viz = document.getElementById('aes-viz');
  const container = document.getElementById('aes-pipeline-viz');
  viz.classList.remove('hidden');

  const steps = action === 'encrypt'
    ? [
        { label: 'Plaintext',   cls: 'input',  sub: 'your text' },
        { label: '→', cls: 'arrow' },
        { label: 'PBKDF2',     cls: 'pbkdf2', sub: '200k rounds' },
        { label: '→', cls: 'arrow' },
        { label: mode === 'GCM' ? 'Nonce' : 'IV', cls: 'iv', sub: 'random 16B' },
        { label: '→', cls: 'arrow' },
        { label: `AES-256\n${mode}`, cls: 'aes', sub: 'encrypt' },
        { label: '→', cls: 'arrow' },
        { label: 'Ciphertext', cls: 'output', sub: 'base64' },
      ]
    : [
        { label: 'Ciphertext', cls: 'input',  sub: 'base64' },
        { label: '→', cls: 'arrow' },
        { label: 'Extract\nSalt + IV', cls: 'iv', sub: 'first 32B' },
        { label: '→', cls: 'arrow' },
        { label: 'PBKDF2',     cls: 'pbkdf2', sub: '200k rounds' },
        { label: '→', cls: 'arrow' },
        { label: `AES-256\n${mode}`, cls: 'aes', sub: 'decrypt' },
        { label: '→', cls: 'arrow' },
        { label: 'Plaintext',  cls: 'output', sub: 'recovered' },
      ];

  container.innerHTML = steps.map((s, i) =>
    s.cls === 'arrow'
      ? `<div class="pipe-arrow" style="animation-delay:${i*0.06}s">→</div>`
      : `<div class="pipe-step" style="animation-delay:${i*0.06}s">
           <div class="pipe-box ${s.cls}">${s.label.replace('\n','<br>')}</div>
           <div class="pipe-label">${s.sub}</div>
         </div>`
  ).join('');
}

// AES file encryption/decryption — reads the file as base64, posts it to the
// backend, and triggers a browser download of the encrypted/decrypted result

function onFileSelected() {
  const file    = document.getElementById('aes-file').files[0];
  const display = document.getElementById('file-name-display');
  if (file) {
    display.textContent = `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
    display.classList.remove('hidden');
  }
}

async function fileAction(action) {
  const fileInput = document.getElementById('aes-file');
  const key       = document.getElementById('aes-key').value.trim();
  const mode      = document.querySelector('input[name="aes-mode"]:checked').value;
  const outputDiv = document.getElementById('file-output');

  if (!fileInput.files.length) { alert("Select a file first."); return; }
  if (!key) { alert("Enter a password above."); return; }

  const file   = fileInput.files[0];
  const fileB64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  outputDiv.classList.remove('hidden');
  outputDiv.className = 'result-box';
  outputDiv.innerHTML = `<div class="result-row"><div class="result-value">Processing...</div></div>`;

  try {
    const endpoint = action === 'encrypt' ? '/aes/encrypt-file' : '/aes/decrypt-file';
    const res  = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_data: fileB64, key, mode })
    });
    const data = await res.json();

    if (data.error) {
      outputDiv.className = 'result-box error';
      outputDiv.innerHTML = `<div class="result-error">${escapeHtml(data.error)}</div>`;
      return;
    }

    let downloadName, mimeType, content;
    if (action === 'encrypt') {
      downloadName = file.name + '.enc';
      mimeType     = 'text/plain';
      content      = data.result;
    } else {
      downloadName = file.name.endsWith('.enc') ? file.name.slice(0, -4) : file.name + '.dec';
      mimeType     = file.name.includes('.pdf') ? 'application/pdf' : 'text/plain';
      const bytes  = atob(data.result);
      const arr    = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      content      = new Blob([arr], { type: mimeType });
    }

    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = downloadName; a.click();
    URL.revokeObjectURL(url);

    outputDiv.className = 'result-box success';
    outputDiv.innerHTML = `
      <div class="result-row"><div class="result-label">STATUS</div><div class="result-value">File ${action === 'encrypt' ? 'encrypted' : 'decrypted'} and downloaded</div></div>
      <div class="result-row"><div class="result-label">OUTPUT FILE</div><div class="result-value mono">${escapeHtml(downloadName)}</div></div>
      <div class="result-row"><div class="result-label">ORIGINAL</div><div class="result-value mono">${escapeHtml(file.name)} · ${(file.size/1024).toFixed(1)} KB</div></div>
      <div class="result-row"><div class="result-label">MODE</div><div class="result-value">AES-256 ${mode} with PBKDF2</div></div>
    `;
  } catch (err) {
    outputDiv.className = 'result-box error';
    outputDiv.innerHTML = `<div class="result-error">${escapeHtml(err.message)}</div>`;
  }
}

// RSA — key pair generation and encrypt/decrypt using public/private keys.
// Key generation is slow (2048-bit), so the button is disabled while waiting.

async function rsaGenerate() {
  const btn = document.getElementById('rsa-gen-btn');
  btn.textContent = '⏳ Generating...';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${BASE_URL}/rsa/generate`);
    const data = await res.json();

    document.getElementById('rsa-public-key').value  = data.public_key;
    document.getElementById('rsa-private-key').value = data.private_key;
    document.getElementById('rsa-pub-input').value   = data.public_key;
    document.getElementById('rsa-priv-input').value  = data.private_key;
    document.getElementById('rsa-keys').classList.remove('hidden');
  } catch { alert("Cannot connect to backend. Start app.py first."); }

  btn.innerHTML = '<span class="btn-icon">⚙</span> Generate Key Pair';
  btn.disabled  = false;
}

async function rsaAction(action) {
  const text    = document.getElementById('rsa-text').value.trim();
  const pubKey  = document.getElementById('rsa-pub-input').value.trim();
  const privKey = document.getElementById('rsa-priv-input').value.trim();

  if (!text) { alert("Enter some text first."); return; }
  if (action === 'encrypt' && !pubKey)  { alert("Paste a public key."); return; }
  if (action === 'decrypt' && !privKey) { alert("Paste a private key."); return; }

  const payload = action === 'encrypt'
    ? { text, public_key: pubKey }
    : { text, private_key: privKey };

  try {
    const res  = await fetch(`${BASE_URL}/rsa/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.error) { showError('rsa-output', data.error); return; }

    const note = action === 'encrypt'
      ? 'Encrypted with public key — only the private key holder can decrypt'
      : 'Decrypted with private key';

    showResult('rsa-output', [
      ['ACTION', action.toUpperCase()],
      ['NOTE',   note],
      ['INPUT',  text],
      ['OUTPUT', data.result],
    ]);

    renderRsaViz(action);

  } catch { alert("Cannot connect to backend. Start app.py first."); }
}

function renderRsaViz(action) {
  const viz = document.getElementById('rsa-viz');
  const container = document.getElementById('rsa-flow-viz');
  viz.classList.remove('hidden');

  const isEncrypt = action === 'encrypt';
  container.innerHTML = `
    <div class="rsa-flow-node">
      <div class="rsa-node-icon">👤</div>
      <div class="rsa-node-label">Sender</div>
    </div>
    <div class="rsa-flow-arrow">
      <div class="rsa-arrow-line ${isEncrypt ? 'rsa-arrow-pub' : 'rsa-arrow-priv'}">→</div>
      <div class="rsa-arrow-label">${isEncrypt ? 'PUBLIC KEY' : 'PRIVATE KEY'}</div>
    </div>
    <div class="rsa-flow-node">
      <div class="rsa-node-icon">${isEncrypt ? '🔒' : '🔓'}</div>
      <div class="rsa-node-label">${isEncrypt ? 'Encrypted' : 'Decrypted'}</div>
    </div>
    <div class="rsa-flow-arrow">
      <div class="rsa-arrow-line ${isEncrypt ? 'rsa-arrow-priv' : 'rsa-arrow-pub'}">→</div>
      <div class="rsa-arrow-label">${isEncrypt ? 'PRIVATE KEY' : 'PUBLIC KEY'}</div>
    </div>
    <div class="rsa-flow-node">
      <div class="rsa-node-icon">🏠</div>
      <div class="rsa-node-label">Receiver</div>
    </div>
  `;
}

// Hash functions — clears the output on text change to prompt the user to 
// re-calculate, then posts to the backend and visualizes the resulting hex digest.

function onHashInput() {
  const box = document.getElementById('hash-output');
  box.className = 'result-box';
  box.innerHTML = `<div class="result-placeholder"><span class="placeholder-icon">⟶</span><span>Select an algorithm to hash</span></div>`;
  document.getElementById('hash-viz').classList.add('hidden');
  document.querySelectorAll('.btn-hash').forEach(b => b.classList.remove('active'));
}

async function hashAction(algorithm) {
  const text = document.getElementById('hash-text').value.trim();
  if (!text) { alert("Enter some text first."); return; }

  document.querySelectorAll('.btn-hash').forEach(b =>
    b.classList.toggle('active', b.dataset.algo === algorithm)
  );

  try {
    const res  = await fetch(`${BASE_URL}/hash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, algorithm })
    });
    const data = await res.json();

    showResult('hash-output', [
      ['ALGORITHM',  `${data.algorithm} — ${data.bits}-bit output`],
      ['INPUT',      text],
      [`HASH (${data.length} hex chars)`, data.hash],
      ['NOTE',       'One-way function — this hash cannot be reversed to recover the original text'],
    ]);

    renderHashViz(data.hash);

  } catch { alert("Cannot connect to backend. Start app.py first."); }
}

function renderHashViz(hash) {
  const viz = document.getElementById('hash-viz');
  const container = document.getElementById('hash-bits-viz');
  viz.classList.remove('hidden');

  // Color each hex character by its numeric value to create a unique visual fingerprint
  const palette = [
    '#00d4ff','#00e5a0','#f5c842','#ff8c42','#ff4060',
    '#a78bfa','#34d399','#fbbf24','#60a5fa','#f472b6'
  ];

  container.innerHTML = hash.split('').map((c, i) => {
    const val   = parseInt(c, 16);
    const color = palette[val % palette.length];
    const size  = 10 + Math.floor(val / 4);
    return `<span class="hash-char"
      style="color:${color}; background:${color}18; font-size:${size}px; animation-delay:${i*0.02}s">${c}</span>`;
  }).join('');
}

// Attack simulation — sends the plaintext to the backend which encrypts it with
// a weak Caesar shift and a weak AES password, then runs three attacks against it:
// frequency analysis, brute-force, and a dictionary attack

async function runAttack() {
  const text = document.getElementById('attack-text').value.trim();
  if (!text) { alert("Enter some text first."); return; }

  document.getElementById('attack-output').classList.add('hidden');
  document.getElementById('attack-loading').classList.remove('hidden');

  const labels = [
    "Initializing attack modules...",
    "Analyzing ciphertext structure...",
    "Running frequency analysis...",
    "Launching dictionary attack on AES...",
    "Compiling results..."
  ];

  let labelIdx = 0;
  const labelEl = document.getElementById('loader-label');
  const labelTimer = setInterval(() => {
    labelIdx = (labelIdx + 1) % labels.length;
    labelEl.textContent = labels[labelIdx];
  }, 700);

  try {
    const res  = await fetch(`${BASE_URL}/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    clearInterval(labelTimer);
    document.getElementById('attack-loading').classList.add('hidden');

    // Pull out the two attack result objects returned by the backend
    const c = data.caesar;
    const d = data.aes;

    // Frequency analysis chart and result table
    renderFreqChart(c.freq_table);

    // frequency analysis result table
    document.getElementById('caesar-freq-result').innerHTML = [
      ['CIPHERTEXT',      c.ciphertext],
      ['SHIFT USED',      String(c.shift_used) + ' (hidden from attacker)'],
      ['DEDUCED SHIFT',   String(c.deduced_shift)],
      ['CRACKED TEXT',    c.freq_cracked],
      ['TIME',            c.freq_time_ms + ' ms'],
    ].map(artRow).join('') +
    `<div class="attack-note">Frequency analysis accuracy improves with longer plaintext — short inputs may deduce the wrong shift.</div>`;

    // Brute-force visualization and result table
    renderBruteForceViz(c.bf_shift);

    document.getElementById('caesar-bf-result').innerHTML = [
      ['KEYS TRIED',    '26 (all possible shifts)'],
      ['CRACKED SHIFT', String(c.bf_shift)],
      ['CRACKED TEXT',  c.bf_cracked],
      ['TIME',          c.bf_time_ms + ' ms'],
    ].map(artRow).join('');

    // Dictionary attack visualization and result table
    renderDictViz(d.cracked_password);

    document.getElementById('aes-dict-result').innerHTML = [
      ['PASSWORD USED',    '"' + d.weak_password + '"'],
      ['CIPHERTEXT',       d.ciphertext],
      ['WORDLIST SIZE',    d.wordlist_size + ' common passwords'],
      ['CRACKED PASSWORD', '"' + d.cracked_password + '"'],
      ['DECRYPTED TEXT',   d.cracked_text],
      ['TIME',             d.time_ms + ' ms'],
      ['NOTE',             d.note],
    ].map((r, i) => artRow(r, i === 3 ? 'danger' : i === 4 ? 'cracked' : '')).join('');

    document.getElementById('verdict-text').innerHTML = `
      <div class="verdict-item"><span class="verdict-dot">▶</span><span><strong>Caesar</strong> was broken two ways: frequency analysis deduced the shift purely from letter distribution patterns — no original text needed. Brute-force tried all 26 keys in under a millisecond.</span></div>
      <div class="verdict-item"><span class="verdict-dot">▶</span><span><strong>AES encryption was never broken</strong> — the algorithm is mathematically sound. The weak password "password123" was found in a common wordlist. Strong encryption + weak password = vulnerable system.</span></div>
      <div class="verdict-item"><span class="verdict-dot">▶</span><span>Use the key generator on the AES tab to create passwords that cannot appear in any wordlist.</span></div>
    `;

    document.getElementById('attack-output').classList.remove('hidden');

  } catch (err) {
    clearInterval(labelTimer);
    document.getElementById('attack-loading').classList.add('hidden');
    alert("Cannot connect to backend. Start app.py first.");
  }
}

function artRow([key, val], valCls) {
  return `<div class="art-row">
    <div class="art-key">${key}</div>
    <div class="art-val ${valCls || ''}">${escapeHtml(String(val))}</div>
  </div>`;
}

function renderFreqChart(freqTable) {
  const container = document.getElementById('freq-viz-container');
  const entries   = Object.entries(freqTable);
  if (!entries.length) { container.innerHTML = ''; return; }

  const max = Math.max(...entries.map(([,v]) => v));

  container.innerHTML = `<div class="freq-chart">` +
    entries.map(([letter, pct], i) => {
      const height = Math.round((pct / max) * 60);
      const isTop  = i === 0;
      return `<div class="freq-bar-wrap">
        <div class="freq-bar ${isTop ? 'top-bar' : ''}" style="height:${height}px; animation-delay:${i*0.05}s"></div>
        <div class="freq-letter">${letter}</div>
        <div class="freq-pct">${pct}%</div>
      </div>`;
    }).join('') + `</div>`;
}

function renderBruteForceViz(crackedShift) {
  const container = document.getElementById('brute-force-viz');
  let html = '<div class="bf-grid">';
  for (let s = 0; s < 26; s++) {
    const cls = s < crackedShift ? 'tried' : s === crackedShift ? 'cracked' : '';
    const delay = s * 0.04;
    html += `<div class="bf-cell ${cls}" style="animation-delay:${delay}s">shift ${s}</div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function renderDictViz(crackedPwd) {
  const words = [
    "123456","password","12345678","qwerty","abc123","111111","iloveyou",
    "admin","letmein","monkey","dragon","master","sunshine","princess",
    "welcome","shadow","football","baseball","batman","password123"
  ];

  let html = '<div class="dict-grid">';
  words.forEach((w, i) => {
    const isCracked = w === crackedPwd;
    const isFailed  = words.indexOf(crackedPwd) > i;
    const cls       = isCracked ? 'cracked' : isFailed ? 'failed' : '';
    html += `<div class="dict-word ${cls}" style="animation-delay:${i*0.06}s">${escapeHtml(w)}</div>`;
  });
  html += '</div>';
  document.getElementById('dict-viz').innerHTML = html;
}

// Clipboard helper — temporarily swaps the button label to "Copied!" for feedback

function copyText(id) {
  const text = document.getElementById(id).value;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
}

// Sanitizes user input before injecting it into innerHTML to prevent XSS

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}