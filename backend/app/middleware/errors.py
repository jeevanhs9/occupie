from flask import jsonify


def register_error_handlers(app):
    """Registers standard JSON error responders across the application."""

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': getattr(error, 'description', 'The request could not be understood or was missing parameters.'),
            'status_code': 400,
            'service': 'occupie-api',
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Resource Not Found',
            'message': getattr(error, 'description', 'The requested endpoint does not exist.'),
            'status_code': 404,
            'service': 'occupie-api',
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'error': 'Method Not Allowed',
            'message': getattr(error, 'description', 'The HTTP method is not supported for this endpoint.'),
            'status_code': 405,
            'service': 'occupie-api',
        }), 405

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected server error occurred. Please contact engineering support.',
            'status_code': 500,
            'service': 'occupie-api',
        }), 500
