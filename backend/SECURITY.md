# Security Overview

The Occupie backend implements the following security measures:

1. **Authentication**: JWT-based authentication via `Flask-JWT-Extended` with hashed passwords using `pbkdf2:sha256`.
2. **Rate Limiting**: `Flask-Limiter` protects endpoints from brute force and denial of service attacks.
3. **CORS**: `Flask-CORS` restricts cross-origin access to authorized domains.
4. **Input Validation**: Sanitized inputs and SQLAlchemy protections against SQL injection.
5. **Configuration**: Secrets are managed via environment variables. Ensure `.env` is never committed to version control.
