// =========================================
// // KONFIGURASI SUPABASE
// =========================================
const SUPABASE_URL = "https://lxrwkbobosdmaqrmlvpd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JvZsmYEd3RsMmdMRLcnvpg_ho7aUpBL";

// Γ£à PERBAIKAN: Gunakan SUPABASE_ANON_KEY
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================
// // GLOBAL STATE
// =========================================
let currentUser = null;

// =========================================
// // 3. API HANDLER
// =========================================
const apiHandler = {
  async handle(query, onSuccess = null, onError = null) {
    try {
      const { data, error } = await query;
      if (error) throw error;
      if (onSuccess) await onSuccess(data);
      return data;
    } catch (err) {
      console.error("SUPABASE ERROR:", err);
      toast(err.message || "Terjadi kesalahan", "error");
      if (onError) onError(err);
      return null;
    }
  },
};

// =========================================
// // 4. AUTH HELPERS
// =========================================
async function initUser() {
  try {
    const { data } = await sbClient.auth.getUser();
    if (!data.user) return null;
    currentUser = data.user;
    return currentUser;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

