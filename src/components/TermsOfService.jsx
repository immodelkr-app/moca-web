import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/10 px-5 py-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px] text-white/60">arrow_back</span>
                </button>
                <h1 className="text-lg font-black text-white">서비스 이용약관</h1>
            </div>

            <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
                {/* 서비스 소개 */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
                    <p className="text-white/60 text-sm leading-relaxed">
                        본 약관은 <strong className="text-white">아임모카(IMMOCA)</strong>가 제공하는 모든 서비스(웹사이트, 앱, 모카 에디트 쇼핑 등)의 이용에 관한 사항을 규정합니다.
                    </p>
                    <p className="text-white/30 text-xs mt-2">시행일: 2026년 3월 1일 | 최종 수정: 2026년 3월 24일</p>
                </div>

                {/* 제1조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">1</span>
                        목적
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <p className="text-white/60 text-sm leading-relaxed">
                            본 약관은 아임모카(이하 "회사")가 운영하는 IMMOCA 서비스(이하 "서비스")의 이용 조건, 회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                        </p>
                    </div>
                </section>

                {/* 제2조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">2</span>
                        서비스의 내용
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">•</span>모델 에이전시 디렉토리: 에이전시 정보 조회 및 프로필 전송</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>스마트 프로필: Google Drive 연동을 통한 포트폴리오 관리 및 원클릭 발송</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>모카 에디트 쇼핑: 시간 제한 특가 상품 구매</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>에이전시 투어 다이어리: 에이전시 방문 기록 관리</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>멤버십 & 등급: 활동에 따른 등급 시스템 운영</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>전속 모델 계약: 전속 계약 체결 및 관리</li>
                        </ul>
                    </div>
                </section>

                {/* 제3조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">3</span>
                        회원 가입 및 이용
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">①</span>서비스는 회원 가입 후 이용 가능합니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">②</span>회원은 타인의 계정을 사용할 수 없으며, 본인의 정보를 정확히 입력해야 합니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">③</span>허위 정보 기입, 타인 사칭 시 서비스 이용이 제한될 수 있습니다.</li>
                        </ul>
                    </div>
                </section>

                {/* 제4조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">4</span>
                        Google Drive 연동 서비스
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">①</span>스마트 프로필 기능은 Google Drive API를 사용하며, 사용자의 명시적 동의 후에만 Drive에 접근합니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">②</span>접근 권한은 읽기 전용(drive.readonly)이며, 파일을 수정하거나 삭제하지 않습니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">③</span>사용자가 선택한 파일의 공유 링크만 저장되며, 파일 내용은 회사 서버에 저장되지 않습니다.</li>
                        </ul>
                    </div>
                </section>

                {/* 제5조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">5</span>
                        주문 및 결제
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">①</span>주문은 결제 완료 시점에 성립됩니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">②</span>결제는 토스페이먼츠를 통해 처리됩니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">③</span>재고 소진 및 판매 시간 종료 후에는 구매가 불가합니다.</li>
                        </ul>
                    </div>
                </section>

                {/* 제6조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">6</span>
                        취소 및 환불
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">①</span>배송 전 취소: 100% 환불</li>
                            <li className="flex gap-2"><span className="text-white/30">②</span>상품 하자: 수령 후 7일 이내 환불 가능</li>
                            <li className="flex gap-2"><span className="text-white/30">③</span>단순 변심: 미개봉 시 수령 후 7일 이내 반품 가능 (배송비 고객 부담)</li>
                        </ul>
                    </div>
                </section>

                {/* 제7조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">7</span>
                        책임 제한
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">①</span>회사는 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 책임을 지지 않습니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">②</span>회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 손해를 입은 경우, 회사는 이에 대해 법이 허용하는 범위 내에서 책임을 집니다.</li>
                        </ul>
                    </div>
                </section>

                {/* 제8조 */}
                <section className="space-y-3">
                    <h2 className="text-white font-black text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-black">8</span>
                        분쟁 해결
                    </h2>
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <ul className="text-white/60 text-sm space-y-2">
                            <li className="flex gap-2"><span className="text-white/30">•</span>서비스 이용과 관련한 분쟁은 대한민국 법률에 따릅니다.</li>
                            <li className="flex gap-2"><span className="text-white/30">•</span>문의: immodelkr@gmail.com</li>
                        </ul>
                    </div>
                </section>

                {/* 푸터 */}
                <div className="text-center text-white/20 text-xs pt-4 pb-8 border-t border-white/5">
                    <p>© 2026 아임모카(IMMOCA). All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
