
import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://vgofnhwaiqskgmflgbwu.supabase.co";

// Use the same existing publishable key as supabase-client.js
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KYidsoOS-n-WzV4denfPBw_X1-YOhGw";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            storageKey: "phishkavach-admin-auth-token",
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    }
);
