import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.2/+esm';

const SUPABASE_URL = "https://gmqlgvlgoztantflewut.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcWxndmxnb3p0YW50Zmxld3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0OTE3NTMsImV4cCI6MjA3MzA2Nzc1M30.0Ex2Gv8t7fN7Qlg6-HWv4_fx9PPD3D2Pw-YoKZdWh1o";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
