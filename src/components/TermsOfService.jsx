import React from 'react';
import { useNavigate } from 'react-router-dom';

const Section = ({ num, title, children }) => (
    <section className="space-y-3">
        <h2 className="text-white font-black text-base flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">{num}</span>
            {title}
        </h2>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
            {children}
        </div>
    </section>
);

const Li = ({ mark = '•', children }) => (
    <li className="flex gap-2 text-white/60 text-sm leading-relaxed">
        <span className="text-white/30 shrink-0">{mark}</span>
        <span>{children}</span>
    </li>
);

const TermsOfService = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10 px-5 py-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-[20px] text-white/60">arrow_back</span>
                </button>
                <h1 className="text-lg font-black text-white">서비스 이용약관 및 환불정책</h1>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">

                {/* 서비스 소개 */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
                    <p className="text-white/60 text-sm leading-relaxed">
                        본 약관은 <strong className="text-white">아임모카(IMMOCA)</strong>가 제공하는 모든 서비스
                        (웹사이트, 앱, 모카 에디트 쇼핑, 멤버십 등)의 이용에 관한 사항을 규정합니다.
                    </p>
                    <p className="text-white/30 text-xs mt-2">시행일: 2026년 3월 1일 | 최종 수정: 2026년 3월 25일</p>
                </div>

                {/* 제1조 목적 */}
                <Section num="1" title="목적">
                    <p className="text-white/60 text-sm leading-relaxed">
                        본 약관은 아임모카(이하 "회사")가 운영하는 IMMOCA 서비스(이하 "서비스")의 이용 조건,
                        회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                    </p>
                </Section>

                {/* 제2조 서비스 내용 */}
                <Section num="2" title="서비스의 내용">
                    <ul className="space-y-2">
                        <Li>모델 에이전시 디렉토리: 에이전시 정보 조회 및 프로필 전송</Li>
                        <Li>스마트 프로필: Google Drive 연동을 통한 포트폴리오 관리 및 원클릭 발송</Li>
                        <Li>모카 에디트 쇼핑: 시간 제한 특가 상품 구매 (URL: https://immoca.kr/shop)</Li>
                        <Li>에이전시 투어 다이어리: 에이전시 방문 기록 관리</Li>
                        <Li>멤버십: 월정액 구독을 통한 프리미엄 서비스 이용</Li>
                        <Li>전속 모델 계약: 전속 계약 체결 및 관리</Li>
                    </ul>
                </Section>

                {/* 제3조 회원 가입 */}
                <Section num="3" title="회원 가입 및 이용">
                    <ul className="space-y-2">
                        <Li mark="①">서비스는 회원 가입 후 이용 가능합니다. 비회원 구매는 불가합니다.</Li>
                        <Li mark="②">회원은 타인의 계정을 사용할 수 없으며, 본인의 정보를 정확히 입력해야 합니다.</Li>
                        <Li mark="③">허위 정보 기입, 타인 사칭 시 서비스 이용이 제한될 수 있습니다.</Li>
                    </ul>
                </Section>

                {/* 제4조 결제 */}
                <Section num="4" title="주문 및 결제">
                    <ul className="space-y-2">
                        <Li mark="①">주문은 결제 완료 시점에 성립됩니다.</Li>
                        <Li mark="②">결제는 <strong className="text-white">토스페이먼츠</strong>를 통해 처리됩니다.</Li>
                        <Li mark="③">단건 결제 최고가는 <strong className="text-white">200,000원</strong>입니다.</Li>
                        <Li mark="④">멤버십 월 구독료는 <strong className="text-white">10,000원/월</strong>이며, 서비스 제공 기간은 1개월(30일)입니다.</Li>
                        <Li mark="⑤">실물 상품의 최대 배송 기간은 결제 후 <strong className="text-white">14일(영업일 기준 5일 내 발송)</strong>입니다.</Li>
                        <Li mark="⑥">재고 소진 및 판매 시간 종료 후에는 구매가 불가합니다.</Li>
                    </ul>
                </Section>

                {/* 제5조 취소 및 환불 ★ 핵심 */}
                <Section num="5" title="취소 및 환불 정책">
                    <div className="space-y-5">
                        {/* 멤버십 */}
                        <div>
                            <p className="text-emerald-400 font-black text-sm mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">card_membership</span>
                                멤버십 (월정액 구독)
                            </p>
                            <ul className="space-y-2">
                                <Li mark="①">결제 후 <strong className="text-white">7일 이내</strong> 환불 신청 가능합니다.</Li>
                                <Li mark="②">단, 프리미엄 콘텐츠를 1회 이상 이용한 경우 환불이 제한될 수 있습니다.</Li>
                                <Li mark="③">구독 기간(30일) 만료 전 자동 취소를 원할 경우, 만료 3일 전까지 고객센터에 요청하셔야 합니다.</Li>
                                <Li mark="④">환불 시 이용 기간에 해당하는 일할 계산 금액을 제외한 잔액을 환불합니다.</Li>
                            </ul>
                        </div>

                        <hr className="border-white/10" />

                        {/* 실물 상품 */}
                        <div>
                            <p className="text-blue-400 font-black text-sm mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                                실물 상품 (모카 에디트 쇼핑)
                            </p>
                            <ul className="space-y-2">
                                <Li mark="①">배송 전 취소: <strong className="text-white">100% 전액 환불</strong></Li>
                                <Li mark="②">상품 수령 후 <strong className="text-white">3일 이내</strong> 환불 신청 가능합니다.</Li>
                                <Li mark="③">단순 변심 반품: 미개봉·미사용 상태에 한하며, 왕복 배송비는 고객 부담입니다.</Li>
                                <Li mark="④">상품 하자·오배송: 수령 후 3일 이내 사진 첨부 후 고객센터 접수 시 100% 환불 또는 재발송 처리합니다.</Li>
                                <Li mark="⑤">개봉 후 사용한 상품은 단순 변심으로 인한 환불이 불가합니다.</Li>
                            </ul>
                        </div>

                        <hr className="border-white/10" />

                        {/* 환불 불가 */}
                        <div>
                            <p className="text-red-400 font-black text-sm mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">block</span>
                                환불 불가 항목
                            </p>
                            <ul className="space-y-2">
                                <Li>멤버십 결제 후 7일을 초과한 경우</Li>
                                <Li>상품 수령 후 3일을 초과한 경우</Li>
                                <Li>콘텐츠를 다운로드하거나 실질적으로 이용한 경우</Li>
                                <Li>고객의 사용·훼손으로 상품 가치가 현저히 감소한 경우</Li>
                            </ul>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mt-2">
                            <p className="text-emerald-300 text-xs font-bold">📞 환불 문의: immodelkr@gmail.com</p>
                            <p className="text-white/40 text-xs mt-1">환불 신청 시 주문번호, 결제일자, 환불 사유를 함께 보내주세요.</p>
                        </div>
                    </div>
                </Section>

                {/* 제6조 Google Drive */}
                <Section num="6" title="Google Drive 연동 서비스">
                    <ul className="space-y-2">
                        <Li mark="①">스마트 프로필 기능은 Google Drive API를 사용하며, 사용자의 명시적 동의 후에만 Drive에 접근합니다.</Li>
                        <Li mark="②">접근 권한은 읽기 전용(drive.readonly)이며, 파일을 수정하거나 삭제하지 않습니다.</Li>
                        <Li mark="③">사용자가 선택한 파일의 공유 링크만 저장되며, 파일 내용은 회사 서버에 저장되지 않습니다.</Li>
                    </ul>
                </Section>

                {/* 제7조 책임 제한 */}
                <Section num="7" title="책임 제한">
                    <ul className="space-y-2">
                        <Li mark="①">회사는 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 책임을 지지 않습니다.</Li>
                        <Li mark="②">회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 손해를 입은 경우, 회사는 법이 허용하는 범위 내에서 책임을 집니다.</Li>
                    </ul>
                </Section>

                {/* 제8조 분쟁 */}
                <Section num="8" title="분쟁 해결">
                    <ul className="space-y-2">
                        <Li>서비스 이용과 관련한 분쟁은 대한민국 법률에 따릅니다.</Li>
                        <Li>고객 문의: immodelkr@gmail.com</Li>
                        <Li>관할 법원: 서울중앙지방법원</Li>
                    </ul>
                </Section>

                {/* 푸터 */}
                <div className="text-center text-white/20 text-xs pt-4 pb-8 border-t border-white/5">
                    <p>© 2026 아임모카(IMMOCA) / 글로벌아임. All rights reserved.</p>
                    <p className="mt-1">사업자등록번호: 365-22-00947 | 대표: 김대희</p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
