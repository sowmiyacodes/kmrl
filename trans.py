import os
import imaplib
import email
from email.header import decode_header
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import pytesseract
import pymupdf
from deep_translator import GoogleTranslator

# ---------- Tesseract Path ----------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ---------- App ----------
app = Flask(__name__)
CORS(app)

# ---------- Folders ----------
UPLOAD_FOLDER = "uploads"
ORIGINAL_FOLDER = os.path.join("outputs", "original")
TRANSLATED_FOLDER = os.path.join("outputs", "translated")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ORIGINAL_FOLDER, exist_ok=True)
os.makedirs(TRANSLATED_FOLDER, exist_ok=True)

# ---------- Email Settings ----------
IMAP_SERVER = "imap.gmail.com"
EMAIL_ACCOUNT = "studentkmrl@gmail.com"
APP_PASSWORD = "latn oqgl tvew vffa"

# ---------- Helper Functions ----------
def extract_text(filepath):
    text = ""
    try:
        if filepath.lower().endswith(".pdf"):
            with pymupdf.open(filepath) as pdf:
                for page in pdf:
                    page_text = page.get_text()
                    if page_text.strip():
                        text += page_text + "\n"
                    else:
                        # Use OCR with both native language + English
                        pix = page.get_pixmap()
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        lang = "eng"
                        if "tamil" in filepath.lower():
                            lang = "tam+eng"
                        elif "malayalam" in filepath.lower():
                            lang = "mal+eng"
                        text += pytesseract.image_to_string(img, lang=lang) + "\n"
        elif filepath.lower().endswith((".png", ".jpg", ".jpeg")):
            lang = "eng"
            if "tamil" in filepath.lower():
                lang = "tam+eng"
            elif "malayalam" in filepath.lower():
                lang = "mal+eng"
            text = pytesseract.image_to_string(Image.open(filepath), lang=lang)
        elif filepath.lower().endswith(".txt"):
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            text = "Unsupported file format"
    except Exception as e:
        text = f"OCR/Read Error: {str(e)}"

    # Clean text
    text = text.replace("\x0c", "").strip()
    return text


def save_text(text, folder, filename):
    """Save text as .txt in the given folder"""
    base, _ = os.path.splitext(filename)
    path = os.path.join(folder, base + ".txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return os.path.basename(path)


def translate_if_needed(text, filename):
    lang_code = "en"
    if "malayalam" in filename.lower():
        lang_code = "ml"
    elif "tamil" in filename.lower():
        lang_code = "ta"

    translated_text = ""
    translated_file = None
    if lang_code != "en" and text.strip():
        try:
            translated_text = GoogleTranslator(source=lang_code, target="en").translate(text)
            translated_file = save_text(translated_text, TRANSLATED_FOLDER, filename)
        except Exception as e:
            translated_text = f"Translation Error: {str(e)}"

    return translated_text, translated_file
# ---------- Upload Route ----------
@app.route("/ocr", methods=["POST"])
def ocr_endpoint():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    # Extract text safely
    text = extract_text(filepath)
    original_file = save_text(text, ORIGINAL_FOLDER, filename)
    translated_text, translated_file = translate_if_needed(text, filename)

    return jsonify({
        "original": text,
        "translated": translated_text,
        "original_file": original_file,
        "translated_file": translated_file
    })

# ---------- Email Fetch ----------
def fetch_unread_emails():
    notifications = {"processed": 0, "unsupported_files": [], "messages": []}
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_ACCOUNT, APP_PASSWORD)
        mail.select("inbox")

        status, messages = mail.search(None, 'UNSEEN')
        email_ids = messages[0].split()

        if not email_ids:
            notifications["messages"].append("✅ No new emails.")
            mail.logout()
            return notifications

        for email_id in email_ids:
            status, msg_data = mail.fetch(email_id, "(RFC822)")
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            subject, encoding = decode_header(msg["Subject"])[0]
            if isinstance(subject, bytes):
                subject = subject.decode(encoding if encoding else "utf-8")

            for part in msg.walk():
                if part.get_content_disposition() == "attachment":
                    filename = part.get_filename()
                    if not filename:
                        continue
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    with open(filepath, "wb") as f:
                        f.write(part.get_payload(decode=True))

                    # Extract and save text
                    if filename.lower().endswith((".png", ".jpg", ".jpeg", ".txt", ".pdf")):
                        text = extract_text(filepath)
                        save_text(text, ORIGINAL_FOLDER, filename)
                        translate_if_needed(text, filename)
                        notifications["processed"] += 1
                        notifications["messages"].append(f"📩 '{subject}' processed: {filename}")
                    else:
                        notifications["unsupported_files"].append(filename)

        mail.logout()
    except Exception as e:
        notifications["messages"].append(f"Email fetch error: {str(e)}")

    return notifications

@app.route("/check_emails", methods=["GET"])
def check_emails():
    return jsonify(fetch_unread_emails())

# ---------- Download Route ----------
@app.route("/download/<folder>/<filename>", methods=["GET"])
def download_file(folder, filename):
    folder_path = ORIGINAL_FOLDER if folder=="original" else TRANSLATED_FOLDER
    file_path = os.path.join(folder_path, filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return jsonify({"error": "File not found"}), 404

# ---------- Run ----------
if __name__ == "__main__":
    app.run(port=5001, debug=True)
