from flask import Flask, request, jsonify
from flask_cors import CORS
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
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

# aes cipher functions
def aes_encrypt(plaintext, key):
    key_bytes = key.encode('utf-8')
    key_bytes = key_bytes[:16].ljust(16, b'0')  # make sure key is exactly 16 bytes

    iv = os.urandom(16)  # new random iv every time
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))

    # store iv with the ciphertext so we can decrypt later
    return base64.b64encode(iv + encrypted).decode('utf-8')

def aes_decrypt(ciphertext_b64, key):
    key_bytes = key.encode('utf-8')
    key_bytes = key_bytes[:16].ljust(16, b'0')

    raw = base64.b64decode(ciphertext_b64)
    iv = raw[:16]
    encrypted = raw[16:]

    cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
    decrypted = unpad(cipher.decrypt(encrypted), AES.block_size)
    return decrypted.decode('utf-8')

# caesar routes
@app.route('/caesar/encrypt', methods=['POST'])
def route_caesar_encrypt():
    data = request.json
    text  = data.get('text', '')
    shift = int(data.get('shift', 3))
    result = caesar_encrypt(text, shift)
    return jsonify({'result': result})

@app.route('/caesar/decrypt', methods=['POST'])
def route_caesar_decrypt():
    data = request.json
    text  = data.get('text', '')
    shift = int(data.get('shift', 3))
    result = caesar_decrypt(text, shift)
    return jsonify({'result': result})

# vigenere routes
@app.route('/vigenere/encrypt', methods=['POST'])
def route_vigenere_encrypt():
    data = request.json
    text = data.get('text', '')
    key  = data.get('key', '')
    if not key:
        return jsonify({'error': 'Key is required.'}), 400
    if not key.isalpha():
        return jsonify({'error': 'Key must contain only letters.'}), 400
    result = vigenere_encrypt(text, key)
    return jsonify({'result': result})

@app.route('/vigenere/decrypt', methods=['POST'])
def route_vigenere_decrypt():
    data = request.json
    text = data.get('text', '')
    key  = data.get('key', '')
    if not key:
        return jsonify({'error': 'Key is required.'}), 400
    if not key.isalpha():
        return jsonify({'error': 'Key must contain only letters.'}), 400
    result = vigenere_decrypt(text, key)
    return jsonify({'result': result})

# aes routes
@app.route('/aes/encrypt', methods=['POST'])
def route_aes_encrypt():
    data = request.json
    text = data.get('text', '')
    key  = data.get('key', 'defaultkey12345!')
    result = aes_encrypt(text, key)
    return jsonify({'result': result})

@app.route('/aes/decrypt', methods=['POST'])
def route_aes_decrypt():
    data = request.json
    text = data.get('text', '')
    key  = data.get('key', 'defaultkey12345!')
    try:
        result = aes_decrypt(text, key)
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': 'Decryption failed. Wrong key or corrupted ciphertext.'}), 400

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

    # brute force aes - try 1000 random keys, none will work
    aes_key        = 'mySecretKey123!!'
    aes_ciphertext = aes_encrypt(plaintext, aes_key)

    start = time.time()
    attempts = 1000
    cracked  = False

    for _ in range(attempts):
        random_key = base64.b64encode(os.urandom(12)).decode('utf-8')[:16]
        try:
            result = aes_decrypt(aes_ciphertext, random_key)
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
            'total_keys':  '2^128 ≈ 3.4 × 10^38',
            'verdict':     'STRONG – brute-force is computationally infeasible'
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)