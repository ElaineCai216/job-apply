import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  try {
    const auth = request.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    const { data: allowed } = await supabase.rpc("is_allowed_user");
    if (!allowed) return new Response(JSON.stringify({ error: "Not allowed" }), { status: 403, headers });
    const body = await request.json();
    const prompt = `You are Apply Desk's private interview coach. Use only the candidate context supplied. Never invent achievements, numbers, dates, skills, employers, or qualifications. Reply in ${body.language === "en" ? "English" : "concise Chinese"}. Mode: ${body.mode}. Interview question: ${body.question || "not supplied"}. Candidate answer: ${body.answer || "not supplied"}. Role/JD context: ${JSON.stringify(body.job || {})}. Return valid JSON with keys: followUps (array, max 3), feedback (string), evidenceGaps (array), improvedStructure (array), nextPractice (string).`;
    const response = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { "Authorization": `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "deepseek-chat", temperature: 0.35, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Return JSON only." }, { role: "user", content: prompt }] }) });
    if (!response.ok) throw new Error(`DeepSeek ${response.status}`);
    const payload = await response.json();
    return new Response(payload.choices?.[0]?.message?.content || "{}", { headers });
  } catch (error) { return new Response(JSON.stringify({ error: error.message || "Coach unavailable" }), { status: 500, headers }); }
});
