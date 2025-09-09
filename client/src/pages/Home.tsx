import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../features/auth/hooks/useAuth';
import { usePageTracking, useNavigationHandler } from '@/hooks/usePageState';
import DashboardLayout from '@/layouts/DashboardLayout/view';

export default function Home() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { handleNavigateToPage } = useNavigationHandler();
  usePageTracking('/home');

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);
  
  // Notificar navegación jerárquica al cargar la página
  useEffect(() => {
    console.log('🔄 HOME PAGE: Cargando dashboard y ejecutando navegación jerárquica');
    handleNavigateToPage('dashboard');
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout title={t('dashboard')}>
      <div className="space-y-8">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {t('welcome')}
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-green-600 to-green-400 mt-1 rounded-full"></div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('welcomeMessage')}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}