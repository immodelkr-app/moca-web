import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isLoggedIn, getUser } from '../services/userService';

/**
 * 업체(user_type === 'company') 계정만 접근 가능한 라우트 가드
 */
const CompanyProtectedRoute = () => {
    const location = useLocation();

    if (!isLoggedIn()) {
        sessionStorage.setItem('redirect_to', location.pathname + location.search);
        return <Navigate to="/" replace />;
    }

    const user = getUser();
    if (user?.user_type !== 'company') {
        return <Navigate to="/home/dashboard" replace />;
    }

    return <Outlet />;
};

export default CompanyProtectedRoute;
