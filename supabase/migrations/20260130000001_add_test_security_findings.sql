-- Add test security audit findings for Security & Compliance Center
-- This migration adds sample data to verify the security audits feature is working

-- Insert test security audit findings
INSERT INTO public.security_audits (
  audit_type,
  severity,
  finding,
  recommendation,
  status,
  created_at
) VALUES
  (
    'penetration',
    'high',
    'API endpoint lacks rate limiting protection',
    'Implement rate limiting middleware to prevent brute force attacks. Consider using Redis-based rate limiting with 100 requests per minute per IP.',
    'open',
    now() - interval '5 days'
  ),
  (
    'compliance',
    'medium',
    'Missing GDPR data retention policy documentation',
    'Document and implement data retention policies for EU customer data. Ensure automatic deletion after retention period expires.',
    'in-progress',
    now() - interval '3 days'
  ),
  (
    'code_review',
    'low',
    'Hardcoded API key found in client-side code',
    'Move API key to environment variables and ensure it is never committed to version control. Use Supabase secrets for sensitive keys.',
    'resolved',
    now() - interval '10 days'
  ),
  (
    'penetration',
    'critical',
    'SQL injection vulnerability in user input validation',
    'Implement parameterized queries for all database operations. Use Supabase RPC functions instead of raw SQL where possible.',
    'open',
    now() - interval '1 day'
  ),
  (
    'compliance',
    'high',
    'PCI DSS compliance audit required for payment processing',
    'Schedule quarterly PCI DSS compliance audit. Ensure all payment data is encrypted in transit and at rest.',
    'open',
    now() - interval '7 days'
  )
ON CONFLICT DO NOTHING;

-- Verify the insertions
SELECT 
  COUNT(*) as total_findings,
  COUNT(*) FILTER (WHERE status = 'open') as open_findings,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_findings
FROM public.security_audits;

