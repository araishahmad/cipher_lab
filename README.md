# Cipher Comparison Tool — Caesar vs AES

A mini cryptography project that demonstrates the difference between a weak classical cipher and a modern encryption standard.

## What it does

- **Caesar Cipher** — encrypt and decrypt text using a shift key
- **AES-128 CBC** — encrypt and decrypt text using a secret key
- **Attack Simulation** — brute-forces both ciphers and shows how Caesar gets cracked instantly while AES holds up

## Tech Stack

- **Backend** — Python, Flask
- **Frontend** — HTML, CSS, JavaScript

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

Just open `frontend/index.html` in your browser. Make sure the Flask server is running first.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/caesar/encrypt` | Encrypt text with Caesar cipher |
| POST | `/caesar/decrypt` | Decrypt text with Caesar cipher |
| POST | `/aes/encrypt` | Encrypt text with AES-128 CBC |
| POST | `/aes/decrypt` | Decrypt text with AES-128 CBC |
| POST | `/attack` | Run brute-force simulation on both ciphers |

## Key Difference

Caesar only has 26 possible keys — it can be cracked by trying every shift in milliseconds. AES has a key space of 2¹²⁸ (~3.4 × 10³⁸ possible keys), making brute-force completely infeasible with current technology.

---