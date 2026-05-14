export const SUPABASE_URL = "https://qkwusyhkycthottckzww.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3VzeWhreWN0aG90dGNrend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTM2OTIsImV4cCI6MjA4OTA4OTY5Mn0.ycIm_1lZlGNApILY1OReDQmp4Qv4n1Rw7iTAbFq7rdA";

export const createSupabaseClient = () => window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.JeniSupabase = { SUPABASE_URL, SUPABASE_ANON_KEY, createSupabaseClient };
