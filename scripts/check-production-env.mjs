const required=["VITE_SUPABASE_URL","VITE_SUPABASE_ANON_KEY","VITE_ALLOWED_EMAIL"];
const missing=required.filter(k=>!process.env[k]||process.env[k].includes("YOUR_"));
if(missing.length){console.error(`Missing GitHub Actions secrets: ${missing.join(", ")}`);process.exit(1)}
