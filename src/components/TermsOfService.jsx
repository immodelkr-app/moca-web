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
                <h1 className="text-xl font-black text-[#1F1235]">서비스 이용약관 및 환불정책</h1>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-10 space-y-10">

                {/* 서비스 소개 */}
                <div className="bg-white border border-[#E8E0FA] rounded-[32px] p-8 shadow-sm">
                    <p className="text-[#5B4E7A] text-[15px] leading-relaxed font-medium">
                        본 약관은 <strong className="text-[#1F1235] font-black underline decoration-[#9333EA]/20 underline-offset-4">아임모카(IMMOCA)</strong>가 제공하는 모든 서비스
                        (웹사이트, 앱, 모카 에디트 쇼핑, 멤버십 등)의 이용에 관한 사항을 규정합니다.
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
                        <Li>모카 에디트 쇼핑: 시간 제한 특가 상품 구매</Li>
                        <Li>에이전시 투어 다이어리: 에이전시 방문 기록 관리</Li>
                        <Li>멤버십: 월정액 구독을 통한 프리미엄 서비스 이용</Li>
                        <Li>전속 모델 계약: 전속 계약 체결 및 관리</Li>
                    </ul>
                </Section>

                {/* 제3조 회원 가입 */}
                <Section num="3" title="회원 가입 및 이용">
                    <ul className="space-y-3">
                        <Li mark="①">서비스는 회원 가입 후 이용 가능합니다. 비회원 구매는 불가합니다.</Li>
                        <Li mark="②">회원은 타인의 계정을 사용할 수 없으며, 본인의 정보를 정확히 입력해야 합니다.</Li>
                        <Li mark="③">허위 정보 기입, 타인 사칭 시 서비스 이용이 제한될 수 있습니다.</Li>
                    </ul>
                </Section>

                {/* 제4조 결제 */}
                <Section num="4" title="주문 및 결제">
                    <ul className="space-y-3">
                        <Li mark="①">주문은 결제 완료 시점에 성립됩니다.</Li>
                        <Li mark="②">결제는 <strong className="text-[#9333EA] font-black underline decoration-[#9333EA]/20 underline-offset-4">토스페이먼츠</strong>를 통해 처리됩니다.</Li>
                        <Li mark="③">단건 결제 최고가는 <strong className="text-[#1F1235] font-black">200,000원</strong>입니다.</Li>
                        <Li mark="④">멤버십 월 구독료는 <strong className="text-[#1F1235] font-black">10,000원/월</strong>이며, 서비스 제공 기간은 1개월(30일)입니다.</Li>
                        <Li mark="⑤">실물 상품 배송: <strong className="text-[#1F1235] font-black">롯데택배</strong> 또는 <strong className="text-[#1F1235] font-black">CJ택배</strong>를 통해 배송되며, 배송 지역은 전국입니다.</Li>
                        <Li mark="⑥">실물 상품의 최대 배송 기간은 결제 후 <strong className="text-[#1F1235] font-black">14일(영업일 기준 5일 내 발송)</strong>입니다.</Li>
                        <Li mark="⑦">재고 소진 및 판매 시간 종료 후에는 구매가 불가합니다.</Li>
                    </ul>
                </Section>

                {/* 제5조 취소 및 환불 ★ 핵심 */}
                <Section num="5" title="취소 및 환불 정책">
                    <div className="space-y-6">
                        {/* 멤버십 */}
                        <div className="bg-[#F8F5FF] rounded-2xl p-5 border border-[#E8E0FA]/50">
                            <p className="text-[#9333EA] font-black text-base mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">card_membership</span>
                                멤버십 (월정액 구독)
                            </p>
                            <ul className="space-y-2.5">
                                <Li mark="①">결제 후 <strong className="text-[#1F1235] font-black">7일 이내</strong> 환불 신청 가능합니다.</Li>
                                <Li mark="②">단, 프리미엄 콘텐츠를 1회 이상 이용한 경우 환불이 제한될 수 있습니다.</Li>
                                <Li mark="③">구독 취소는 만료 3일 전까지 고객센터에 요청하셔야 합니다.</Li>
                                <Li mark="④">이용 기간에 해당하는 일할 계산 금액을 제외한 잔액을 환불합니다.</Li>
                            </ul>
                        </div>

                        {/* 실물 상품 */}
                        <div className="bg-[#EEF2FF] rounded-2xl p-5 border border-[#E0E7FF]">
                            <p className="text-[#4338CA] font-black text-base mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                                실물 상품 (모카 에디트 쇼핑)
                            </p>
                            <ul className="space-y-2.5">
                                <Li mark="①">배송 전 취소: <strong className="text-[#1F1235] font-black">100% 전액 환불</strong></Li>
                                <Li mark="②">상품 수령 후 <strong className="text-[#1F1235] font-black">3일 이내</strong> 환불 신청 가능합니다.</Li>
                                <Li mark="③">단순 변심 반품: <strong className="text-[#1F1235] font-black">왕복 배송비는 고객 부담</strong>입니다.</Li>
                                <Li mark="④">반품 주소: <strong className="text-[#1F1235] font-black">서울시 영등포구 영중로159, 7층</strong></Li>
                                <Li mark="⑤">상품 하자·오배송: 사진 첨부 후 접수 시 100% 환불 또는 재발송 처리합니다.</Li>
                            </ul>
                        </div>

                        {/* 환불 불가 */}
                        <div className="bg-[#FFF1F2] rounded-2xl p-5 border border-[#FFE4E6]">
                            <p className="text-[#E11D48] font-black text-base mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[18px]">block</span>
                                환불 불가 항목
                            </p>
                            <ul className="space-y-2.5">
                                <Li>멤버십 결제 후 7일을 초과한 경우</Li>
                                <Li>상품 수령 후 3일을 초과한 경우</Li>
                                <Li>콘텐츠를 실질적으로 이용한 경우</Li>
                                <Li>고객의 훼손으로 가치가 현저히 감소한 경우</Li>
                            </ul>
                        </div>

                        <div className="bg-[#9333EA] rounded-[24px] p-6 text-white shadow-lg shadow-[#9333EA]/20">
                            <p className="text-white font-black text-lg mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">headset_mic</span>
                                환불 및 이용 문의
                            </p>
                            <p className="text-white/80 text-sm font-bold opacity-90 mb-3">immodelkr@gmail.com</p>
                            <p className="text-white/60 text-xs font-medium leading-relaxed">
                                환불 신청 시 주문번호, 결제일자, 환불 사유를 함께 작성하여 이메일로 보내주시기 바랍니다.
                            </p>
                        </div>
                    </div>
                </Section>

                {/* 제6조 Google Drive */}
                <Section num="6" title="Google Drive 연동 서비스">
                    <ul className="space-y-3">
                        <Li mark="①">스마트 프로필 기능은 Google Drive API를 사용하며, 명시적 동의 후에만 접근합니다.</Li>
                        <Li mark="②">접근 권한은 읽기 전용이며, 파일을 수정하거나 삭제하지 않습니다.</Li>
                        <Li mark="③">선택한 파일의 공유 링크만 저장되며, 파일 내용은 서버에 저장되지 않습니다.</Li>
                    </ul>
                </Section>

                {/* 제7조 책임 제한 */}
                <Section num="7" title="책임 제한">
                    <ul className="space-y-3">
                        <Li mark="①">회사는 천재지변 등 불가항력으로 인한 서비스 중단에 책임을 지지 않습니다.</Li>
                        <Li mark="②">회원의 기대 수익 미달에 대해서는 법적 범위 내에서만 책임을 집니다.</Li>
                    </ul>
                </Section>

                {/* 제8조 분쟁 */}
                <Section num="8" title="분쟁 해결">
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
