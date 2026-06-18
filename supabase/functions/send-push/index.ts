import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Define TypeScript interfaces for Push payload
interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
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
  
  const headerStr = btoa(JSON.stringify(header));
  const claimStr = btoa(JSON.stringify(claim));
  
  const signatureInput = `${headerStr}.${claimStr}`;
  
  // Import private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = private_key.substring(pemHeader.length, private_key.length - pemFooter.length - 1);
  
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
  
  const signatureStr = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
    
  const jwt = `${headerStr.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}.${claimStr.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}.${signatureStr}`;
  
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
    } else {
      return new Response(JSON.stringify({ message: "Unsupported table" }), { status: 200 });
    }

    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch all user push tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("user_push_tokens")
      .select("token");
      
    if (tokensError) throw tokensError;
    
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: "No push tokens found" }), { status: 200 });
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
    
    return new Response(
      JSON.stringify({ message: "Push notifications processed", results }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
