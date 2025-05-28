// src/app/taupload/page.tsx
"use client"; // This page needs to be a client component to manage auth state dynamically

import { useEffect, useState, useCallback } from 'react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { checkAuth } from '@/app/actions/authActions';
import { LoadingSpinner } from '@/components/custom/LoadingSpinner';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null means loading

  const verifyAuth = useCallback(async () => {
    const authStatus = await checkAuth();
    setIsAuthenticated(authStatus.isAuthenticated);
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
}
