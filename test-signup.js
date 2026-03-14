// Test script to verify Supabase signup configuration
// Run this with: node test-signup.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qbeaqejsxwncmusyraod.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZWFxZWpzeHduY211c3lyYW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NDk1NDIsImV4cCI6MjA3NTIyNTU0Mn0.YEFSb8ir5gqsAa-yixFNkn5tr_74vaUIVZOa1YJi-Rs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';
  
  console.log('Testing signup with:', testEmail);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    console.log('Signup result:');
    console.log('Error:', error);
    console.log('User:', data.user);
    console.log('Session:', data.session);
    
    if (data.user) {
      console.log('User details:');
      console.log('- ID:', data.user.id);
      console.log('- Email:', data.user.email);
      console.log('- Is Anonymous:', data.user.is_anonymous);
      console.log('- Email Confirmed:', data.user.email_confirmed_at);
    }
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testSignup();