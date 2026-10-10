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

1. **Create and Activate Virtual Environment in PowerShell**
   ```powershell
   cd D:\occupie\backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure Database & Environment**
   Ensure PostgreSQL is running. Open `psql` or pgAdmin and run:
   ```sql
   CREATE DATABASE occupie_db;
   ```
   
   Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
   Edit `.env` and configure `DATABASE_URL` if your PostgreSQL username/password differ.

4. **Initialize Migrations**
   ```powershell
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

5. **Run the Application**
   ```powershell
   flask run
   ```
   Access the healthcheck endpoint at: http://localhost:5000/api/health

6. **Run Tests**
   ```powershell
   pytest
   ```
