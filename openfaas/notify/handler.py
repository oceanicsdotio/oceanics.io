from imaplib import IMAP4_SSL
from smtplib import SMTP_SSL
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from json import dumps, loads
from os import getenv
import hashlib
import hmac
from time import time


def log(message, file=None, console=True):
    # type: (str, str, bool) -> None
    """
    Write to console and/or file.

    :param message: content
    :param file: destination
    :param console: print to std out also
    :return: None
    """
    string = f"{datetime.utcnow().isoformat()} — {message}"
    if console:
        print(string)

    if file is not None:
        fid = open(file, "a")
        fid.write(string + "\n")
        fid.close()


def progressNotification(start, current, total):
    # type: (float, int, int) -> str
    """
    Format a string for progress notifications
    """
    elapsed = time() - start
    ss = int(elapsed * total / current - elapsed)
    mm = ss // 60
    hh = mm // 60
    return (
        f"Ingested {current} of {total} rows, "
        f"{hh}:{mm - hh * 60}:{ss - mm * 60} remaining"
    )


def get_latest_email():

    with open("/var/openfaas/secrets/imap-host", "r") as fid:
        mail = IMAP4_SSL(fid.read())
    with open("/var/openfaas/secrets/mail-service-key", "r") as fid:
        mail.login("data@oceanics.io", fid.read())
    mail.list()
    mail.select("inbox")
    result, data = mail.search(None, "ALL")

    ids = data[0]  # data is a list.
    id_list = ids.split()  # ids is a space separated string
    latest_email_id = id_list[-1]  # get the latest

    result, data = mail.fetch(
        latest_email_id, "(RFC822)"
    )  # fetch the email body (RFC822) for the given ID

    raw_email = data[0][1]

    for x in raw_email.split(b"\r\n"):
        print(x)


def handle(req):
    """
    Add the From: and To: headers at the start!

    '{
        "sender": "...@...",
        "subject": "..."
        "addresses": ["...@..."],
        "attachment: {
            "subtype":
            "name":
            "data":
        }
    }'

    """

    if getenv("Http_Method") != "POST":
        print(dumps({"Error": "Require POST"}))
        exit(403)

    with open("/var/openfaas/secrets/payload-secret", "r") as fid:
        secretContent = fid.read().encode()
    _hash = getenv("Http_Hmac")
    expectedMAC = hmac.new(secretContent, req.encode(), hashlib.sha1)
    if (_hash[5:] if "sha1=" in _hash else _hash) != expectedMAC.hexdigest():
        print(dumps({"Error": "HMAC validation"}))
        exit(403)

    data = loads(req)

    subject = data.get("subject", None)
    emails = data.get("addresses", (None, ))

    if not all((subject, *emails)):
        print(dumps({"Error": "Bad request"}))
        exit(403)

    sender = data.get("sender", "data@oceanics.io")
    msg = data.get("message", datetime.utcnow().isoformat())
    attachment = data.get("attachment", None)
    _emails = ','.join(emails)

    with open("/var/openfaas/secrets/smtp-host", "r") as fid:
        server = SMTP_SSL(fid.read(), port=465)
    with open("/var/openfaas/secrets/mail-service-key", "r") as fid:
        server.login("data@oceanics.io", fid.read())

    msg_root = MIMEMultipart()
    msg_root["Subject"] = subject
    msg_root["From"] = sender
    msg_root["To"] = _emails
    msg_alternative = MIMEMultipart("alternative")
    msg_root.attach(msg_alternative)
    msg_alternative.attach(MIMEText(msg))

    if attachment:
        att = MIMEApplication(attachment["data"], _subtype=attachment["subtype"])
        att.add_header("Content-Disposition", "attachment", filename=attachment["name"])
        msg_root.attach(att)

    for each in emails:
        server.sendmail(from_addr=sender, to_addrs=each, msg=msg_root.as_string())
    server.quit()

