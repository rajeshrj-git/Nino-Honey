// Supabase Configuration
const SUPABASE_URL = 'https://hhznjajqrcuherhetbev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhoem5qYWpxcmN1aGVyaGV0YmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNDMzNTEsImV4cCI6MjA4MjkxOTM1MX0.R7P2BaQCjm5I4cwFabBHOdhVsavj4nMktUypcN33Apc';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase client initialized');

// Helper function to generate order number
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
}
