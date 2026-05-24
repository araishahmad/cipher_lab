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

// key generator — fills input with a random key
// type 'alpha' = letters only (for vigenere), 'strong' = mixed chars (for aes)

function generateKey(inputId, type) {
  let chars, length;
  if (type === 'alpha') {
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    length = 10;
  } else {
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    length = 20;
  }
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  const key = Array.from(array).map(b => chars[b % chars.length]).join('');
  document.getElementById(inputId).value = key;
}

// caesar encrypt / decrypt

async function caesarAction(action) {
  const text = document.getElementById('caesar-text').value.trim();
  const shift = parseInt(document.getElementById('caesar-shift').value);
  const outputDiv = document.getElementById('caesar-output');

  if (!text) { alert("Please enter some text."); return; }

  try {
    const res = await fetch(`${BASE_URL}/caesar/${action}`, {
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
  const key = document.getElementById('vigenere-key').value.trim();
  const outputDiv = document.getElementById('vigenere-output');

  if (!text) { alert("Please enter some text."); return; }
  if (!key) { alert("Please enter a keyword."); return; }

  try {
    const res = await fetch(`${BASE_URL}/vigenere/${action}`, {
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

// aes text encrypt / decrypt

async function aesAction(action) {
  const text = document.getElementById('aes-text').value.trim();
  const key = document.getElementById('aes-key').value.trim();
  const mode = document.querySelector('input[name="aes-mode"]:checked').value;
  const outputDiv = document.getElementById('aes-output');

  if (!text) { alert("Please enter some text."); return; }
  if (!key) { alert("Please enter a password."); return; }

  try {
    const res = await fetch(`${BASE_URL}/aes/${action}`, {
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
      ? 'Includes authentication tag — tampering will be detected on decrypt.'
      : 'Standard block chaining mode.';

    outputDiv.classList.remove('hidden');
    outputDiv.innerHTML = `
      <div class="label">Action</div><div class="value">${action.toUpperCase()}</div><br>
      <div class="label">Mode</div><div class="value">AES-256 ${mode} — ${modeNote}</div><br>
      <div class="label">Key Derivation</div><div class="value">PBKDF2 · 200,000 rounds · SHA-256 · 32-byte key</div><br>
      <div class="label">Input</div><div class="value">${escapeHtml(text)}</div><br>
      <div class="label">Output</div><div class="value">${escapeHtml(data.result)}</div>
    `;
  } catch (err) {
    alert("Error connecting to backend. Make sure app.py is running.");
  }
}

// aes file encrypt / decrypt

async function fileAction(action) {
  const fileInput = document.getElementById('aes-file');
  const key = document.getElementById('aes-key').value.trim();
  const mode = document.querySelector('input[name="aes-mode"]:checked').value;
  const outputDiv = document.getElementById('file-output');

  if (!fileInput.files.length) { alert("Please select a file."); return; }
  if (!key) { alert("Please enter a password above."); return; }

  const file = fileInput.files[0];

  // read file as base64
  const fileB64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  outputDiv.classList.remove('hidden');
  outputDiv.innerHTML = `<div class="value">Processing...</div>`;

  try {
    const endpoint = action === 'encrypt' ? '/aes/encrypt-file' : '/aes/decrypt-file';
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_data: fileB64, key, mode })
    });
    const data = await res.json();

    if (data.error) {
      outputDiv.innerHTML = `<div class="error">${data.error}</div>`;
      return;
    }

    // figure out what to name and how to type the downloaded file
    let downloadName, mimeType, content;

    if (action === 'encrypt') {
      downloadName = file.name + '.enc';
      mimeType = 'text/plain';
      content = data.result;           // base64 ciphertext as plain text
    } else {
      // try to restore original filename by removing .enc extension
      downloadName = file.name.endsWith('.enc') ? file.name.slice(0, -4) : file.name + '.dec';
      mimeType = file.name.includes('.pdf') ? 'application/pdf' : 'text/plain';
      // data.result is base64 of the original file bytes
      const byteChars = atob(data.result);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      content = new Blob([byteArray], { type: mimeType });
    }

    // trigger download
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);

    outputDiv.innerHTML = `
      <div class="label">Done</div>
      <div class="value">${action === 'encrypt' ? 'Encrypted' : 'Decrypted'} file downloaded as <b>${escapeHtml(downloadName)}</b></div><br>
      <div class="label">Original File</div><div class="value">${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)</div><br>
      <div class="label">Mode</div><div class="value">AES-256 ${mode} with PBKDF2</div>
    `;
  } catch (err) {
    outputDiv.innerHTML = `<div class="error">Error: ${err.message}</div>`;
  }
}

// rsa key generation

async function rsaGenerate() {
  const btn = event.target;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    const res = await fetch(`${BASE_URL}/rsa/generate`);
    const data = await res.json();

    document.getElementById('rsa-public-key').value = data.public_key;
    document.getElementById('rsa-private-key').value = data.private_key;
    document.getElementById('rsa-pub-input').value = data.public_key;
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
  const text = document.getElementById('rsa-text').value.trim();
  const pubKey = document.getElementById('rsa-pub-input').value.trim();
  const privKey = document.getElementById('rsa-priv-input').value.trim();
  const outputDiv = document.getElementById('rsa-output');

  if (!text) { alert("Please enter some text."); return; }
  if (action === 'encrypt' && !pubKey) { alert("Please paste a public key."); return; }
  if (action === 'decrypt' && !privKey) { alert("Please paste a private key."); return; }

  const payload = action === 'encrypt'
    ? { text, public_key: pubKey }
    : { text, private_key: privKey };

  try {
    const res = await fetch(`${BASE_URL}/rsa/${action}`, {
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

// hash functions

async function hashAction(algorithm) {
  const text = document.getElementById('hash-text').value.trim();
  const outputDiv = document.getElementById('hash-output');

  if (!text) { alert("Please enter some text."); return; }

  try {
    const res = await fetch(`${BASE_URL}/hash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, algorithm })
    });
    const data = await res.json();

    outputDiv.classList.remove('hidden');
    outputDiv.innerHTML = `
      <div class="label">Algorithm</div><div class="value">${data.algorithm} (${data.bits}-bit)</div><br>
      <div class="label">Input</div><div class="value">${escapeHtml(text)}</div><br>
      <div class="label">Hash (${data.length} hex chars)</div>
      <div class="value hash-value">${data.hash}</div><br>
      <div class="label">Note</div>
      <div class="value">This is one-way. You cannot reverse this hash back to the original text.</div>
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
    const res = await fetch(`${BASE_URL}/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    document.getElementById('attack-loading').classList.add('hidden');

    const c = data.caesar;

    // build frequency table rows
    const freqRows = Object.entries(c.freq_table)
      .map(([letter, pct]) => `<tr><td>${letter}</td><td>${pct}%</td></tr>`)
      .join('');

    document.getElementById('caesar-freq-result').innerHTML = `
      <table>
        <tr><td>Ciphertext</td><td>${escapeHtml(c.ciphertext)}</td></tr>
        <tr><td>Shift Used (hidden from attacker)</td><td>${c.shift_used}</td></tr>
        <tr><td>Top Letter Frequencies</td><td>
          <table class="freq-table">${freqRows}</table>
        </td></tr>
        <tr><td>Assumed E maps to</td><td>most frequent letter in ciphertext</td></tr>
        <tr><td>Deduced Shift</td><td>${c.deduced_shift}</td></tr>
        <tr><td>Frequency Result</td><td>${escapeHtml(c.freq_cracked)}</td></tr>
        <tr><td>Time</td><td>${c.freq_time_ms} ms</td></tr>
      </table>
      <p class="attack-note">Note: frequency analysis accuracy improves with longer text. Shorter inputs may deduce the wrong shift.</p>
    `;

    document.getElementById('caesar-bf-result').innerHTML = `
      <table>
        <tr><td>Keys Tried</td><td>26 (all possible shifts)</td></tr>
        <tr><td>Cracked Shift</td><td>${c.bf_shift}</td></tr>
        <tr><td>Cracked Text</td><td>${escapeHtml(c.bf_cracked)}</td></tr>
        <tr><td>Time</td><td>${c.bf_time_ms} ms</td></tr>
      </table>
    `;

    const d = data.aes;
    document.getElementById('aes-dict-result').innerHTML = `
      <table>
        <tr><td>Password Used</td><td><b>"${escapeHtml(d.weak_password)}"</b> (common password)</td></tr>
        <tr><td>Ciphertext</td><td>${escapeHtml(d.ciphertext)}</td></tr>
        <tr><td>Wordlist Size</td><td>${d.wordlist_size} passwords</td></tr>
        <tr><td>Cracked Password</td><td><b style="color:#b00020">"${escapeHtml(d.cracked_password)}"</b></td></tr>
        <tr><td>Decrypted Text</td><td>${escapeHtml(d.cracked_text)}</td></tr>
        <tr><td>Time</td><td>${d.time_ms} ms</td></tr>
        <tr><td>Note</td><td>${d.note}</td></tr>
      </table>
    `;

    document.getElementById('verdict-text').innerHTML = `
      <b>Takeaways:</b><br><br>
      <b>Caesar</b> — broken two ways: frequency analysis (no original needed) found the pattern in letter
      distributions; brute-force tried all 26 keys in milliseconds.<br><br>
      <b>AES + weak password</b> — AES encryption itself was never broken. The weak password "password123"
      was found in the dictionary. Strong encryption with a weak password is still vulnerable.
      Use the key generator to create passwords that won't appear in any wordlist.
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