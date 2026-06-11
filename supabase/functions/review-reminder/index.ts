import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// ──────────────────────────────────────────────
// 🔔 review-reminder Edge Function
// 클래스 종료 4시간 후 수강생에게 후기 작성 알림 발송
// - FCM 푸시 (토큰 보유 사용자)
// - Solapi SMS (토큰 미보유 사용자)
// ──────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Firebase FCM v1 Access Token 생성 ──
async function getFirebaseAccessToken(
  serviceAccount: any,
): Promise<string> {
  const { client_email, private_key } = serviceAccount;

  const header = { alg: "RS256", typ: "JWT" };
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

  // Import RSA private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = private_key.substring(
    pemHeader.length,
    private_key.length - pemFooter.length - 1,
  );

  const binaryDer = Uint8Array.from(atob(pemContents), (c: string) =>
    c.charCodeAt(0),
  );

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput),
  );

  const signatureStr = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${headerStr.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}.${claimStr.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}.${signatureStr}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Failed to obtain access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── Solapi 인증 헤더 생성 ──
async function getSolapiAuth(): Promise<string> {
  const apiKey = Deno.env.get("SOLAPI_API_KEY") ?? "";
  const secretKey = Deno.env.get("SOLAPI_SECRET_KEY") ?? "";

  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, "");
  const data = date + salt;

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuf = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data),
  );
  const signatureHex = Array.from(new Uint8Array(signatureBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signatureHex}`;
}

// ── 네트워크 재시도 헬퍼 ──
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error: any) {
      lastError = error;
      console.warn(
        `[review-reminder] Fetch attempt ${attempt} failed:`,
        error.message || error,
      );
      if (attempt === maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError || new Error(`Fetch failed after ${maxRetries} attempts`);
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Supabase 클라이언트 초기화 ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 1. 알림 대상 클래스 조회 ──
    // event_datetime + 4시간 이후이면서 아직 알림을 보내지 않은 활성 클래스
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, title, review_message")
      .eq("status", "active")
      .eq("review_notification_sent", false)
      .not("event_datetime", "is", null)
      .lte(
        "event_datetime",
        new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      );

    if (classesError) throw classesError;

    if (!classes || classes.length === 0) {
      console.log("[review-reminder] 알림 대상 클래스 없음");
      return new Response(
        JSON.stringify({ message: "No classes to notify", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(
      `[review-reminder] 알림 대상 클래스 ${classes.length}건 발견`,
    );

    // ── Firebase 준비 ──
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    let firebaseAccessToken: string | null = null;
    let fcmEndpoint = "";

    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      firebaseAccessToken = await getFirebaseAccessToken(serviceAccount);
      fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    } else {
      console.warn(
        "[review-reminder] FIREBASE_SERVICE_ACCOUNT 없음 → 푸시 알림 건너뜀",
      );
    }

    // ── Solapi 준비 ──
    const solapiApiKey = Deno.env.get("SOLAPI_API_KEY") ?? "";
    const solapiSecretKey = Deno.env.get("SOLAPI_SECRET_KEY") ?? "";
    const solapiSender = Deno.env.get("SOLAPI_SENDER") ?? "01055439674";
    const hasSolapi = !!(solapiApiKey && solapiSecretKey);
    if (!hasSolapi) {
      console.warn(
        "[review-reminder] SOLAPI 키 없음 → SMS 알림 건너뜀",
      );
    }

    const results: any[] = [];

    // ── 2. 클래스별 처리 ──
    for (const cls of classes) {
      const classId = cls.id;
      const className = cls.title || "모카 클래스";

      console.log(
        `[review-reminder] 처리 중: ${className} (${classId})`,
      );

      // ── 2a. 결제 완료 수강생 조회 ──
      const { data: applications, error: appError } = await supabase
        .from("class_applications")
        .select("user_id, profiles!inner(phone)")
        .eq("class_id", classId)
        .eq("approval_status", "paid");

      if (appError) {
        console.error(
          `[review-reminder] 수강생 조회 오류 (${classId}):`,
          appError,
        );
        results.push({ classId, error: appError.message });
        continue;
      }

      if (!applications || applications.length === 0) {
        console.log(
          `[review-reminder] 수강생 없음 → 스킵 (${classId})`,
        );
        // 수강생 없어도 sent 처리
        await supabase
          .from("classes")
          .update({
            review_notification_sent: true,
            review_notification_sent_at: new Date().toISOString(),
          })
          .eq("id", classId);
        results.push({ classId, pushed: 0, smsed: 0, skipped: true });
        continue;
      }

      const userIds = applications.map((a: any) => a.user_id);

      // ── 2b. 푸시 토큰 보유 사용자 확인 ──
      const { data: tokenRows, error: tokenError } = await supabase
        .from("user_push_tokens")
        .select("user_id, token")
        .in("user_id", userIds);

      if (tokenError) {
        console.error(
          `[review-reminder] 토큰 조회 오류 (${classId}):`,
          tokenError,
        );
      }

      const tokenMap = new Map<string, string[]>();
      if (tokenRows) {
        for (const row of tokenRows) {
          const existing = tokenMap.get(row.user_id) || [];
          existing.push(row.token);
          tokenMap.set(row.user_id, existing);
        }
      }

      // 푸시 대상 vs SMS 대상 분리
      const pushUserIds = userIds.filter((uid: string) => tokenMap.has(uid));
      const smsUserIds = userIds.filter((uid: string) => !tokenMap.has(uid));

      // Push notification content — review_message 우선, 없으면 기본값
      const customMessage = cls.review_message?.trim();
      const pushTitle = "🙏 수강 감사합니다!";
      const pushBody = customMessage
        ? customMessage
        : `${className} 수강은 어떠셨나요? 후기를 남기면 다른 모델분들에게 큰 도움이 됩니다 ✨`;
      const deepLinkRoute = `/home/class/${classId}?write_review=true`;

      let pushCount = 0;
      let smsCount = 0;

      // ── 2c. FCM 푸시 발송 ──
      if (firebaseAccessToken && pushUserIds.length > 0) {
        for (const userId of pushUserIds) {
          const tokens = tokenMap.get(userId) || [];
          for (const token of tokens) {
            const message = {
              message: {
                token,
                notification: { title: pushTitle, body: pushBody },
                data: { route: deepLinkRoute },
              },
            };

            try {
              const res = await fetch(fcmEndpoint, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${firebaseAccessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(message),
              });

              const data = await res.json();

              if (res.ok) {
                pushCount++;
              } else {
                console.warn(
                  `[review-reminder] FCM 실패 (${token}):`,
                  data,
                );
                // 유효하지 않은 토큰 삭제
                if (
                  data.error &&
                  (data.error.status === "NOT_FOUND" ||
                    data.error.details?.[0]?.errorCode === "UNREGISTERED")
                ) {
                  await supabase
                    .from("user_push_tokens")
                    .delete()
                    .eq("token", token);
                }
              }
            } catch (fcmErr: any) {
              console.error(
                `[review-reminder] FCM 전송 에러 (${token}):`,
                fcmErr.message,
              );
            }
          }
        }
      }

      // ── 2d. Solapi SMS 발송 (토큰 미보유 사용자) ──
      if (hasSolapi && smsUserIds.length > 0) {
        // 사용자별 전화번호 매핑
        const smsTargets: { userId: string; phone: string }[] = [];
        for (const app of applications) {
          if (
            smsUserIds.includes(app.user_id) &&
            (app as any).profiles?.phone
          ) {
            smsTargets.push({
              userId: app.user_id,
              phone: (app as any).profiles.phone,
            });
          }
        }

        if (smsTargets.length > 0) {
          const smsText = customMessage
            ? `${customMessage}\n\n▶ 후기 남기기: https://immoca.kr/open-app?path=home/class/${classId}%3Fwrite_review%3Dtrue`
            : `[아임모델] ${className} 수강 감사합니다! 🙏 후기를 남겨주세요 ✨ 👉 https://immoca.kr/open-app?path=home/class/${classId}%3Fwrite_review%3Dtrue`;

          const authHeader = await getSolapiAuth();
          const messages = smsTargets.map((t) => ({
            to: t.phone.replace(/-/g, ""),
            from: solapiSender,
            text: smsText,
          }));

          try {
            const response = await fetchWithRetry(
              "https://api.solapi.com/messages/v4/send-many",
              {
                method: "POST",
                headers: {
                  Authorization: authHeader,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages }),
              },
            );
            const responseData = await response.json();

            if (response.ok && !responseData.errorCode) {
              smsCount = smsTargets.length;
              console.log(
                `[review-reminder] SMS ${smsCount}건 발송 성공 (${classId})`,
              );
            } else {
              console.error(
                `[review-reminder] SMS 발송 실패 (${classId}):`,
                responseData,
              );
            }
          } catch (smsErr: any) {
            console.error(
              `[review-reminder] SMS 전송 에러 (${classId}):`,
              smsErr.message,
            );
          }
        }
      }

      // ── 2e. 클래스 알림 발송 완료 마킹 ──
      const { error: updateError } = await supabase
        .from("classes")
        .update({
          review_notification_sent: true,
          review_notification_sent_at: new Date().toISOString(),
        })
        .eq("id", classId);

      if (updateError) {
        console.error(
          `[review-reminder] 클래스 업데이트 오류 (${classId}):`,
          updateError,
        );
      }

      results.push({ classId, className, pushCount, smsCount });
      console.log(
        `[review-reminder] 완료: ${className} → 푸시 ${pushCount}건, SMS ${smsCount}건`,
      );
    }

    return new Response(
      JSON.stringify({
        message: "Review reminders processed",
        processed: classes.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("[review-reminder] 처리 에러:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
