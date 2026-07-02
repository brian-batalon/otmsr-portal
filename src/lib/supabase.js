import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kjxonjinxbpamyqzscgl.supabase.co'
const supabaseAnonKey = 'sb_publishable_8v0lVktN4plNJx8SHYP3CQ_NLHhL2Le'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)