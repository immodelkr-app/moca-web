import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


// Define TypeScript interfaces for Push payload
interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Helper function to encode ArrayBuffer as base64url
function base64url(buf: ArrayBuffer): string {
  const binString = String.fromCharCode(...new Uint8Array(buf));
  return btoa(binString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Helper function to encode string as base64url
function stringToBase64url(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return base64url(bytes.buffer);
}

// Function to generate JWT for Firebase V1 HTTP API
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const { client_email, private_key } = serviceAccount;
  
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  
  const headerStr = stringToBase64url(JSON.stringify(header));
  const claimStr = stringToBase64url(JSON.stringify(claim));
  
  const signatureInput = `${headerStr}.${claimStr}`;
  
  // Clean up private key robustly
  const pemContents = private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );
  
  const signatureStr = base64url(signatureBuffer);
  const jwt = `${signatureInput}.${signatureStr}`;
  
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to obtain access token: ${JSON.stringify(data)}`);
  }
  
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record;
    const table = payload.table;
    
    // Determine notification content based on table
    let title = "";
    let body = "";
    let actionRoute = "";
    
    if (table === "classes") {
      title = "🆕 새로운 모카 클래스 오픈!";
      body = "클래스가 오픈되었습니다 지금 바로 모카클래스를 확인해보세요";
      actionRoute = "/class";
    } else if (table === "partners") {
      title = "🏢 새로운 제휴 에이전시 추가!";
      body = "중요 광고에이전시 리스트가 추가되었습니다. 지금 확인해보세요.";
      actionRoute = "/agency";
    } else if (table === "moca_featured_videos") {
      title = "🎬 모카TV 김대표님 영상 업로드!";
      body = "모카TV에 김대표님의 새로운 영상이 업로드 되었습니다. 지금 바로 확인해 보세요!";
      actionRoute = "/mocatv";
    } else if (table === "custom") {
      // 관리자가 직접 지정한 커스텀 푸시 메시지
      title = record?.title || "📢 새로운 소식";
      body = record?.body || "앱에서 확인해보세요.";
      actionRoute = record?.route || "/agency";
    } else if (table === "targeted") {
      // 특정 닉네임(record.nicknames)에게만 보내는 푸시 메시지 (예: 퀴즈 당첨 안내)
      title = record?.title || "📢 새로운 소식";
      body = record?.body || "앱에서 확인해보세요.";
      actionRoute = record?.route || "/agency";
    } else {
      return new Response(JSON.stringify({ message: "Unsupported table" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch push tokens (targeted 발송은 지정된 닉네임의 토큰만 조회)
    let tokenQuery = supabase.from("user_push_tokens").select("token");
    if (table === "targeted") {
      const nicknames: string[] = Array.isArray(record?.nicknames) ? record.nicknames : [];
      if (nicknames.length === 0) {
        return new Response(JSON.stringify({ message: "No target nicknames provided" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      tokenQuery = tokenQuery.in("user_nickname", nicknames);
    }
    const { data: tokens, error: tokensError } = await tokenQuery;

    if (tokensError) throw tokensError;

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: "No push tokens found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Get Firebase Service Account from environment
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountStr) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing");
    }
    
    const serviceAccount = JSON.parse(serviceAccountStr);
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    
    const projectId = serviceAccount.project_id;
    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    const results = [];
    
    // Send to each token
    for (const tokenData of tokens) {
      const message = {
        message: {
          token: tokenData.token,
          notification: {
            title,
            body,
          },
          data: {
            route: actionRoute,
          },
        },
      };
      
      const res = await fetch(fcmEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });
      
      const data = await res.json();
      results.push({ token: tokenData.token, success: res.ok, response: data });
      
      // If token is invalid/unregistered, remove it
      if (!res.ok && data.error && (data.error.status === "NOT_FOUND" || data.error.details?.[0]?.errorCode === "UNREGISTERED")) {
        await supabase.from("user_push_tokens").delete().eq("token", tokenData.token);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // 발송 내역 DB 저장
    const senderType = table === "custom" ? "admin_custom" : table === "targeted" ? "admin_targeted" : `system_${table}`;
    await supabase.from("push_history").insert({
      title,
      body,
      route: actionRoute,
      sender: senderType,
      success_count: successCount,
      fail_count: failCount,
    });

    return new Response(
      JSON.stringify({ message: "Push notifications processed", results, successCount, failCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
