# Database Recovery Procedure

## Backup
Use `pg_dump` to take a consistent snapshot of your database:
```powershell
pg_dump -U username -d occupie_db > backup.sql
```

## Restore
To restore to a new database instance:
```powershell
# Create the new database
createdb -U username new_occupie_db

# Restore the dump
psql -U username -d new_occupie_db < backup.sql
```
Replace `username` with your PostgreSQL username.
