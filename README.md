# CipherLab — Cryptography Toolkit

A cryptography toolkit that demonstrates classical and modern encryption side by side. Covers symmetric, asymmetric, and hashing — with live attack simulations that show exactly why cipher strength matters.

## Features

**Ciphers**
- Caesar Cipher — shift-based substitution with adjustable shift value
- Vigenère Cipher — polyalphabetic keyword cipher with key expansion visualization
- AES-256 — CBC and GCM modes, PBKDF2 key derivation (200,000 rounds), file encryption
- RSA-2048 — asymmetric key pair generation, public/private key encrypt and decrypt

**Hash Functions**
- MD5, SHA-256, SHA-512 with visual hash fingerprint output

**Attack Simulation**
- Frequency analysis on Caesar — no knowledge of original text required
- Brute-force on Caesar — all 26 shifts visualized in real time
- Dictionary attack on AES — demonstrates why weak passwords break strong encryption

**Key Generator**
- Cryptographically random key generation for AES and Vigenère

**Visualizations**
- Caesar: animated A→Z shift map after every operation
- Vigenère: key expansion table showing per-character shifts
- AES: encryption pipeline diagram (Plaintext → PBKDF2 → IV → AES → Ciphertext)
- RSA: asymmetric flow diagram (Sender → public key → encrypted → private key → receiver)
- Hash: color-coded hex fingerprint — changes completely with any input change
- Attack: live frequency bar chart, animated brute-force grid, and dictionary wordlist with hit/miss states

## Tech Stack

- **Backend** — Python, Flask, pycryptodome
- **Frontend** — Vanilla HTML, CSS, JavaScript

## Folder Structure

```
cipher-project/
├── backend/
│   ├── app.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## How to Run

**1. Install dependencies**
```bash
pip install flask flask-cors pycryptodome
```

**2. Start the backend**
```bash
cd backend
python app.py
```

**3. Open the frontend**

Open `frontend/index.html` in your browser. Make sure the Flask server is running on port 5000 first.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/caesar/encrypt` | Caesar encrypt |
| POST | `/caesar/decrypt` | Caesar decrypt |
| POST | `/vigenere/encrypt` | Vigenère encrypt |
| POST | `/vigenere/decrypt` | Vigenère decrypt |
| POST | `/aes/encrypt` | AES encrypt (CBC or GCM) |
| POST | `/aes/decrypt` | AES decrypt (CBC or GCM) |
| POST | `/aes/encrypt-file` | Encrypt a file |
| POST | `/aes/decrypt-file` | Decrypt a file |
| GET  | `/rsa/generate` | Generate RSA-2048 key pair |
| POST | `/rsa/encrypt` | RSA encrypt with public key |
| POST | `/rsa/decrypt` | RSA decrypt with private key |
| POST | `/hash` | Hash text with MD5, SHA-256, or SHA-512 |
| POST | `/attack` | Run frequency analysis + brute-force + dictionary attack |

## Security Concepts Covered

| Concept | Where |
|---------|-------|
| Substitution cipher | Caesar, Vigenère |
| Symmetric encryption | AES-256 |
| Asymmetric encryption | RSA-2048 |
| Block cipher modes | CBC vs GCM |
| Authenticated encryption | AES-GCM |
| Key derivation | PBKDF2 (200,000 rounds, SHA-256) |
| Initialization vector | AES CBC/GCM |
| One-way hashing | MD5, SHA-256, SHA-512 |
| Frequency analysis | Attack simulation |
| Brute-force attack | Attack simulation |
| Dictionary attack | Attack simulation |