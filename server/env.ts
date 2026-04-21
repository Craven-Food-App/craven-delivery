import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3001,
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || "documents",
  
  // Email via Microsoft 365 (or any SMTP):
  SMTP_HOST: process.env.SMTP_HOST || "smtp.office365.com",
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || "Crave'n Docs <no-reply@cravenusa.com>",
  MAIL_CREDENTIALS_KEY: process.env.MAIL_CREDENTIALS_KEY || "",
  
  // CORS Configuration
  ORIGIN: process.env.ORIGIN || "http://localhost:8080",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 
    "https://cravenusa.com,https://www.cravenusa.com,https://feeder.cravenusa.com,https://merchant.cravenusa.com,https://board.cravenusa.com,https://hq.cravenusa.com,https://ceo.cravenusa.com,https://cfo.cravenusa.com,https://coo.cravenusa.com,https://cto.cravenusa.com,http://localhost:8080,http://localhost:5173",
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
};

