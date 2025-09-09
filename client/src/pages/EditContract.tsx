import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/layouts/DashboardLayout/view';
import { PurchaseContractForm } from '@/components/PurchaseContractForm/PurchaseContractForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PurchaseSaleContract } from '@/types/purchaseSaleContract.types';
import { submitContract, getContractById } from '@/services/contracts/contracts.service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function EditContract() {
  const { t } = useTranslation();
  const params = useParams();
  const [location, setLocation] = useLocation();
  const contractId = params.contractId;
  
  // Determinar el tipo de contrato desde la URL
  const contractType = location.includes('/purchase-contracts/') ? 'purchase' : 'sale';

  const [contractData, setContractData] = useState<PurchaseSaleContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });
  const [successModal, setSuccessModal] = useState({ open: false, folio: "" });

  // Cargar datos del contrato directamente del API
  useEffect(() => {
    const loadContractData = async () => {
      if (!contractId) return;
      
      setLoading(true);
      try {
        console.log('📝 EDIT CONTRACT: Cargando contrato desde API:', contractId);
        const response = await getContractById(contractId);
        
        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            console.log('✅ EDIT CONTRACT: Contrato cargado exitosamente', result.data);
            setContractData(result.data);
          } else {
            console.warn('⚠️ EDIT CONTRACT: No se encontraron datos del contrato');
          }
        } else {
          console.error('❌ EDIT CONTRACT: Error al cargar contrato:', response.status);
        }
      } catch (error) {
        console.error('❌ EDIT CONTRACT: Error de conexión:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContractData();
  }, [contractId]);

  const handleCancel = () => {
    // Regresar al detalle del contrato
    setLocation(`/${contractType}-contracts/${contractId}`);
  };

  // Función para manejar submit del contrato actualizado
  const handleSubmitContract = async (contractId: string, contractData: any) => {
    console.log("📝 EditContract: Submitting updated contract", contractId);
    
    try {
      const result = await submitContract(contractId, contractData);

      if (result.success) {
        console.log("✅ Contract updated successfully:", result.data);
        
        // Extract folio from response
        const folio = result.data?.folio || result.data?.data?.folio || contractId;
        setSuccessModal({ open: true, folio });
      } else {
        console.error("❌ Contract update failed:", result.error);
        setErrorModal({
          open: true,
          message: result.error || "Error desconocido al actualizar el contrato",
        });
      }
    } catch (error) {
      console.error("❌ Contract update error:", error);
      setErrorModal({
        open: true,
        message: "Error al actualizar el contrato",
      });
    }
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
        {/* Formulario en modo edit */}
        <PurchaseContractForm
          contractType={contractType}
          mode="edit"
          contractId={contractId}
          initialContract={contractData}
          onCancel={handleCancel}
          onSubmitContract={handleSubmitContract}
          representativeRole={contractType === 'purchase' ? 'buyer' : 'seller'}
        />
      </div>

      {/* Error Modal */}
      <AlertDialog
        open={errorModal.open}
        onOpenChange={(open) => setErrorModal((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent className="border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700 dark:text-red-400">
              ❌ Error al actualizar contrato
            </AlertDialogTitle>
            <AlertDialogDescription className="text-red-600 dark:text-red-300">
              {errorModal.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              onClick={() => setErrorModal({ open: false, message: "" })}
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal */}
      <AlertDialog
        open={successModal.open}
        onOpenChange={(open) => setSuccessModal((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent className="border-green-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-700 dark:text-green-400">
              ✅ Contrato actualizado exitosamente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-green-600 dark:text-green-300">
              El contrato ha sido actualizado correctamente con folio: {successModal.folio}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
              onClick={() => {
                setSuccessModal({ open: false, folio: "" });
                // Redirigir a ContractDetail con refresh para recargar datos
                setLocation(`/${contractType}-contracts/${contractId}?refresh=true`);
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}