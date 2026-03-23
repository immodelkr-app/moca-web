import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';

const Home = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = React.useState('모델 사라');

    React.useEffect(() => {
        const user = getUser();
        if (user) {
            setUserName(user.name);
        }
    }, []);

    return (
        <div className="relative min-h-screen bg-[#0a0a0f] text-white">
            {/* Animated background blobs (copied from Landing for consistency) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#6C63FF]/20 blur-[100px] animate-pulse" />
                <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-[#A78BFA]/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Grid overlay */}
            <div
                className="fixed inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 pt-8 pb-6 sticky top-0 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
                <img src="/logo.png" alt="I'M MODEL" className="h-6 w-auto object-contain opacity-80 invert" />
                <div className="flex items-center gap-4">
                    <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-[24px] text-white/80">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full border-2 border-[#0a0a0f]"></span>
                    </button>
                    <div
                        className="size-9 rounded-full bg-cover bg-center border border-white/10"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDXtpKRNov3O4BfdkFCnMvPoq4aoUuV7p0EPTmmFQWSmbgHSL4bZR7VHBuPNP8WQI5-F6WK3YGoAGDwDF1VangN_dn8Qti5mo9k9TNhGyP3r8hHJnw1zYYtjEGZv2Zjb6FH-jF86N-TMY_mi-ZCCfpSNIbmsHZ6JiGLcVpOM8umTX4SdkQlElGYOMVj-ARA3Lr4zTjSZYbfzZ80pX9CTjV4Hs3f332ETZ1pRYCzaoOHVNYNgTNYD-_skbUHbZvlArFNpc3fprrbI3ts')" }}
                    ></div>
                </div>
            </header>

            <div className="relative z-10 px-6 pb-32">
                {/* Greeting */}
                <section className="mt-6 mb-8">
                    <h1 className="text-[32px] font-black leading-tight tracking-tight text-white">
                        안녕하세요,<br />
                        <span className="bg-gradient-to-r from-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">
                            {userName}님
                        </span>
                    </h1>
                    <p className="text-white/50 mt-2 text-sm font-medium">패션 투어 시작까지 <span className="text-white font-bold">3일</span> 남았습니다.</p>
                </section>


                {/* Message Banner */}
                <section
                    className="relative w-full rounded-2xl overflow-hidden mb-8 cursor-pointer group"
                    onClick={() => navigate('/home/message')}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#C4B5FD] via-[#907FF8] to-[#5B21B6] opacity-90 transition-opacity group-hover:opacity-100" />
                    <div className="absolute -right-4 -top-8 text-white/10 rotate-12 pointer-events-none">
                        <span className="material-symbols-outlined text-[120px]">local_post_office</span>
                    </div>

                    <div className="relative z-10 p-5 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="material-symbols-outlined text-white text-[18px]">local_police</span>
                                <h3 className="text-sm font-black text-white tracking-widest drop-shadow-md">아임모카 공지</h3>
                            </div>
                            <p className="text-white/90 text-[11px] font-medium leading-tight drop-shadow-sm">
                                대표님이 전하는 생생한 꿀팁과<br />회원 한정 시크릿 공지를 확인하세요
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-white text-white group-hover:text-[#5B21B6] transition-colors shadow-lg">
                            <span className="material-symbols-outlined text-[20px] ml-0.5">arrow_forward</span>
                        </div>
                    </div>
                </section>

                {/* Action Buttons */}
                <section className="mb-10">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <button
                            onClick={() => navigate('/map')}
                            className="group flex flex-col items-center justify-center h-36 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all shadow-lg backdrop-blur-sm"
                        >
                            <div className="w-12 h-12 rounded-full bg-[#6C63FF]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[24px] text-[#818CF8]">search</span>
                            </div>
                            <span className="text-sm font-bold text-white/80 tracking-wide">에이전시 찾기</span>
                        </button>
                        <button
                            onClick={() => navigate('/diary')}
                            className="group flex flex-col items-center justify-center h-36 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#A78BFA] text-white hover:opacity-90 transition-all shadow-lg shadow-[#6C63FF]/20"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[24px]">flight_takeoff</span>
                            </div>
                            <span className="text-sm font-bold tracking-wide">투어 시작</span>
                        </button>
                    </div>

                    {/* 혜택 & 쇼핑 전체 너비 버튼 */}
                    <button
                        onClick={() => navigate('/home/benefits')}
                        className="group relative w-full flex items-center justify-between overflow-hidden rounded-2xl px-5 py-4 bg-gradient-to-r from-[#2d1b69] via-[#1e1050] to-[#2d0a3e] border border-purple-500/30 hover:border-purple-400/50 shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                        {/* 반짝이는 배경 효과 */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-purple-600/10 to-pink-600/10" />
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />

                        <div className="relative z-10 flex items-center gap-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl flex items-center justify-center text-xl border border-white/10">
                                💎
                            </div>
                            <div>
                                <p className="text-white font-black text-[15px]">M뷰티&amp;쇼핑 · 혜택 모아보기</p>
                                <p className="text-white/40 text-[11px]">모카 에디트 · 할인쿠폰 · 제휴사 한눈에</p>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-pink-300 bg-pink-500/20 border border-pink-500/30 rounded-full px-2 py-0.5">NEW</span>
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                <span className="material-symbols-outlined text-white/70 text-sm">arrow_forward</span>
                            </div>
                        </div>
                    </button>
                </section>

                {/* Recent Activity */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">최근 활동</h3>
                        <button className="text-xs font-bold text-white/40 hover:text-white transition-colors">전체 보기</button>
                    </div>
                    <div className="space-y-4">
                        <div className="group flex items-center gap-4 py-3 border-b border-white/5 hover:bg-white/5 rounded-xl px-2 -mx-2 transition-colors">
                            <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                                <span className="material-symbols-outlined text-white/50 group-hover:text-white transition-colors">domain</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-white/90">Elite Model Management</h4>
                                <p className="text-xs text-white/40">New York • 어제 방문함</p>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">합격</span>
                        </div>
                        <div className="group flex items-center gap-4 py-3 border-b border-white/5 hover:bg-white/5 rounded-xl px-2 -mx-2 transition-colors">
                            <div className="size-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-colors">
                                <span className="material-symbols-outlined text-white/50 group-hover:text-white transition-colors">domain</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-white/90">IMG Models HQ</h4>
                                <p className="text-xs text-white/40">Paris • 3일 전 방문함</p>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-white/5 text-white/40 border border-white/10">대기 중</span>
                        </div>
                    </div>
                </section>

                {/* Explore Section */}
                <section className="mb-6">
                    <h3 className="text-lg font-bold mb-4 text-white">I'M MODEL 둘러보기</h3>
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-6 px-6 pb-4">
                        {/* Video Card */}
                        <div
                            className="min-w-[280px] bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden group flex-shrink-0 shadow-lg cursor-pointer hover:border-white/20 transition-all"
                            onClick={() => navigate('/content')}
                        >
                            <div
                                className="relative h-40 bg-cover bg-center"
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDpOOfV1A0iIOozQeu2xWWoMrxDVc81a1-1ERBJkSyClqK8pDf_TyXFoOmBrNC72apsK3zXX0fOt_upZpsdO-33y6DmDIgEg-AVkbSTHTLv09Zo9DCsgo075mHEggGdcvQszHm0ciF6nzp2NIlI6Hn94pGoUYCgiPo7_CKb8_vIH11VzRLso0ROzwuVkhjDk_c5YgFAzSzT7aJuDpmUAatcMTo5NIWa-2p5dxEIkpuuG6O9O9SOhweFZ_oJQr59Vi8Cp_GCPobhUEca')" }}
                            >
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <span className="material-symbols-outlined text-white text-[48px] drop-shadow-lg scale-90 group-hover:scale-100 transition-transform">play_circle</span>
                                </div>
                                <div className="absolute top-3 left-3 bg-[#6C63FF] text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-tighter shadow-sm">I'M TV</div>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-sm text-white/90 group-hover:text-[#818CF8] transition-colors">런웨이 워킹 마스터하기</h4>
                                <p className="text-xs text-white/40 mt-1">12분 • 패션 인사이드</p>
                            </div>
                        </div>

                        {/* Shop Card */}
                        <div
                            className="min-w-[280px] bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden group flex-shrink-0 shadow-lg cursor-pointer hover:border-white/20 transition-all"
                            onClick={() => navigate('/content')}
                        >
                            <div
                                className="relative h-40 bg-cover bg-center"
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBelqb5RRmfp0SRQbc5WI6zSNpbp9n_RDSezkXNw1E6ILlPIGXgXDk2IeSKWHOu5fUEXQpDwrjNtbEm3thNd8jH57Bj3g5jLBThNC1v2DCyB0O7fuY47THecqr8hW25OqSCok33kjKIwViNwjvfE4WT76-X90VzBIWtTU7oYCn5bFPN4hmp_U17gS8ZJ5n3h1S_pyO0TO0k1C5u6ONrgeE4EC8sqXulJQwtDdBjWTeKBZTAJd5WnI67g1wvWYF6DPDW5YesDdSrXcLV')" }}
                            >
                                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm border border-white/10">추천 상품</div>
                            </div>
                            <div className="p-4 flex justify-between items-end">
                                <div>
                                    <h4 className="font-bold text-sm text-white/90 group-hover:text-[#C084FC] transition-colors">프로 레더 포트폴리오</h4>
                                    <p className="text-xs text-white/40 mt-1">한정판 • 샵</p>
                                </div>
                                <span className="text-sm font-black text-[#A78BFA]">₩169,000</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Home;
