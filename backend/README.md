# Occupie Backend

This is the backend for Occupie: Adaptive Seating Intelligence for Smart Restaurants.

## Technologies Used
- Python 3.11+
- Flask
- PostgreSQL
- SQLAlchemy
- Flask-Migrate
- Pytest

## Milestone 1 Setup on Windows

### Prerequisites
- Python 3.11 installed
- PostgreSQL installed and running locally

### Getting Started

1. **Create and Activate Virtual Environment in PowerShell** (skip if `backend/venv` already exists)
   ```powershell
   cd E:\Occupie\backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure Database & Environment**
   For PostgreSQL, ensure it is running and create the database in `psql` or pgAdmin:
   ```sql
   CREATE DATABASE occupie_db;
   ```
   
   Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
   Edit `.env` and configure `DATABASE_URL`. When it is blank, development uses the existing SQLite file at `backend/instance/occupie_dev.db`.

4. **Apply Migrations**
   The repository already contains its migration history. Apply it with:
   ```powershell
   flask db upgrade
   ```
   Create a new migration only when a model/schema change requires one.

5. **Run the Application**
   ```powershell
   .\venv\Scripts\python.exe run.py
   ```
   Access the healthcheck endpoint at: http://localhost:5000/api/health

6. **Run Tests**
   ```powershell
   pytest
   ```
