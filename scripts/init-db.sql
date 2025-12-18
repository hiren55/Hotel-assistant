-- Initialize Hotel Assistant Database
-- This script runs when the PostgreSQL container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create development user with appropriate permissions
-- (The main user is already created by POSTGRES_USER env var)

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE hotel_assistant TO hotel_user;

-- Output confirmation
SELECT 'Database initialization complete' AS status;
