from flask import Flask, request, jsonify
from flask_cors import CORS
from Crypto.Cipher import AES
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Util.Padding import pad, unpad
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256
import hashlib
import base64
import time
import os

app = Flask(__name__)
CORS(app)

# common weak passwords used for the dictionary attack demo
COMMON_PASSWORDS = [
    "123456", "password", "123456789", "12345678", "12345", "1234567",
    "password1", "1234567890", "abc123", "qwerty", "111111", "iloveyou",
    "admin", "letmein", "monkey", "1234", "dragon", "master", "sunshine",
    "princess", "welcome", "shadow", "superman", "michael", "football",
    "baseball", "batman", "trustno1", "hello", "charlie", "donald",
    "password123", "qwerty123", "passw0rd", "admin123", "login", "test",
    "guest", "root", "secret", "changeme", "access", "summer", "winter",
    "whatever", "nothing", "hunter2", "letmein1", "pass123", "pass1234"
]

# ── caesar ──────────────────────────────────────────────────

def caesar_encrypt(text, shift):
    result = ""
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - base + shift) % 26 + base)
        else:
            result += char
    return result

def caesar_decrypt(text, shift):
    return caesar_encrypt(text, -shift)

# ── vigenere ─────────────────────────────────────────────────

def vigenere_encrypt(text, key):
    result = ""
    key = key.upper()
    key_index = 0
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            shift = ord(key[key_index % len(key)]) - ord('A')
            result += chr((ord(char) - base + shift) % 26 + base)
            key_index += 1
        else:
            result += char
    return result

def vigenere_decrypt(text, key):
    result = ""
    key = key.upper()
    key_index = 0
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            shift = ord(key[key_index % len(key)]) - ord('A')
            result += chr((ord(char) - base - shift) % 26 + base)
            key_index += 1
        else:
            result += char
    return result

# ── aes (normal use) — PBKDF2 with 200,000 rounds ────────────

def derive_key(password, salt):
    # 200,000 rounds makes brute-forcing the password very expensive
    return PBKDF2(password, salt, dkLen=32, count=200000,
                  prf=lambda p, s: SHA256.new(p + s).digest())

def aes_encrypt(plaintext, password, mode):
    salt = os.urandom(16)
    key  = derive_key(password.encode('utf-8'), salt)

    if mode == 'GCM':
        nonce  = os.urandom(16)
        cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))
        packed = salt + nonce + tag + ciphertext
    else:
        iv     = os.urandom(16)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        ciphertext = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))
        packed = salt + iv + ciphertext

    return base64.b64encode(packed).decode('utf-8')

def aes_decrypt(ciphertext_b64, password, mode):
    raw  = base64.b64decode(ciphertext_b64)
    salt = raw[:16]
    key  = derive_key(password.encode('utf-8'), salt)

    if mode == 'GCM':
        nonce      = raw[16:32]
        tag        = raw[32:48]
        ciphertext = raw[48:]
        cipher     = AES.new(key, AES.MODE_GCM, nonce=nonce)
        decrypted  = cipher.decrypt_and_verify(ciphertext, tag)
    else:
        iv         = raw[16:32]
        ciphertext = raw[32:]
        cipher     = AES.new(key, AES.MODE_CBC, iv)
        decrypted  = unpad(cipher.decrypt(ciphertext), AES.block_size)

    return decrypted.decode('utf-8')

# ── aes for files — same as above but works on raw bytes ─────

def aes_encrypt_bytes(file_bytes, password, mode):
    # encode the raw bytes as base64 string then encrypt that string
    b64_data = base64.b64encode(file_bytes).decode('utf-8')
    return aes_encrypt(b64_data, password, mode)

def aes_decrypt_bytes(ciphertext_b64, password, mode):
    b64_data = aes_decrypt(ciphertext_b64, password, mode)
    return base64.b64decode(b64_data)

# ── aes for dictionary attack demo — low rounds so demo is fast ──

def derive_key_fast(password, salt):
    # 1000 rounds only — used for the attack demo so it doesn't take minutes
    # real PBKDF2 at 200,000 rounds would make 50 attempts take ~60 seconds
    return PBKDF2(password, salt, dkLen=32, count=1000,
                  prf=lambda p, s: SHA256.new(p + s).digest())

def aes_encrypt_attack_demo(plaintext, password):
    salt = os.urandom(16)
    key  = derive_key_fast(password.encode('utf-8'), salt)
    iv   = os.urandom(16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))
    return base64.b64encode(salt + iv + encrypted).decode('utf-8')

def aes_decrypt_attack_demo(ciphertext_b64, password):
    raw  = base64.b64decode(ciphertext_b64)
    salt = raw[:16]
    iv   = raw[16:32]
    enc  = raw[32:]
    key  = derive_key_fast(password.encode('utf-8'), salt)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return unpad(cipher.decrypt(enc), AES.block_size).decode('utf-8')

# ── rsa ───────────────────────────────────────────────────────

def rsa_generate_keys():
    key = RSA.generate(2048)
    return key.publickey().export_key().decode('utf-8'), key.export_key().decode('utf-8')

def rsa_encrypt(plaintext, public_key_pem):
    cipher = PKCS1_OAEP.new(RSA.import_key(public_key_pem))
    return base64.b64encode(cipher.encrypt(plaintext.encode('utf-8'))).decode('utf-8')

def rsa_decrypt(ciphertext_b64, private_key_pem):
    cipher = PKCS1_OAEP.new(RSA.import_key(private_key_pem))
    return cipher.decrypt(base64.b64decode(ciphertext_b64)).decode('utf-8')

# ── frequency analysis ────────────────────────────────────────

def frequency_analysis_attack(ciphertext):
    freq = {}
    total = 0
    for char in ciphertext.upper():
        if char.isalpha():
            freq[char] = freq.get(char, 0) + 1
            total += 1

    if not freq:
        return None, None, {}

    most_common = max(freq, key=freq.get)

    # assume the most common letter in ciphertext maps to 'E' (most common in English)
    deduced_shift = (ord(most_common) - ord('E')) % 26
    cracked = caesar_decrypt(ciphertext, deduced_shift)

    # top 8 letters by frequency for display
    freq_pct = {k: round(v / total * 100, 1)
                for k, v in sorted(freq.items(), key=lambda x: -x[1])[:8]}

    return deduced_shift, cracked, freq_pct

# ════════════════════════════════════════════════════════════
# routes
# ════════════════════════════════════════════════════════════

@app.route('/caesar/encrypt', methods=['POST'])
def route_caesar_encrypt():
    data = request.json
    return jsonify({'result': caesar_encrypt(data.get('text', ''), int(data.get('shift', 3)))})

@app.route('/caesar/decrypt', methods=['POST'])
def route_caesar_decrypt():
    data = request.json
    return jsonify({'result': caesar_decrypt(data.get('text', ''), int(data.get('shift', 3)))})

@app.route('/vigenere/encrypt', methods=['POST'])
def route_vigenere_encrypt():
    data = request.json
    key  = data.get('key', '')
    if not key or not key.isalpha():
        return jsonify({'error': 'Key must contain letters only.'}), 400
    return jsonify({'result': vigenere_encrypt(data.get('text', ''), key)})

@app.route('/vigenere/decrypt', methods=['POST'])
def route_vigenere_decrypt():
    data = request.json
    key  = data.get('key', '')
    if not key or not key.isalpha():
        return jsonify({'error': 'Key must contain letters only.'}), 400
    return jsonify({'result': vigenere_decrypt(data.get('text', ''), key)})

@app.route('/aes/encrypt', methods=['POST'])
def route_aes_encrypt():
    data = request.json
    mode = data.get('mode', 'CBC').upper()
    if mode not in ('CBC', 'GCM'):
        return jsonify({'error': 'Mode must be CBC or GCM.'}), 400
    return jsonify({'result': aes_encrypt(data.get('text', ''), data.get('key', ''), mode)})

@app.route('/aes/decrypt', methods=['POST'])
def route_aes_decrypt():
    data = request.json
    mode = data.get('mode', 'CBC').upper()
    if mode not in ('CBC', 'GCM'):
        return jsonify({'error': 'Mode must be CBC or GCM.'}), 400
    try:
        return jsonify({'result': aes_decrypt(data.get('text', ''), data.get('key', ''), mode)})
    except ValueError:
        return jsonify({'error': 'Decryption failed. Wrong password or message was tampered with.'}), 400
    except Exception:
        return jsonify({'error': 'Decryption failed. Wrong password or corrupted ciphertext.'}), 400

@app.route('/aes/encrypt-file', methods=['POST'])
def route_aes_encrypt_file():
    data     = request.json
    file_b64 = data.get('file_data', '')
    password = data.get('key', '')
    mode     = data.get('mode', 'CBC').upper()
    if not file_b64 or not password:
        return jsonify({'error': 'File data and password are required.'}), 400
    try:
        file_bytes = base64.b64decode(file_b64)
        encrypted  = aes_encrypt_bytes(file_bytes, password, mode)
        return jsonify({'result': encrypted})
    except Exception as e:
        return jsonify({'error': 'File encryption failed.'}), 400

@app.route('/aes/decrypt-file', methods=['POST'])
def route_aes_decrypt_file():
    data      = request.json
    encrypted = data.get('file_data', '')
    password  = data.get('key', '')
    mode      = data.get('mode', 'CBC').upper()
    if not encrypted or not password:
        return jsonify({'error': 'File data and password are required.'}), 400
    try:
        file_bytes = aes_decrypt_bytes(encrypted, password, mode)
        return jsonify({'result': base64.b64encode(file_bytes).decode('utf-8')})
    except ValueError:
        return jsonify({'error': 'Decryption failed. Wrong password or tampered file.'}), 400
    except Exception:
        return jsonify({'error': 'Decryption failed.'}), 400

@app.route('/rsa/generate', methods=['GET'])
def route_rsa_generate():
    pub, priv = rsa_generate_keys()
    return jsonify({'public_key': pub, 'private_key': priv})

@app.route('/rsa/encrypt', methods=['POST'])
def route_rsa_encrypt():
    data = request.json
    if not data.get('public_key'):
        return jsonify({'error': 'Public key is required.'}), 400
    try:
        return jsonify({'result': rsa_encrypt(data.get('text', ''), data['public_key'])})
    except Exception:
        return jsonify({'error': 'Encryption failed. Check your public key.'}), 400

@app.route('/rsa/decrypt', methods=['POST'])
def route_rsa_decrypt():
    data = request.json
    if not data.get('private_key'):
        return jsonify({'error': 'Private key is required.'}), 400
    try:
        return jsonify({'result': rsa_decrypt(data.get('text', ''), data['private_key'])})
    except Exception:
        return jsonify({'error': 'Decryption failed. Wrong private key or corrupted ciphertext.'}), 400

@app.route('/hash', methods=['POST'])
def route_hash():
    data = request.json
    text = data.get('text', '')
    alg  = data.get('algorithm', 'SHA256')
    if alg == 'MD5':
        result = hashlib.md5(text.encode('utf-8')).hexdigest()
        bits   = 128
    elif alg == 'SHA256':
        result = hashlib.sha256(text.encode('utf-8')).hexdigest()
        bits   = 256
    elif alg == 'SHA512':
        result = hashlib.sha512(text.encode('utf-8')).hexdigest()
        bits   = 512
    else:
        return jsonify({'error': 'Unsupported algorithm.'}), 400
    return jsonify({'hash': result, 'algorithm': alg, 'bits': bits, 'length': len(result)})

@app.route('/attack', methods=['POST'])
def route_attack():
    data      = request.json
    plaintext = data.get('text', 'Hello World')

    # caesar — encrypt with shift 11 then run frequency analysis (no knowledge of original)
    shift = 11
    caesar_ciphertext = caesar_encrypt(plaintext, shift)

    start = time.time()
    deduced_shift, freq_cracked, freq_table = frequency_analysis_attack(caesar_ciphertext)
    freq_time = round((time.time() - start) * 1000, 4)

    # also run brute force to compare
    start = time.time()
    bf_shift, bf_cracked = None, None
    for s in range(26):
        attempt = caesar_decrypt(caesar_ciphertext, s)
        if attempt.lower() == plaintext.lower():
            bf_shift  = s
            bf_cracked = attempt
            break
    bf_time = round((time.time() - start) * 1000, 4)

    # aes — encrypt with weak password "password123" (in the wordlist)
    weak_password  = "password123"
    aes_ciphertext = aes_encrypt_attack_demo(plaintext, weak_password)

    start   = time.time()
    cracked_password = None
    cracked_text     = None

    for pwd in COMMON_PASSWORDS:
        try:
            result = aes_decrypt_attack_demo(aes_ciphertext, pwd)
            if result == plaintext:
                cracked_password = pwd
                cracked_text     = result
                break
        except Exception:
            pass

    dict_time = round((time.time() - start) * 1000, 4)

    return jsonify({
        'caesar': {
            'ciphertext':      caesar_ciphertext,
            'shift_used':      shift,
            'freq_table':      freq_table,
            'deduced_shift':   deduced_shift,
            'freq_cracked':    freq_cracked,
            'freq_time_ms':    freq_time,
            'bf_shift':        bf_shift,
            'bf_cracked':      bf_cracked,
            'bf_time_ms':      bf_time,
        },
        'aes': {
            'ciphertext':        aes_ciphertext[:48] + '...',
            'weak_password':     weak_password,
            'wordlist_size':     len(COMMON_PASSWORDS),
            'cracked_password':  cracked_password,
            'cracked_text':      cracked_text,
            'time_ms':           dict_time,
            'note':              'Demo uses 1,000 PBKDF2 rounds. Real systems use 200,000 — making each attempt ~200x slower.',
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)