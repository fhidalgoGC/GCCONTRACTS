import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/layouts/DashboardLayout/view";
import { PurchaseContractForm } from "@/components/PurchaseContractForm/PurchaseContractForm";
import {
  generateContractId,
  submitContract,
} from "@/services/contracts/contracts.service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CreatePurchaseContract() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const params = useParams();
  const urlContractId = params.contractId;
  const [contractId, setContractId] = useState<string | undefined>(urlContractId);
  const [errorModal, setErrorModal] = useState({ open: false, message: "" });
  const [successModal, setSuccessModal] = useState({ open: false, folio: "" });


  // Función para manejar cancelación - solo navegar
  const handleCancel = () => {
    console.log("🧹 CreatePurchaseContract: Navegando a purchase-contracts");
    setLocation("/purchase-contracts");
  };

  // Función para manejar submit del contrato
  const handleSubmitContract = async (contractId:string,contractData: any) => {
    console.log("que paso", contractId);
    if (!contractId) {
      throw new Error("No contract ID available");
    }

    console.log("📝 CreatePurchaseContract: Submitting contract", contractId);
    const result = await submitContract(contractId, contractData);

    if (result.success) {
      console.log("✅ Contract submitted successfully:", result.data);
      
      // Extract folio from response
      const folio = result.data?.folio || result.data?.data?.folio || contractId;
      setSuccessModal({ open: true, folio });
    } else {
      console.error("❌ Contract submission failed:", result.error);
      setErrorModal({
        open: true,
        message: result.error || "Error desconocido al crear el contrato",
      });
      // No lanzar error adicional para evitar el modal genérico de runtime error
    }
  };

  return (
    <DashboardLayout title={t("createPurchaseContract")}>
      <div className="min-h-0">
        <PurchaseContractForm
          contractType="purchase"
          mode="create"
          contractId={urlContractId}
          representativeRole="buyer"
          onCancel={handleCancel}
          onSubmitContract={handleSubmitContract}
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
              ❌ Error al crear contrato
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
        onOpenChange={(open) => {
          setSuccessModal((prev) => ({ ...prev, open }));
          if (!open) {
            // Redirect to contracts list when modal is closed
            setLocation("/purchase-contracts");
          }
        }}
      >
        <AlertDialogContent className="border-green-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-700 dark:text-green-400">
              ✅ Contrato creado exitosamente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-green-600 dark:text-green-300">
              El contrato se ha creado correctamente con el folio: <strong>{successModal.folio}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
              onClick={() => {
                setSuccessModal({ open: false, folio: "" });
                setLocation("/purchase-contracts");
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
