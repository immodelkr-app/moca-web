import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../services/userService';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();

    if (!isLoggedIn()) {
        sessionStorage.setItem('redirect_to', location.pathname + location.search);
        return <Navigate to="/" replace />;
    }
    return children ? children : <Outlet />;
};

export default ProtectedRoute;
