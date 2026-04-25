"""Input handling: build a Mail from .eml / .msg / loose attachment files."""
from .file_types import detect_file_type
from .mail import Mail, MailData, mail_from_file, parse_mail

__all__ = [
    "detect_file_type",
    "parse_mail",
    "mail_from_file",
    "Mail",
    "MailData",
]
