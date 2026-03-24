import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import HomeDashboard from './components/HomeDashboard';

import TourDiary from './components/TourDiary';
import AffiliatedAgencies from './components/AffiliatedAgencies';
import AgencyLanding from './components/AgencyLanding';
import AgencyDirectory from './components/AgencyDirectory';
import KimDaepyoTV from './components/KimDaepyoTV';
import AgencyTourCalendar from './components/AgencyTourCalendar';
import AdminPage from './components/AdminPage';
import UpgradePage from './components/UpgradePage';
import ProtectedRoute from './components/ProtectedRoute';
import MembershipBenefits from './components/MembershipBenefits';
import ModelCoupons from './components/ModelCoupons';
import Membership from './components/Membership';
import KimDaepyoMessage from './components/KimDaepyoMessage';
import MocaLounge from './components/MocaLounge';
import GradeCelebrationModal from './components/GradeCelebrationModal';
import MocaShop from './components/MocaShop';
import BenefitsHub from './components/BenefitsHub';
import CertificationFeed from './components/CertificationFeed';
import SmartProfile from './components/SmartProfile';
import ExclusiveContractPage from './components/ExclusiveContractPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { usePageView } from './hooks/usePageView';
import { useAutoLogout } from './hooks/useAutoLogout';
import PopupBanner from './components/PopupBanner';

function AppContent() {
    usePageView(); // 라우트 변경 감지 및 조회수 기록
    useAutoLogout(); // 자동 로그아웃 체크 타이머 등록
    const location = useLocation();
    const isAdmin = location.pathname.startsWith('/admin');

    return (
        <>
            <GradeCelebrationModal />
            {!isAdmin && <PopupBanner />}
            <Routes>
                {/* 에이전시 전용 랜딩 (레이아웃 없음) */}
                <Route path="/" element={<AgencyLanding />} />
                {/* 공개 페이지 (로그인 불필요) */}
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                {/* 보호된 라우트 (로그인 필요) */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/agencies" element={<Layout />}>
                        <Route index element={<AgencyDirectory />} />
                    </Route>

                    {/* 기존 앱 라우트 (현재 /home 로컬 변경됨) */}
                    <Route path="/home" element={<Layout />}>
                        <Route index element={<Navigate to="/home/dashboard" replace />} />
                        <Route path="dashboard" element={<HomeDashboard />} />
                        <Route path="diary" element={<TourDiary />} />
                        <Route path="calendar" element={<AgencyTourCalendar />} />
                        <Route path="content" element={<AffiliatedAgencies />} />
                        <Route path="tv" element={<KimDaepyoTV />} />
                        <Route path="membership" element={<MembershipBenefits />} />
                        <Route path="coupons" element={<ModelCoupons />} />
                        <Route path="message" element={<KimDaepyoMessage />} />
                        <Route path="lounge" element={<MocaLounge />} />
                        <Route path="shop" element={<MocaShop />} />
                        <Route path="benefits" element={<BenefitsHub />} />
                        <Route path="cert" element={<CertificationFeed />} />
                        <Route path="smart-profile" element={<SmartProfile />} />
                        <Route path="contract" element={<ExclusiveContractPage />} />
                    </Route>
                </Route>

                {/* /app 접근 시 랜딩 페이지(/)로 강제 리다이렉트 (이전 URL 대응) */}
                <Route path="/app/*" element={<Navigate to="/" replace />} />

                {/* 관리자 페이지 */}
                <Route path="/admin" element={<AdminPage />} />

                {/* 업그레이드 (페이월) 페이지 */}
                <Route path="/upgrade" element={<UpgradePage />} />

            </Routes>
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
