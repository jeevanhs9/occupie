import smtplib
from email.message import EmailMessage

from flask import current_app


def send_action_email(recipient, subject, action_url):
    """Send a verification/reset link, or log it only in development."""
    server = current_app.config.get('MAIL_SERVER')
    if not server:
        if current_app.config.get('APP_ENV') == 'development' or current_app.testing:
            current_app.logger.warning('Email delivery is disabled; development action link: %s', action_url)
        return False

    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = current_app.config['MAIL_FROM']
    message['To'] = recipient
    message.set_content(f'Complete this action using the link below. The link expires soon.\n\n{action_url}')
    with smtplib.SMTP(server, current_app.config['MAIL_PORT'], timeout=15) as smtp:
        if current_app.config.get('MAIL_USE_TLS'):
            smtp.starttls()
        username = current_app.config.get('MAIL_USERNAME')
        password = current_app.config.get('MAIL_PASSWORD')
        if username:
            smtp.login(username, password or '')
        smtp.send_message(message)
    return True
