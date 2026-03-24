/**
 * 토스페이먼츠 심사용 테스트 계정 생성 스크립트
 * 실행: node scripts/create-test-account.mjs
 */
import { createClient } from '@supabase/supabase-js';

// .env 또는 직접 입력
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // service_role key (관리자)

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
    console.log('   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-test-account.mjs');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 비밀번호 해시 (userService.js 와 동일한 방식)
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
};

const TEST_ACCOUNT = {
    nickname: 'test_immoca',
    name: '테스트회원',
    phone: '010-0000-0000',
    email: 'test@immoca.kr',
    address: '서울시 테스트구 테스트동',
    grade: 'GOLD',
    referral_source: ['test'],
    password_hash: simpleHash('Immoca2026!'),
};

async function createTestAccount() {
    console.log('🔄 테스트 계정 생성 중...');

    // 기존 계정 확인
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('nickname', TEST_ACCOUNT.nickname)
        .single();

    if (existing) {
        console.log('⚠️  이미 존재하는 계정입니다. 업데이트합니다...');
        const { error } = await supabase
            .from('users')
            .update(TEST_ACCOUNT)
            .eq('id', existing.id);
        if (error) {
            console.error('❌ 업데이트 실패:', error.message);
        } else {
            console.log('✅ 테스트 계정 업데이트 완료!');
            printInfo();
        }
        return;
    }

    const { data, error } = await supabase
        .from('users')
        .insert([TEST_ACCOUNT])
        .select()
        .single();

    if (error) {
        console.error('❌ 계정 생성 실패:', error.message);
    } else {
        console.log('✅ 테스트 계정 생성 완료! ID:', data.id);
        printInfo();
    }
}

function printInfo() {
    console.log('\n========================================');
    console.log('📋 토스페이먼츠 심사용 테스트 계정 정보');
    console.log('========================================');
    console.log('  사이트   : https://immoca.kr');
    console.log('  ID       : test_immoca');
    console.log('  PW       : Immoca2026!');
    console.log('  등급     : GOLD (멤버십 이용 상태)');
    console.log('========================================\n');
}

createTestAccount();
