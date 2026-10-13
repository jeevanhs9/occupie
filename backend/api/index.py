"""
Vercel serverless function entry point for Occupie backend.
This file adapts the Flask app to run as a Vercel serverless function.
"""
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app

# Create the Flask app instance
app = create_app()

# Vercel will use this app instance
# The function handler is automatically created by @vercel/python
