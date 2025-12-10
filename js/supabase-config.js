// supabase-config.js
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://qliebrukbrneglzjbnar.supabase.co'; // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaWVicnVrYnJuZWdsempibmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNzkxMzMsImV4cCI6MjA4MDY1NTEzM30.B_iu-mwvBsPNkbhaZviDrumulWLEuKq6sjpks6fxXRQ'; // Get from Project Settings → API

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate unique order number
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${timestamp}${random}`;
}
