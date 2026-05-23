from flask import Flask, request, jsonify
from flask_cors import CORS
from Crypto.Cipher import AES
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Util.Padding import pad, unpad
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256
import base64
import time
import os

app = Flask(__name__)
CORS(app)

# caesar cipher functions

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

# vigenere cipher functions

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

# aes functions — supports CBC and GCM modes, uses PBKDF2 for key derivation

def derive_key(password, salt):
    # PBKDF2 turns the user's password into a proper 32-byte cryptographic key
    # 200,000 iterations makes brute-forcing the password very slow
    return PBKDF2(password, salt, dkLen=32, count=200000, prf=lambda p, s: SHA256.new(p + s).digest())

def aes_encrypt(plaintext, password, mode):
    salt = os.urandom(16)           # random salt for PBKDF2
    key  = derive_key(password.encode('utf-8'), salt)

    if mode == 'GCM':
        nonce  = os.urandom(16)
        cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))
        # pack: salt + nonce + tag + ciphertext
        packed = salt + nonce + tag + ciphertext

    else:  # CBC
        iv     = os.urandom(16)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        ciphertext = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))
        # pack: salt + iv + ciphertext
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
        # verify_and_decrypt raises ValueError if the message was tampered with
        decrypted  = cipher.decrypt_and_verify(ciphertext, tag)

    else:  # CBC
        iv         = raw[16:32]
        ciphertext = raw[32:]
        cipher     = AES.new(key, AES.MODE_CBC, iv)
        decrypted  = unpad(cipher.decrypt(ciphertext), AES.block_size)

    return decrypted.decode('utf-8')

# rsa functions

def rsa_generate_keys():
    key = RSA.generate(2048)
    private_key = key.export_key().decode('utf-8')
    public_key  = key.publickey().export_key().decode('utf-8')
    return public_key, private_key

def rsa_encrypt(plaintext, public_key_pem):
    key    = RSA.import_key(public_key_pem)
    cipher = PKCS1_OAEP.new(key)
    encrypted = cipher.encrypt(plaintext.encode('utf-8'))
    return base64.b64encode(encrypted).decode('utf-8')

def rsa_decrypt(ciphertext_b64, private_key_pem):
    key    = RSA.import_key(private_key_pem)
    cipher = PKCS1_OAEP.new(key)
    decrypted = cipher.decrypt(base64.b64decode(ciphertext_b64))
    return decrypted.decode('utf-8')

# caesar routes

@app.route('/caesar/encrypt', methods=['POST'])
def route_caesar_encrypt():
    data  = request.json
    text  = data.get('text', '')
    shift = int(data.get('shift', 3))
    return jsonify({'result': caesar_encrypt(text, shift)})

@app.route('/caesar/decrypt', methods=['POST'])
def route_caesar_decrypt():
    data  = request.json
    text  = data.get('text', '')
    shift = int(data.get('shift', 3))
    return jsonify({'result': caesar_decrypt(text, shift)})

# vigenere routes

@app.route('/vigenere/encrypt', methods=['POST'])
def route_vigenere_encrypt():
    data = request.json
    text = data.get('text', '')
    key  = data.get('key', '')
    if not key or not key.isalpha():
        return jsonify({'error': 'Key must contain letters only.'}), 400
    return jsonify({'result': vigenere_encrypt(text, key)})

@app.route('/vigenere/decrypt', methods=['POST'])
def route_vigenere_decrypt():
    data = request.json
    text = data.get('text', '')
    key  = data.get('key', '')
    if not key or not key.isalpha():
        return jsonify({'error': 'Key must contain letters only.'}), 400
    return jsonify({'result': vigenere_decrypt(text, key)})

# aes routes

@app.route('/aes/encrypt', methods=['POST'])
def route_aes_encrypt():
    data     = request.json
    text     = data.get('text', '')
    password = data.get('key', '')
    mode     = data.get('mode', 'CBC').upper()
    if mode not in ('CBC', 'GCM'):
        return jsonify({'error': 'Mode must be CBC or GCM.'}), 400
    result = aes_encrypt(text, password, mode)
    return jsonify({'result': result})

@app.route('/aes/decrypt', methods=['POST'])
def route_aes_decrypt():
    data     = request.json
    text     = data.get('text', '')
    password = data.get('key', '')
    mode     = data.get('mode', 'CBC').upper()
    if mode not in ('CBC', 'GCM'):
        return jsonify({'error': 'Mode must be CBC or GCM.'}), 400
    try:
        result = aes_decrypt(text, password, mode)
        return jsonify({'result': result})
    except ValueError:
        # GCM raises ValueError if the tag doesn't match (tampered message)
        return jsonify({'error': 'Decryption failed. Wrong password or message was tampered with.'}), 400
    except Exception:
        return jsonify({'error': 'Decryption failed. Wrong password or corrupted ciphertext.'}), 400

# rsa routes

@app.route('/rsa/generate', methods=['GET'])
def route_rsa_generate():
    public_key, private_key = rsa_generate_keys()
    return jsonify({'public_key': public_key, 'private_key': private_key})

@app.route('/rsa/encrypt', methods=['POST'])
def route_rsa_encrypt():
    data       = request.json
    text       = data.get('text', '')
    public_key = data.get('public_key', '')
    if not public_key:
        return jsonify({'error': 'Public key is required.'}), 400
    try:
        result = rsa_encrypt(text, public_key)
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': 'Encryption failed. Check your public key.'}), 400

@app.route('/rsa/decrypt', methods=['POST'])
def route_rsa_decrypt():
    data        = request.json
    text        = data.get('text', '')
    private_key = data.get('private_key', '')
    if not private_key:
        return jsonify({'error': 'Private key is required.'}), 400
    try:
        result = rsa_decrypt(text, private_key)
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': 'Decryption failed. Wrong private key or corrupted ciphertext.'}), 400

# attack simulation route

@app.route('/attack', methods=['POST'])
def route_attack():
    data      = request.json
    plaintext = data.get('text', 'Hello')

    # brute force caesar - just try all 26 shifts
    shift = 7
    caesar_ciphertext = caesar_encrypt(plaintext, shift)

    start = time.time()
    caesar_cracked_shift = None
    caesar_cracked_text  = None

    for s in range(26):
        attempt = caesar_decrypt(caesar_ciphertext, s)
        if attempt.lower() == plaintext.lower():
            caesar_cracked_shift = s
            caesar_cracked_text  = attempt
            break

    caesar_time = round((time.time() - start) * 1000, 4)

    # brute force aes - try 1000 random passwords, none will work
    aes_ciphertext = aes_encrypt(plaintext, 'mySecretPassword', 'CBC')

    start    = time.time()
    attempts = 1000
    cracked  = False

    for _ in range(attempts):
        random_password = base64.b64encode(os.urandom(12)).decode('utf-8')[:16]
        try:
            result = aes_decrypt(aes_ciphertext, random_password, 'CBC')
            if result == plaintext:
                cracked = True
                break
        except Exception:
            pass

    aes_time = round((time.time() - start) * 1000, 4)

    return jsonify({
        'caesar': {
            'ciphertext':    caesar_ciphertext,
            'shift_used':    shift,
            'cracked_shift': caesar_cracked_shift,
            'cracked_text':  caesar_cracked_text,
            'time_ms':       caesar_time,
            'keys_tried':    26,
            'verdict':       'WEAK – cracked instantly by trying all 26 shifts'
        },
        'aes': {
            'ciphertext':  aes_ciphertext[:40] + '...',
            'keys_tried':  attempts,
            'cracked':     cracked,
            'time_ms':     aes_time,
            'total_keys':  '2^256 ≈ 1.15 × 10^77',
            'verdict':     'STRONG – brute-force is computationally infeasible'
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)