import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { usePageTracking, useNavigationHandler } from '@/hooks/usePageState';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function SaleContracts() {
  const { t } = useTranslation();
  const { handleNavigateToPage } = useNavigationHandler();
  usePageTracking('/sale-contracts');
  
  // Notificar navegación jerárquica al cargar la página
  useEffect(() => {
    console.log('🔄 SALE CONTRACTS PAGE: Cargando página y ejecutando navegación jerárquica');
    handleNavigateToPage('saleContracts');
  }, []);

  return (
    <DashboardLayout title={t('saleContracts')}>
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {t('saleContracts')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('saleContractsDescription')}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}