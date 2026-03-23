import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isLoggedIn } from '../services/userService';

const ProtectedRoute = ({ children }) => {
    if (!isLoggedIn()) {
        return <Navigate to="/" replace />;
    }
    return children ? children : <Outlet />;
};

export default ProtectedRoute;
