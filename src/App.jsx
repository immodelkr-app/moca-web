import React, { useEffect } from 'react';
import ClassListPage from './components/ClassListPage';
import ClassDetailPage from './components/ClassDetailPage';
import OpenAppRedirect from './components/OpenAppRedirect';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import Layout from './components/Layout';

import HomeDashboard from './components/HomeDashboard';

import TourDiary from './components/TourDiary';
import AgencyLanding from './components/AgencyLanding';
import AgencyDirectory from './components/AgencyDirectory';
import KimDaepyoTV from './components/KimDaepyoTV';
import AgencyTourCalendar from './components/AgencyTourCalendar';
import AdminPage from './components/AdminPage';
import UpgradePage from './components/UpgradePage';
import UpgradeApplicationPage from './components/UpgradeApplicationPage';
import ProtectedRoute from './components/ProtectedRoute';
import CompanyProtectedRoute from './components/CompanyProtectedRoute';
import CompanyLayout from './components/CompanyLayout';
import CompanyCastingList from './components/CompanyCastingList';
import CompanyCastingForm from './components/CompanyCastingForm';
import CompanyApplicants from './components/CompanyApplicants';
import ModelCastingBoard from './components/ModelCastingBoard';
import ModelCastingDetailPage from './components/ModelCastingDetailPage';
import KimDaepyoMessage from './components/KimDaepyoMessage';
import GradeCelebrationModal from './components/GradeCelebrationModal';
import CertificationFeed from './components/CertificationFeed';
import CeoQuizBoard from './components/CeoQuizBoard';
import SmartProfile from './components/SmartProfile';
import QnABoard from './components/QnABoard';
import ExclusiveContractPage from './components/ExclusiveContractPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { usePageView } from './hooks/usePageView';
import { useAutoLogout } from './hooks/useAutoLogout';
import { useAuthSync } from './hooks/useAuthSync';
import PopupBanner from './components/PopupBanner';
import { initializePushNotifications } from './services/pushNotificationService';
import { isLoggedIn, getUser } from './services/userService';

function AppContent() {
    usePageView(); // 라우트 변경 감지 및 조회수 기록
    useAutoLogout(); // 자동 로그아웃 체크 타이머 등록
    useAuthSync(); // 소셜 로그인 상태 감지 및 동기화

    const location = useLocation();
    const navigate = useNavigate();
    const isAdmin = location.pathname.startsWith('/admin');

    useEffect(() => {
        // 앱 구동 시 현재 로그인 유저의 플랫폼 정보 동기화
        const currentUser = getUser();
        if (currentUser?.id) {
            import('./services/userService').then(({ syncPlatformWithSupabase }) => {
                syncPlatformWithSupabase(currentUser.id);
            }).catch(e => console.error(e));
        }

        if (!Capacitor.isNativePlatform()) return;

        const handleBackButton = async () => {
            const rootPaths = ['/', '/home/dashboard', '/admin'];
            if (rootPaths.includes(location.pathname)) {
                // 최상위 루트 페이지인 경우 앱 종료
                CapacitorApp.exitApp();
            } else {
                // 상세 페이지나 하위 메뉴에서는 이전 페이지로 이동
                // 첫 진입 페이지(히스토리 스택이 비어있는 경우)라면 홈 대시보드로 이동
                if ((window.history.state && window.history.state.idx === 0) || window.history.length <= 1) {
                    navigate('/home/dashboard');
                } else {
                    navigate(-1);
                }
            }
        };

        const backButtonListener = CapacitorApp.addListener('backButton', () => {
            handleBackButton();
        });

        // Initialize push notifications
        initializePushNotifications();

        // Handle routing from push notifications
        // 외부 URL(구글플레이 등)은 앱 내부 라우팅 대신 외부 브라우저/스토어 앱으로 연다
        const goToPushRoute = (route) => {
            if (/^https?:\/\//i.test(route)) {
                Browser.open({ url: route });
            } else {
                navigate(route);
            }
        };
        const handlePushRoute = (e) => {
            if (e.detail) {
                localStorage.removeItem('pending_push_route');
                goToPushRoute(e.detail);
            }
        };
        window.addEventListener('pushNotificationRoute', handlePushRoute);

        // Check if there is a pending push route on mount (Cold Start)
        const pendingRoute = localStorage.getItem('pending_push_route');
        if (pendingRoute) {
            localStorage.removeItem('pending_push_route');
            setTimeout(() => {
                goToPushRoute(pendingRoute);
            }, 150);
        }

        // Handle deep links (custom scheme: immodel://)
        const deepLinkListener = CapacitorApp.addListener('appUrlOpen', (event) => {
            const url = event.url;
            const scheme = 'immodel://';
            if (url.startsWith(scheme)) {
                let path = url.substring(scheme.length);
                path = path.replace(/^\/+/, '');
                if (path) {
                    try {
                        const decodedPath = decodeURIComponent(path);
                        navigate('/' + decodedPath);
                    } catch (e) {
                        navigate('/' + path);
                    }
                }
            }
        });

        return () => {
            backButtonListener.then((listener) => listener.remove());
            deepLinkListener.then((listener) => listener.remove());
            window.removeEventListener('pushNotificationRoute', handlePushRoute);
        };
    }, [location.pathname, navigate]);

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
                <Route path="/open-app" element={<OpenAppRedirect />} />
                {/* 보호된 라우트 (로그인 필요) */}
                {/* 업체(모델캐스팅) 전용 라우트 */}
                <Route element={<CompanyProtectedRoute />}>
                    <Route path="/company" element={<CompanyLayout />}>
                        <Route index element={<Navigate to="/company/castings" replace />} />
                        <Route path="castings" element={<CompanyCastingList />} />
                        <Route path="castings/new" element={<CompanyCastingForm />} />
                        <Route path="castings/:id/edit" element={<CompanyCastingForm />} />
                        <Route path="castings/:id/applicants" element={<CompanyApplicants />} />
                    </Route>
                </Route>

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
                        <Route path="tv" element={<KimDaepyoTV />} />
                        <Route path="message" element={<KimDaepyoMessage />} />
                        <Route path="cert" element={<CertificationFeed />} />
                        <Route path="quiz" element={<CeoQuizBoard />} />
                        <Route path="smart-profile" element={<SmartProfile />} />
                        <Route path="qna" element={<QnABoard />} />

                        <Route path="class" element={<ClassListPage />} />
                        <Route path="class/:id" element={<ClassDetailPage />} />

                        <Route path="castings" element={<ModelCastingBoard />} />
                        <Route path="castings/:id" element={<ModelCastingDetailPage />} />
                    </Route>
                </Route>

                {/* /app 접근 시 랜딩 페이지(/)로 강제 리다이렉트 (이전 URL 대응) */}
                <Route path="/app/*" element={<Navigate to="/" replace />} />

                {/* 관리자 페이지 */}
                <Route path="/admin" element={<AdminPage />} />

                {/* 업그레이드 (페이월) 페이지 */}
                <Route path="/upgrade" element={<UpgradeApplicationPage />} />
                <Route path="/upgrade-apply" element={<UpgradeApplicationPage />} />

                {/* 전속계약서 (공개 접근 허용) */}
                <Route path="/contract" element={<ExclusiveContractPage />} />
                <Route path="/contract/:name" element={<ExclusiveContractPage />} />
                <Route path="/home/contract" element={<Navigate to="/contract" replace />} />
                
                {/* 정의되지 않은 경로 처리 (빈 화면 방지) */}
                <Route path="*" element={<Navigate to={isLoggedIn() ? (getUser()?.user_type === 'company' ? '/company/castings' : '/home/dashboard') : '/'} replace />} />

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
