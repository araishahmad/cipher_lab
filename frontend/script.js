const BASE_URL = "http://127.0.0.1:5000";

// tab switching

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.getAttribute('onclick') === "showTab('" + name + "')") {
      btn.classList.add('active');
    }
  });
}

// caesar encrypt / decrypt

async function caesarAction(action) {
  const text  = document.getElementById('caesar-text').value.trim();
  const shift = parseInt(document.getElementById('caesar-shift').value);
  const outputDiv = document.getElementById('caesar-output');

  if (!text) { alert("Please enter some text."); return; }

  try {
    const res  = await fetch(`${BASE_URL}/caesar/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, shift })
    });
    const data = await res.json();
    outputDiv.classList.remove('hidden');
    outputDiv.innerHTML = `
      <div class="label">Action</div><div class="value">${action.toUpperCase()}</div><br>
      <div class="label">Input</div><div class="value">${escapeHtml(text)}</div><br>
      <div class="label">Shift Used</div><div class="value">${shift}</div><br>
      <div class="label">Output</div><div class="value">${escapeHtml(data.result)}</div>
    `;
  } catch (err) {
    alert("Error connecting to backend. Make sure app.py is running.");
  }
}

// vigenere encrypt / decrypt

async function vigenereAction(action) {
  const text = document.getElementById('vigenere-text').value.trim();
  const key  = document.getElementById('vigenere-key').value.trim();
  const outputDiv = document.getElementById('vigenere-output');

  if (!text) { alert("Please enter some text."); return; }
  if (!key)  { alert("Please enter a keyword."); return; }

  try {
    const res  = await fetch(`${BASE_URL}/vigenere/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, key })
    });
    const data = await res.json();

    if (data.error) {
      outputDiv.classList.remove('hidden');
      outputDiv.innerHTML = `<div class="error">${data.error}</div>`;
      return;
    }

    outputDiv.classList.remove('hidden');
    outputDiv.innerHTML = `
      <div class="label">Action</div><div class="value">${action.toUpperCase()}</div><br>
      <div class="label">Input</div><div class="value">${escapeHtml(text)}</div><br>
      <div class="label">Keyword</div><div class="value">${escapeHtml(key.toUpperCase())}</div><br>
      <div class="label">Output</div><div class="value">${escapeHtml(data.result)}</div>
    `;
  } catch (err) {
    alert("Error connecting to backend. Make sure app.py is running.");
  }
}

// aes encrypt / decrypt — sends chosen mode (CBC or GCM) to backend

async function aesAction(action) {
  const text = document.getElementById('aes-text').value.trim();
  const key  = document.getElementById('aes-key').value.trim();
  const mode = document.querySelector('input[name="aes-mode"]:checked').value;
  const outputDiv = document.getElementById('aes-output');

  if (!text) { alert("Please enter some text."); return; }
  if (!key)  { alert("Please enter a password."); return; }

  try {
    const res  = await fetch(`${BASE_URL}/aes/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, key, mode })
    });
    const data = await res.json();

    if (data.error) {
      outputDiv.classList.remove('hidden');
      outputDiv.innerHTML = `<div class="error">${data.error}</div>`;
      return;
    }

    const modeNote = mode === 'GCM'
      ? 'Includes authentication tag — any tampering will be detected on decrypt.'
      : 'Standard block chaining mode.';

    outputDiv.classList.remove('hidden');
    outputDiv.innerHTML = `
      <div class="label">Action</div><div class="value">${action.toUpperCase()}</div><br>
      <div class="label">Mode</div><div class="value">AES-256 ${mode} &nbsp;—&nbsp; ${modeNote}</div><br>
      <div class="label">Key Derivation</div><div class="value">PBKDF2 · 200,000 rounds · SHA-256 · 32-byte key</div><br>
      <div class="label">Input</div><div class="value">${escapeHtml(text)}</div><br>
      <div class="label">Output</div><div class="value">${escapeHtml(data.result)}</div>
    `;
  } catch (err) {
    alert("Error connecting to backend. Make sure app.py is running.");
  }
}

// rsa key generation

async function rsaGenerate() {
  const btn = event.target;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    const res  = await fetch(`${BASE_URL}/rsa/generate`);
    const data = await res.json();

    document.getElementById('rsa-public-key').value  = data.public_key;
    document.getElementById('rsa-private-key').value = data.private_key;

    // auto-fill the input boxes so the user can immediately encrypt/decrypt
    document.getElementById('rsa-pub-input').value  = data.public_key;
    document.getElementById('rsa-priv-input').value = data.private_key;

    document.getElementById('rsa-keys').classList.remove('hidden');
  } catch (err) {
    alert("Error connecting to backend. Make sure app.py is running.");
  }

  btn.textContent = 'Generate Key Pair';
  btn.disabled = false;
}

// rsa encrypt / decrypt

async function rsaAction(action) {
  const text    = document.getElementById('rsa-text').value.trim();
  const pubKey  = document.getElementById('rsa-pub-input').value.trim();
  const privKey = document.getElementById('rsa-priv-input').value.trim();
  const outputDiv = document.getElementById('rsa-output');

  if (!text) { alert("Please enter some text."); return; }

  const payload = action === 'encrypt'
    ? { text, public_key: pubKey }
    : { text, private_key: privKey };

  if (action === 'encrypt' && !pubKey) { alert("Please paste a public key."); return; }
  if (action === 'decrypt' && !privKey) { alert("Please paste a private key."); return; }

  try {
    const res  = await fetch(`${BASE_URL}/rsa/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.error) {
      outputDiv.classList.remove('hidden');
      outputDiv.innerHTML = `<div class="error">${data.error}</div>`;
      return;
    }

    const note = action === 'encrypt'
      ? 'Encrypted with public key. Only the private key holder can decrypt this.'
      : 'Decrypted with private key.';

    outputDiv.classList.remove('hidden');
    outputDiv.innerHTML = `
      <div class="label">Action</div><div class="value">${action.toUpperCase()}</div><br>
      <div class="label">Note</div><div class="value">${note}</div><br>
      <div class="label">Input</div><div class="value">${escapeHtml(text)}</div><br>
      <div class="label">Output</div><div class="value">${escapeHtml(data.result)}</div>
    `;
  } catch (err) {
    alert("Error connecting to backend. Make sure app.py is running.");
  }
}

// attack simulation

async function runAttack() {
  const text = document.getElementById('attack-text').value.trim();
  if (!text) { alert("Please enter some text."); return; }

  document.getElementById('attack-output').classList.add('hidden');
  document.getElementById('attack-loading').classList.remove('hidden');

  try {
    const res  = await fetch(`${BASE_URL}/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    document.getElementById('attack-loading').classList.add('hidden');

    document.getElementById('caesar-attack-result').innerHTML = `
      <table>
        <tr><td>Ciphertext</td><td>${escapeHtml(data.caesar.ciphertext)}</td></tr>
        <tr><td>Shift Used</td><td>${data.caesar.shift_used}</td></tr>
        <tr><td>Keys Tried</td><td>${data.caesar.keys_tried} (all possible)</td></tr>
        <tr><td>Cracked Shift</td><td>${data.caesar.cracked_shift}</td></tr>
        <tr><td>Cracked Text</td><td>${escapeHtml(data.caesar.cracked_text)}</td></tr>
        <tr><td>Time Taken</td><td>${data.caesar.time_ms} ms</td></tr>
        <tr><td>Verdict</td><td><b style="color:#b00020">${data.caesar.verdict}</b></td></tr>
      </table>
    `;

    document.getElementById('aes-attack-result').innerHTML = `
      <table>
        <tr><td>Ciphertext</td><td>${escapeHtml(data.aes.ciphertext)}</td></tr>
        <tr><td>Total Key Space</td><td>${data.aes.total_keys}</td></tr>
        <tr><td>Keys Tried</td><td>${data.aes.keys_tried} (random)</td></tr>
        <tr><td>Cracked</td><td>${data.aes.cracked ? 'Yes' : 'No'}</td></tr>
        <tr><td>Time Taken</td><td>${data.aes.time_ms} ms</td></tr>
        <tr><td>Verdict</td><td><b style="color:#1a7431">${data.aes.verdict}</b></td></tr>
      </table>
    `;

    document.getElementById('verdict-text').innerHTML = `
      <b>Conclusion:</b> Caesar was cracked instantly by trying all 26 possible shifts.
      AES-256 with PBKDF2 has a key space of 2<sup>256</sup> and derives keys through
      200,000 hashing rounds — making both brute-force and password guessing
      computationally infeasible with any existing hardware.
    `;

    document.getElementById('attack-output').classList.remove('hidden');
  } catch (err) {
    document.getElementById('attack-loading').classList.add('hidden');
    alert("Error connecting to backend. Make sure app.py is running.");
  }
}

// prevent xss when inserting text into html

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}