import axios from 'axios'

const SUPABASE_URL = 'https://xakofcatqpjufvzokncl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhha29mY2F0cXBqdWZ2em9rbmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzgyODksImV4cCI6MjA5NjkxNDI4OX0.UR_9b15XSsAdKxo3UNz5_aH6GMQdSaCRkSdabOcj-lQ'
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhha29mY2F0cXBqdWZ2em9rbmNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMzODI4OSwiZXhwIjoyMDk2OTE0Mjg5fQ.QfMczDyb2GgdlzJ2LBOLAkd6ijYnhetrD_My_RPALEI'

// Supabase REST API client using axios
export const supabase = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
})

// Supabase Auth client
export const supabaseAuth = axios.create({
  baseURL: `${SUPABASE_URL}/auth/v1`,
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  },
})

// Supabase Storage client
export const supabaseStorage = axios.create({
  baseURL: `${SUPABASE_URL}/storage/v1`,
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  },
})

// Helper to set auth token
export function setSupabaseToken(token: string) {
  supabase.defaults.headers.common['Authorization'] = `Bearer ${token}`
  supabaseStorage.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Helper to clear auth token
export function clearSupabaseToken() {
  delete supabase.defaults.headers.common['Authorization']
  delete supabaseStorage.defaults.headers.common['Authorization']
}

// Auth API
export const authApi = {
  signUp: (email: string, password: string, metadata?: object) =>
    supabaseAuth.post('/signup', { email, password, data: metadata }),

  signIn: (email: string, password: string) =>
    supabaseAuth.post('/token?grant_type=password', { email, password }),

  signOut: (token: string) =>
    supabaseAuth.post('/logout', {}, { headers: { Authorization: `Bearer ${token}` } }),

  getUser: (token: string) =>
    supabaseAuth.get('/user', { headers: { Authorization: `Bearer ${token}` } }),

  refreshSession: (refreshToken: string) =>
    supabaseAuth.post('/token?grant_type=refresh_token', { refresh_token: refreshToken }),
}

// Database API helpers
export const db = {
  // Generic select
  select: (table: string, query?: string) =>
    supabase.get(`/${table}?${query || '*'}`),

  // Insert
  insert: (table: string, data: object) =>
    supabase.post(`/${table}`, data),

  // Update
  update: (table: string, id: string | number, data: object) =>
    supabase.patch(`/${table}?id=eq.${id}`, data),

  // Delete
  delete: (table: string, id: string | number) =>
    supabase.delete(`/${table}?id=eq.${id}`),

  // Select with filters
  selectWhere: (table: string, filters: Record<string, any>, select?: string) => {
    const params = new URLSearchParams()
    if (select) params.append('select', select)
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, `eq.${value}`)
    })
    return supabase.get(`/${table}?${params.toString()}`)
  },

  // RPC (Remote Procedure Call)
  rpc: (functionName: string, params?: object) =>
    supabase.post(`/${functionName}`, params),
}

export default supabase