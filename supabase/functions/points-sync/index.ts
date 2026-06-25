/**
 * points-sync Edge Function
 * MOCA ↔ im-core-auth 통합 포인트 연동 프록시
 *
 * GET  /functions/v1/points-sync?phone=010-xxxx-xxxx
 *   → im-core-auth에서 해당 phone의 master_user, 포인트, 거래내역 반환
 *
 * POST /functions/v1/points-sync
 *   body: { local_user_id, phone, name, nickname }
 *   → MOCA 유저를 im-core-auth에 등록/조회하고 master_user_id 반환
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORE_AUTH_URL = Deno.env.get('IM_CORE_AUTH_SUPABASE_URL') || '';
const CORE_AUTH_SERVICE_KEY = Deno.env.get('IM_CORE_AUTH_SERVICE_KEY') || '';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // im-core-auth 클라이언트 (서비스 롤 키로 RLS 우회)
  if (!CORE_AUTH_URL || !CORE_AUTH_SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: 'im-core-auth 환경변수가 설정되지 않았습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const coreClient = createClient(CORE_AUTH_URL, CORE_AUTH_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    if (req.method === 'GET') {
      // GET: phone으로 포인트 조회
      const url = new URL(req.url);
      const phone = url.searchParams.get('phone');
      if (!phone) {
        return new Response(
          JSON.stringify({ error: 'phone 파라미터가 필요합니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // phone 정규화 (하이픈 제거)
      const normalizedPhone = phone.replace(/-/g, '');

      // master_users 에서 phone_number로 조회
      const { data: masterUser, error: masterError } = await coreClient
        .from('master_users')
        .select('id, name, integrated_points, updated_at')
        .or(`phone_number.eq.${phone},phone_number.eq.${normalizedPhone}`)
        .maybeSingle();

      if (masterError) {
        console.error('[points-sync] master_users 조회 오류:', masterError);
        return new Response(
          JSON.stringify({ error: '포인트 조회 중 오류가 발생했습니다.', detail: masterError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!masterUser) {
        // 해당 번호의 마스터 유저 없음 → 연동 안 된 상태
        return new Response(
          JSON.stringify({ found: false, integrated_points: 0, master_user_id: null }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 포인트 거래 내역 (최근 10건)
      const { data: transactions } = await coreClient
        .from('point_transactions')
        .select('id, source_app, type, amount, description, created_at')
        .eq('master_user_id', masterUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          found: true,
          master_user_id: masterUser.id,
          name: masterUser.name,
          integrated_points: masterUser.integrated_points,
          updated_at: masterUser.updated_at,
          transactions: transactions || [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'POST') {
      // POST: MOCA 유저를 im-core-auth에 등록/조회
      const body = await req.json();
      const { local_user_id, phone, name, nickname } = body;

      if (!phone || !local_user_id) {
        return new Response(
          JSON.stringify({ error: 'phone, local_user_id는 필수입니다.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedPhone = phone.replace(/-/g, '');

      // 1. master_users에서 phone으로 조회
      const { data: masterUser, error: masterError } = await coreClient
        .from('master_users')
        .select('id, integrated_points')
        .or(`phone_number.eq.${phone},phone_number.eq.${normalizedPhone}`)
        .maybeSingle();

      if (masterError) {
        return new Response(
          JSON.stringify({ error: 'master_users 조회 오류', detail: masterError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let masterUserId: string;

      if (!masterUser) {
        // 새로운 마스터 유저 생성
        const { data: newMaster, error: createError } = await coreClient
          .from('master_users')
          .insert({
            phone_number: normalizedPhone || phone,
            name: name || nickname || '미입력',
          })
          .select('id, integrated_points')
          .single();

        if (createError || !newMaster) {
          return new Response(
            JSON.stringify({ error: 'master_users 생성 오류', detail: createError?.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        masterUserId = newMaster.id;
      } else {
        masterUserId = masterUser.id;
      }

      // 2. app_user_mapping에 MOCA 유저 등록 (중복 방지 upsert)
      const { error: mapError } = await coreClient
        .from('app_user_mapping')
        .upsert({
          master_user_id: masterUserId,
          app_name: 'MOCA',
          local_user_id: String(local_user_id),
          nickname: nickname || name || '미입력',
        }, {
          onConflict: 'master_user_id,app_name,local_user_id',
          ignoreDuplicates: true,
        });

      if (mapError) {
        console.warn('[points-sync] app_user_mapping upsert 경고:', mapError.message);
      }

      // 최종 포인트 조회
      const { data: finalMaster } = await coreClient
        .from('master_users')
        .select('integrated_points, updated_at')
        .eq('id', masterUserId)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          master_user_id: masterUserId,
          integrated_points: finalMaster?.integrated_points || 0,
          updated_at: finalMaster?.updated_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: '지원하지 않는 메서드입니다.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[points-sync] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
