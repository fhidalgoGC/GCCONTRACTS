import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useRouter } from 'wouter';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/layouts/DashboardLayout/view';
import { PurchaseContractForm } from '@/components/PurchaseContractForm/PurchaseContractForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PurchaseSaleContract } from '@/types/purchaseSaleContract.types';
import { getContractById } from '@/services/contracts/contracts.service';

export default function ViewContract() {
  const { t } = useTranslation();
  const params = useParams();
  const [location] = useLocation();
  const router = useRouter();
  const contractId = params.contractId;
  
  // Determinar el tipo de contrato desde la URL
  const contractType = location.includes('/purchase-contracts/') ? 'purchase' : 'sale';
  
  const [contractData, setContractData] = useState<PurchaseSaleContract | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos del contrato directamente del API
  useEffect(() => {
    const loadContractData = async () => {
      if (!contractId) return;
      
      setLoading(true);
      try {
        console.log('📄 VIEW CONTRACT: Cargando contrato desde API:', contractId);
        const response = await getContractById(contractId);
        
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            console.log('✅ VIEW CONTRACT: Contrato cargado exitosamente', result.data);
            setContractData(result.data);
          } else {
            console.warn('⚠️ VIEW CONTRACT: No se encontraron datos del contrato');
          }
        } else {
          console.error('❌ VIEW CONTRACT: Error al cargar contrato:', response.status);
        }
      } catch (error) {
        console.error('❌ VIEW CONTRACT: Error de conexión:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContractData();
  }, [contractId]);

  const handleCancel = () => {
    // Regresar al detalle del contrato
    router.push(`/${contractType}-contracts/${contractId}`);
  };

  if (loading) {
    return (
      <DashboardLayout title="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contractData) {
    return (
      <DashboardLayout title="">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t('contractNotFound')}
            </h1>
            <Button onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToContract')}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="">
      <div className="min-h-0">
        {/* Formulario en modo view */}
        <PurchaseContractForm
          contractType={contractType}
          mode="view"
          contractId={contractId}
          initialContract={contractData}
          onCancel={handleCancel}
        />
      </div>
    </DashboardLayout>
  );
}