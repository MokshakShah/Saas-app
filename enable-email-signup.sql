-- Check current auth settings
SELECT 
  raw_app_meta_data,
  raw_user_meta_data,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
LIMIT 5;

-- Check if there are any auth settings we can see
SELECT * FROM information_schema.tables 
WHERE table_schema = 'auth' 
AND table_name LIKE '%config%';

-- Alternative: Check auth schema tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'auth';