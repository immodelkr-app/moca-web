import React from 'react';
import { useNavigate } from 'react-router-dom';

const Section = ({ num, title, children }) => (
    <section className="space-y-4">
        <h2 className="text-[#1F1235] font-black text-lg flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA] text-sm font-black shadow-sm">{num}</span>
            {title}
        </h2>
        <div className="bg-white border border-[#E8E0FA] rounded-3xl p-6 shadow-sm">
            {children}
        </div>
    </section>
);

const Li = ({ mark = '•', children }) => (
    <li className="flex gap-3 text-[#5B4E7A] text-[15px] leading-relaxed font-medium">
        <span className="text-[#9333EA] shrink-0 font-black">{mark}</span>
        <span>{children}</span>
    </li>
);

const TermsOfService = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F8F5FF] text-[#1F1235]">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-[#F8F5FF]/90 backdrop-blur-xl border-b border-[#E8E0FA] px-5 pt-14 pb-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl bg-white border border-[#E8E0FA] flex items-center justify-center hover:bg-[#F8F5FF] transition-all shadow-sm group">
                    <span className="material-symbols-outlined text-[20px] text-[#5B4E7A] group-hover:text-[#9333EA]">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-[#1F1235]">서비스 이용약관</h1>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-10 space-y-10">

                {/* 서비스 소개 */}
                <div className="bg-white border border-[#E8E0FA] rounded-[32px] p-8 shadow-sm">
                    <p className="text-[#5B4E7A] text-[15px] leading-relaxed font-medium">
                        (웹사이트, 앱, 등급 업그레이드 등)의 이용에 관한 사항을 규정합니다.
                    </p>
                    <p className="text-[#9CA3AF] text-xs mt-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        시행일: 2026년 3월 1일 | 최종 수정: 2026년 3월 26일
                    </p>
                </div>

                {/* 제1조 목적 */}
                <Section num="1" title="목적">
                    <p className="text-[#5B4E7A] text-[15px] leading-relaxed font-medium">
                        본 약관은 아임모카(이하 "회사")가 운영하는 IMMOCA 서비스(이하 "서비스")의 이용 조건,
                        회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                    </p>
                </Section>

                {/* 제2조 서비스 내용 */}
                <Section num="2" title="서비스의 내용">
                    <ul className="space-y-3">
                        <Li>모델 에이전시 디렉토리: 에이전시 정보 조회 및 프로필 전송</Li>
                        <Li>스마트 프로필: Google Drive 연동을 통한 포트폴리오 관리 및 원클릭 발송</Li>
                        <Li>에이전시 투어 다이어리: 에이전시 방문 기록 관리</Li>
                        <Li>등급 업그레이드: 활동 신청 승인을 통한 프리미엄 서비스 이용</Li>
                        <Li>전속 모델 계약: 전속 계약 체결 및 관리</Li>
                    </ul>
                </Section>

                {/* 제3조 회원 가입 */}
                <Section num="3" title="회원 가입 및 이용">
                    <ul className="space-y-3">
                        <Li mark="①">서비스는 회원 가입 후 이용 가능합니다.</Li>
                        <Li mark="②">회원은 타인의 계정을 사용할 수 없으며, 본인의 정보를 정확히 입력해야 합니다.</Li>
                        <Li mark="③">허위 정보 기입, 타인 사칭 시 서비스 이용이 제한될 수 있습니다.</Li>
                    </ul>
                </Section>



                {/* 제4조 Google Drive */}
                <Section num="4" title="Google Drive 연동 서비스">
                    <ul className="space-y-3">
                        <Li mark="①">스마트 프로필 기능은 Google Drive API를 사용하며, 명시적 동의 후에만 접근합니다.</Li>
                        <Li mark="②">접근 권한은 읽기 전용이며, 파일을 수정하거나 삭제하지 않습니다.</Li>
                        <Li mark="③">선택한 파일의 공유 링크만 저장되며, 파일 내용은 서버에 저장되지 않습니다.</Li>
                    </ul>
                </Section>

                {/* 제5조 책임 제한 */}
                <Section num="5" title="책임 제한">
                    <ul className="space-y-3">
                        <Li mark="①">회사는 천재지변 등 불가항력으로 인한 서비스 중단에 책임을 지지 않습니다.</Li>
                        <Li mark="②">회원의 기대 수익 미달에 대해서는 법적 범위 내에서만 책임을 집니다.</Li>
                    </ul>
                </Section>

                {/* 제6조 분쟁 */}
                <Section num="6" title="분쟁 해결">
                    <ul className="space-y-3">
                        <Li>서비스 이용 관련 분쟁은 대한민국 법률에 따릅니다.</Li>
                        <Li>고객 문의: immodelkr@gmail.com</Li>
                        <Li>관할 법원: 서울중앙지방법원</Li>
                    </ul>
                </Section>

                {/* 푸터 */}
                <div className="text-center text-[#9CA3AF] text-xs pt-8 pb-12 border-t border-[#E8E0FA] font-medium">
                    <p>© 2026 아임모카(IMMOCA) / 글로벌아임. All rights reserved.</p>
                    <p className="mt-1.5 opacity-60 font-medium">사업자등록번호: 365-22-00947 | 대표: 김대희</p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
