#!/usr/bin/env bash
# build.sh — Runs automatically on every Render deploy
# Installs dependencies, collects static files, and migrates the database.

set -o errexit  # Exit immediately if any command fails

echo "--- Installing Python dependencies ---"
pip install -r requirements.txt

echo "--- Collecting static files (Fix 5: Whitenoise) ---"
python manage.py collectstatic --no-input

echo "--- Running database migrations ---"
python manage.py migrate

echo "--- Build complete! ---"
