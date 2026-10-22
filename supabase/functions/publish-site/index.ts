// publish-site : déclenche un nouveau build Netlify depuis le backoffice.
// Seuls les comptes présents dans public.admins peuvent l'appeler ; l'URL du
// build hook reste secrète (secret NETLIFY_BUILD_HOOK de la fonction).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) return json({ error: "Accès réservé à l'administrateur" }, 403);

  const hook = Deno.env.get("NETLIFY_BUILD_HOOK");
  if (!hook) return json({ error: "Build hook Netlify non configuré (secret NETLIFY_BUILD_HOOK)" }, 500);

  const url = `${hook}?trigger_title=${encodeURIComponent("Publication depuis le backoffice")}`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) return json({ error: `Netlify a répondu ${response.status}` }, 502);

  return json({ ok: true, triggeredAt: new Date().toISOString() });
});
