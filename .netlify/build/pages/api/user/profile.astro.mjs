import { supabase } from '../../../chunks/supabase_DAMM5TbE.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const GET = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;
    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({
        error: "Not authenticated"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (sessionError || !sessionData.user) {
      return new Response(JSON.stringify({
        error: "Invalid session"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const userId = sessionData.user.id;
    const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (profileError) {
      console.error("Profile error:", profileError);
    }
    const { data: userDetails, error: detailsError } = await supabase.from("user_details").select("*").eq("user_id", userId).single();
    if (detailsError) {
      console.error("User details error:", detailsError);
    }
    const { data: alpacaAccount, error: alpacaError } = await supabase.from("alpaca_accounts").select("*").eq("user_id", userId).single();
    if (alpacaError) {
      console.error("Alpaca account error:", alpacaError);
    }
    return new Response(JSON.stringify({
      success: true,
      data: {
        user: sessionData.user,
        profile: profile || null,
        userDetails: userDetails || null,
        alpacaAccount: alpacaAccount || null
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Profile API error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
