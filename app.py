from flask import Flask, jsonify
from flask_cors import CORS
import imaplib
import email
from email.header import decode_header
import os

# --------------------------
# Flask App Setup
# --------------------------
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "static/emails"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --------------------------
# Email Credentials
# --------------------------
EMAIL_HOST = "imap.gmail.com"       # Gmail IMAP server
EMAIL_PORT = 993
EMAIL_USER = "studentkmrl@gmail.com"
EMAIL_PASS = "latn oqgl tvew vffa"  # ⚠ Use Gmail App Password (not your normal password)


# --------------------------
# Fetch All Emails Function
# --------------------------
def fetch_all_emails(limit=5):
    """Fetch latest emails (read + unread) and save attachments"""
    messages = []
    try:
        # Connect to IMAP
        mail = imaplib.IMAP4_SSL(EMAIL_HOST, EMAIL_PORT)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("INBOX")

        # Search for ALL emails
        status, data = mail.search(None, "ALL")
        if status != "OK":
            return []

        email_ids = data[0].split()[-limit:]  # last N emails

        for num in reversed(email_ids):
            status, msg_data = mail.fetch(num, "(RFC822)")
            if status != "OK":
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)

            # Decode subject safely
            subject_data = decode_header(msg.get("Subject"))
            subject, encoding = subject_data[0] if subject_data else ("(No Subject)", None)
            if isinstance(subject, bytes):
                subject = subject.decode(encoding or "utf-8", errors="ignore")

            attachments = []
            if msg.is_multipart():
                for part in msg.walk():
                    content_disposition = str(part.get("Content-Disposition") or "")
                    if "attachment" in content_disposition:
                        filename_data = decode_header(part.get_filename())
                        filename, enc = filename_data[0] if filename_data else ("file.bin", None)
                        if isinstance(filename, bytes):
                            filename = filename.decode(enc or "utf-8", errors="ignore")

                        # Save attachment
                        filepath = os.path.join(UPLOAD_FOLDER, filename)
                        with open(filepath, "wb") as f:
                            f.write(part.get_payload(decode=True))

                        attachments.append({
                            "filename": filename,
                            "subject": subject,
                            "downloadUrl": f"http://127.0.0.1:5000/static/emails/{filename}"
                        })

            if attachments:
                messages.extend(attachments)
            else:
                # Add subject even if no attachment
                messages.append({
                    "subject": subject,
                    "filename": None,
                    "downloadUrl": None
                })

        mail.logout()
        return messages

    except Exception as e:
        print("⚠ Email fetch error:", e)
        return []


# --------------------------
# API Endpoint
# --------------------------
@app.route("/check_emails", methods=["GET"])
def check_emails():
    """API endpoint to fetch latest email attachments (read + unread)"""
    messages = fetch_all_emails(limit=10)
    return jsonify({"messages": messages})


# --------------------------
# Run App
# --------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
