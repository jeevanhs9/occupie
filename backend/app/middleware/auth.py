from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import jwt_required


def jwt_authenticated(view):
    """Require a valid access JWT using the application's configured locations."""
    return jwt_required()(view)


def roles_required(*allowed_roles):
    """Restrict a view to roles resolved by trusted server-side middleware."""
    accepted_roles = frozenset(allowed_roles)

    def decorate(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if getattr(g, 'occupie_role', None) not in accepted_roles:
                return jsonify(
                    error='Forbidden',
                    message='You do not have permission to perform this operation.',
                ), 403
            return view(*args, **kwargs)

        return wrapped

    return decorate
