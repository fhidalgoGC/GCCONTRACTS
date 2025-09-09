import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation } from "wouter";
import {
  useContractDetailState,
  usePageTracking,
  useNavigationHandler,
} from "@/hooks/usePageState";
import { useSelector, useDispatch } from "react-redux";
import {
  updateCreateSubContractState,
  updateEditSubContractState,
} from "@/store/slices/pageStateSlice";
import DashboardLayout from "@/layouts/DashboardLayout/view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  Printer,
  Plus,
  RefreshCw,
  Loader2,
  X,
  Lock,
} from "lucide-react";
import { Link } from "wouter";
import { PurchaseContract } from "@/types/purchaseSaleContract.types";
import { formatNumber } from "@/lib/numberFormatter";
import { environment } from "@/environment";
import SubContractsSection from "@/components/contracts/SubContractsSection";
import {
  SubContract,
  FieldConfig,
  ProgressBarConfig,
} from "@/components/contracts/SubContractCard";
import { hasAuthTokens } from "@/utils/apiInterceptors";
import {
  deleteSubContract,
  getContractById,
  getSubContractsByContractId,
  getParticipantLocation,
  deleteContract,
  settleParentContract,
  settleSubContract,
  generateAndDownloadPDF,
} from "@/services/contracts/contracts.service";

export default function ContractDetail() {
  const { t } = useTranslation();
  const params = useParams();
  const [location, setLocation] = useLocation();

  const contractId = params.id;

  // Hook para persistir estado del detalle de contrato
  const { contractState, updateState } = useContractDetailState(contractId!);
  const { handleNavigateToPage } = useNavigationHandler();

  // Detectar tipo de contrato basado en la URL
  const contractType = location.includes("/sale-contracts/")
    ? "sale"
    : "purchase";

  // Obtener contratos del state de Redux basado en el tipo
  const contractsState = useSelector((state: any) =>
    contractType === "sale"
      ? state.pageState.saleContracts
      : state.pageState.purchaseContracts,
  );
  const contractsData = contractsState.contractsData || [];

  // Get dispatch function for updating Redux state
  const dispatch = useDispatch();

  usePageTracking(`/${contractType}-contracts/${contractId}`);

  // Notificar navegación al cargar la página
  useEffect(() => {
    handleNavigateToPage("contractDetail", contractId);
  }, [contractId]);

  // Detectar parámetro refresh en URL y disparar actualización completa
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRefresh = urlParams.get("refresh") === "true";

    if (shouldRefresh && contractId) {
      console.log("🔄 Refresh parameter detected, triggering full refresh");
      // Limpiar el parámetro de la URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);

      // Disparar refresh inmediatamente
      handleFullRefresh();
    }
  }, [location, contractId]);

  // Estados
  const [contract, setContract] = useState<PurchaseContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(
    contractState.activeTab || "general",
  );

  // Estado para el contrato específico encontrado
  const [currentContractData, setCurrentContractData] = useState<any>(null);
  
  


  // Estado para la dirección del participante
  const [participantAddress, setParticipantAddress] =
    useState<string>("Loading address...");
  const [subContractsData, setSubContractsData] = useState<any[]>([]);
  const [loadingSubContracts, setLoadingSubContracts] =
    useState<boolean>(false);
  const [refreshingContract, setRefreshingContract] = useState<boolean>(false);
  const [fullScreenLoading, setFullScreenLoading] = useState<boolean>(false);

  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Sub-contract delete modal states
  const [showDeleteSubContractModal, setShowDeleteSubContractModal] =
    useState<boolean>(false);
  const [deletingSubContract, setDeletingSubContract] =
    useState<boolean>(false);
  const [selectedSubContractForDelete, setSelectedSubContractForDelete] =
    useState<any>(null);

  // Sub-contract settle modal states
  const [showSettleSubContractModal, setShowSettleSubContractModal] =
    useState<boolean>(false);
  const [settlingSubContract, setSettlingSubContract] =
    useState<boolean>(false);
  const [selectedSubContractForSettle, setSelectedSubContractForSettle] =
    useState<any>(null);

  // Parent contract settle modal states
  const [showSettleContractModal, setShowSettleContractModal] =
    useState<boolean>(false);
  const [settlingContract, setSettlingContract] = useState<boolean>(false);

  // Error modal states
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Print loading state
  const [printingSubContractId, setPrintingSubContractId] = useState<
    string | null
  >(null);
  const [printingContractId, setPrintingContractId] = useState<string | null>(
    null,
  );

  // Función para cargar la dirección del participante usando el interceptor addJwtPk
  const loadParticipantAddress = async (participantId: string) => {
    try {
      const authCheck = hasAuthTokens();
      if (!authCheck.isAuthenticated) {
        console.error(
          "❌ No se encontraron tokens de autenticación o partition key",
        );
        setParticipantAddress("Address requires authentication");
        return;
      }

      // Usar el servicio contracts.service
      const response = await getParticipantLocation(participantId);

      if (response.ok) {
        const data = await response.json();

        if (
          data.data &&
          data.data.string_format &&
          data.data.string_format !== "-"
        ) {
          setParticipantAddress(data.data.string_format);
        } else if (data.data) {
          // Construir dirección manualmente si no viene el string_format
          const address = data.data;
          if (address.address_line_1 !== "-" && address.city !== "-") {
            const formattedAddress = `${address.address_line_1}, ${address.city}, ${address.state_code} ${address.zip_code}, ${address.country_slug}`;
            setParticipantAddress(formattedAddress);
          } else {
            setParticipantAddress("Address not available");
          }
        } else {
          setParticipantAddress("No address data available");
        }
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Error al cargar dirección:",
          response.status,
          errorText,
        );
        setParticipantAddress(
          `Error ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("❌ Error al cargar dirección del participante:", error);
      setParticipantAddress("Error loading address");
    }
  };

  // Función completa de refresh con overlay de pantalla completa y mínimo 0.3 segundos
  const handleFullRefresh = async () => {
    console.log("YEAYEA",contractId);
    if (!contractId) return;
    
    console.log("🔄 Iniciando refresh...");
    setFullScreenLoading(true);
    const startTime = Date.now();

    try {
      console.log("🔄 Full refresh started for contract:", contractId);

      const authCheck = hasAuthTokens();
      if (!authCheck.isAuthenticated) {
        console.error("❌ No authentication tokens available for full refresh");
        return;
      }

      // Ejecutar ambos endpoints en paralelo para mejor rendimiento
      const [contractResponse, subContractsResponse] = await Promise.all([
        // 1. Refresh del contrato principal
        getContractById(contractId),
        // 2. Refresh de sub-contratos
        getSubContractsByContractId(contractId),
      ]);

      // Procesar respuesta del contrato principal
      if (contractResponse.ok) {
        const contractResult = await contractResponse.json();
        console.log("✅ Contract data refreshed successfully:", contractResult);

        if (contractResult.data) {
          // Actualizar datos del contrato
          setCurrentContractData(contractResult.data);
          setLoading(false);

          // Cargar dirección del seller
          const seller = contractResult.data.participants?.find(
            (p: any) => p.role === "seller",
          );
          if (seller && seller.people_id) {
            loadParticipantAddress(seller.people_id);
          }
        }
      } else {
        console.error(
          "❌ Failed to refresh contract data:",
          contractResponse.status,
          contractResponse.statusText,
        );
      }

      // Procesar respuesta de sub-contratos
      if (subContractsResponse.ok) {
        const subContractsResult = await subContractsResponse.json();
        console.log(
          "✅ Sub-contracts data refreshed successfully:",
          subContractsResult,
        );

        if (subContractsResult.data && Array.isArray(subContractsResult.data)) {
          console.log(
            `✅ ${subContractsResult.data.length} sub-contratos refrescados exitosamente`,
          );

          // Transformar datos del API al formato esperado por SubContractCard
          const transformedData = subContractsResult.data.map(
            (item: any, index: number) => {
              const colors = [
                {
                  border: "border-l-blue-500",
                  dot: "bg-blue-500",
                  text: "text-blue-600",
                },
                {
                  border: "border-l-green-500",
                  dot: "bg-green-500",
                  text: "text-green-600",
                },
                {
                  border: "border-l-purple-500",
                  dot: "bg-purple-500",
                  text: "text-purple-600",
                },
                {
                  border: "border-l-orange-500",
                  dot: "bg-orange-500",
                  text: "text-orange-600",
                },
                {
                  border: "border-l-red-500",
                  dot: "bg-red-500",
                  text: "text-red-600",
                },
                {
                  border: "border-l-pink-500",
                  dot: "bg-pink-500",
                  text: "text-pink-600",
                },
                {
                  border: "border-l-yellow-500",
                  dot: "bg-yellow-500",
                  text: "text-yellow-600",
                },
                {
                  border: "border-l-indigo-500",
                  dot: "bg-indigo-500",
                  text: "text-indigo-600",
                },
              ];
              const color = colors[index % colors.length];

              const quantity = item.quantity || 0;
              const reserved = item.inventory?.reserved || 0;
              const unreserved = quantity - reserved;

              console.log("🔍 Sub-contract measurement unit debug:", {
                item_id: item._id,
                measurement_unit: item.measurement_unit,
                measurement_unit_id: item.measurement_unit_id,
                folio: item.folio,
              });

              return {
                id: item._id || `subcontract-${index}`,
                contractNumber: item.folio || `Sub-Contract ${index + 1}`,
                quantity: quantity,
                unit: (() => {
                  // Map measurement unit values to display labels
                  const unitMap: Record<string, string> = {
                    unit_tons: "Tons",
                    unit_kg: "Kg",
                    unit_bushels: "Bushels",
                    unit_cwt: "CWT",
                    unit_mt: "MT",
                  };
                  return (
                    unitMap[item.measurement_unit || ""] ||
                    item.measurement_unit ||
                    "Unknown Unit"
                  );
                })(),
                thresholds: {
                  min: item.thresholds?.min_thresholds_weight || 0,
                  max: item.thresholds?.max_thresholds_weight || 0,
                },
                basis: item.price_schedule?.[0]?.basis || 0,
                price: item.price_schedule?.[0]?.price || 0,
                future: item.price_schedule?.[0]?.future_price || 0,
                delivered: item.inventory?.settled || 0,
                reserved: reserved,
                unreserved: unreserved,
                balance: unreserved,
                totalPayment:
                  item.inventory_value?.total || item.total_price || 0,
                borderColor: color.border,
                dotColor: color.dot,
                textColor: color.text,
                // Conservar datos originales para acceso directo por key
                ...item,
              };
            },
          );

          setSubContractsData(transformedData);
        }
      } else {
        console.error(
          "❌ Failed to refresh sub-contracts data:",
          subContractsResponse.status,
          subContractsResponse.statusText,
        );
      }
    } catch (error) {
      console.error("❌ Error during full refresh:", error);
    } finally {
      // Calcular tiempo transcurrido y asegurar duración mínima de 0.3 segundos
      const elapsedTime = Date.now() - startTime;
      const minimumDuration = 300; // 0.3 segundos en milisegundos
      const remainingTime = Math.max(0, minimumDuration - elapsedTime);


      // Quitar el loading de pantalla completa
      setFullScreenLoading(false);
      console.log("✅ Full refresh completed");
    }
  };

  // Función para eliminar contrato
  const handleDeleteContract = async () => {
    if (!contractId) return;

    setDeleting(true);
    const startTime = Date.now();

    try {
      console.log("🗑️ Deleting contract:", contractId);

      const authCheck = hasAuthTokens();
      if (!authCheck.isAuthenticated) {
        console.error(
          "❌ No authentication tokens available for delete operation",
        );
        return;
      }

      // Call delete endpoint using the service
      const response = await deleteContract(contractId);

      if (response.ok) {
        console.log("✅ Contract deleted successfully");

        // Calculate elapsed time and ensure minimum duration of 0.3 seconds
        const elapsedTime = Date.now() - startTime;
        const minimumDuration = 300; // 0.3 seconds in milliseconds
        const remainingTime = Math.max(0, minimumDuration - elapsedTime);


        // Navigate back to contracts list
        setLocation(`/${contractType}-contracts`);
      } else {
        console.error(
          "❌ Failed to delete contract:",
          response.status,
          response.statusText,
        );
        const errorText = await response.text();
        console.error("Delete error details:", errorText);
      }
    } catch (error) {
      console.error("❌ Error deleting contract:", error);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Función para eliminar sub-contrato
  const handleDeleteSubContract = async () => {
    if (!selectedSubContractForDelete) return;

    setDeletingSubContract(true);
    const startTime = Date.now();

    try {
      console.log("🗑️ Deleting sub-contract:", selectedSubContractForDelete.id);

      await deleteSubContract(selectedSubContractForDelete.id);
      console.log("✅ Sub-contract deleted successfully");

      // Calculate elapsed time and ensure minimum duration of 0.3 seconds
      const elapsedTime = Date.now() - startTime;
      const minimumDuration = 300; // 0.3 seconds in milliseconds
      const remainingTime = Math.max(0, minimumDuration - elapsedTime);

      // Wait for remaining time if API was faster than minimum duration

      // Close modal and refresh data
      setShowDeleteSubContractModal(false);
      setSelectedSubContractForDelete(null);

      // Usar la misma función de refresh que el botón actualizar
      await handleFullRefresh();
    } catch (error) {
      console.error("❌ Error deleting sub-contract:", error);
    } finally {
      setDeletingSubContract(false);
    }
  };

  // Función para abrir modal de confirmación de eliminación de sub-contrato
  const openDeleteSubContractModal = (subContractId: string) => {
    const subContract = subContractsData.find((sc) => sc.id === subContractId);
    if (subContract) {
      setSelectedSubContractForDelete(subContract);
      setShowDeleteSubContractModal(true);
    }
  };

  // Función para abrir modal de confirmación de liquidación de sub-contrato
  const openSettleSubContractModal = (subContractId: string) => {
    const subContract = subContractsData.find((sc) => sc.id === subContractId);
    if (subContract) {
      setSelectedSubContractForSettle(subContract);
      setShowSettleSubContractModal(true);
    }
  };

  // Función para abrir modal de confirmación de liquidación de contrato padre
  const openSettleContractModal = () => {
    setShowSettleContractModal(true);
  };

  // Función para manejar liquidación de contrato padre
  const handleSettleContract = async () => {
    if (!currentContractData) return;

    setSettlingContract(true);
    const startTime = Date.now();

    try {
      const contractId = currentContractData.id || currentContractData._id;
      console.log("✅ Settling parent contract:", contractId);

      // Llamar al servicio para liquidar contrato padre
      const response = await settleParentContract(contractId);

      if (response.ok) {
        console.log("✅ Contrato padre liquidado exitosamente");

        // Solo cerrar modal y refrescar si es exitoso
        setShowSettleContractModal(false);
        await handleFullRefresh();
      } else {
        console.error(
          "❌ Error al liquidar contrato padre:",
          response.statusText,
        );

        // Manejar error del API
        let errorText = "";
        try {
          const errorData = await response.json();
          errorText =
            errorData.messages?.value || t("settleContract.error.serverError");
        } catch {
          errorText =
            response.status === 500
              ? t("settleContract.error.serverError")
              : t("settleContract.error.serverError");
        }

        setErrorMessage(errorText);
        setShowErrorModal(true);
        setShowSettleContractModal(false);
      }
    } catch (error) {
      console.error("❌ Error al liquidar contrato padre:", error);

      // Error de conexión o código
      setErrorMessage(t("settleContract.error.serverError"));
      setShowErrorModal(true);
      setShowSettleContractModal(false);
    } finally {


      setSettlingContract(false);
    }
  };

  // Función para manejar liquidación de sub-contrato
  const handleSettleSubContract = async () => {
    if (!selectedSubContractForSettle) return;

    setSettlingSubContract(true);
    const startTime = Date.now();

    try {
      console.log("✅ Settling sub-contract:", selectedSubContractForSettle.id);

      // Llamar al servicio para liquidar sub-contrato
      const response = await settleSubContract(selectedSubContractForSettle.id);

      if (response.ok) {
        console.log("✅ Sub-contract settled successfully");

        // Solo cerrar modal y refrescar si es exitoso
        setShowSettleSubContractModal(false);
        setSelectedSubContractForSettle(null);
        await handleFullRefresh();
      } else {
        console.error(
          "❌ Error al liquidar sub-contrato:",
          response.statusText,
        );

        // Manejar error del API
        let errorText = "";
        try {
          const errorData = await response.json();
          errorText =
            errorData.messages?.value || t("settleContract.error.serverError");
        } catch {
          errorText =
            response.status === 500
              ? t("settleContract.error.serverError")
              : t("settleContract.error.serverError");
        }

        setErrorMessage(errorText);
        setShowErrorModal(true);
        setShowSettleSubContractModal(false);
        setSelectedSubContractForSettle(null);
      }
    } catch (error: any) {
      console.error("❌ Error settling sub-contract:", error);

      // Error de conexión o código
      setErrorMessage(t("settleContract.error.serverError"));
      setShowErrorModal(true);
      setShowSettleSubContractModal(false);
      setSelectedSubContractForSettle(null);
    } finally {


      setSettlingSubContract(false);
    }
  };

  // Función para mapear datos del contrato padre a JSON para imprimir
  const mapContractDataForPrint = (contractData: any) => {
    const seller = contractData?.participants?.find(
      (p: any) => p.role === "seller",
    );
    const buyer = contractData?.participants?.find(
      (p: any) => p.role === "buyer",
    );
    const priceSchedule = contractData?.price_schedule?.[0] || {};
    const logisticSchedule = contractData?.logistic_schedule?.[0] || {};
    const inventory = contractData?.inventory || {};
    const inventoryValue = contractData?.inventory_value || {};
    const thresholds = contractData?.thresholds || {};

    // Format numbers for display
    const formatNumber = (num: number, decimals: number = 2) => {
      if (isNaN(num) || num === null || num === undefined) return "0.00";
      return num.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };

    // Format currency
    const formatCurrency = (num: number) => {
      if (isNaN(num) || num === null || num === undefined) return "$ 0.00";
      return `$ ${formatNumber(num, 2)}`;
    };

    // Format date
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
    };

    const printData = {
      data: {
        path: `/api/v1/contracts/sp-contracts/${contractData?.id || contractData?._id}`,
        id: contractData?.id || contractData?._id,
        _partitionKey: contractData?._partitionKey,
        active: contractData?.active ?? true,
        created_by: contractData?.created_by,
        created_at: contractData?.created_at,
        folio: contractData?.folio,
        type: contractData?.type,
        sub_type: contractData?.sub_type,
        commodity: {
          commodity_id: contractData?.commodity?.commodity_id,
          name: contractData?.commodity?.name,
        },
        grade: contractData?.grade,
        participants: contractData?.participants || [],
        price_schedule: contractData?.price_schedule || [],
        logistic_schedule: contractData?.logistic_schedule || [],
        inventory: inventory,
        inventory_value: inventoryValue,
        quantity: contractData?.quantity,
        reference_number: contractData?.reference_number || "NA",
        measurement_unit_id: contractData?.measurement_unit_id,
        measurement_unit: contractData?.measurement_unit,
        shipping_start_date: contractData?.shipping_start_date,
        shipping_end_date: contractData?.shipping_end_date,
        application_priority: contractData?.application_priority,
        delivered: contractData?.delivered || "FOB",
        transport: contractData?.transport || "Truck",
        weights: contractData?.weights || "origin",
        inspections: contractData?.inspections || "origin",
        proteins: contractData?.proteins || "origin",
        thresholds: thresholds,
        status: contractData?.status,
        payment_terms: contractData?.payment_terms || "Net 30",
        assesment: contractData?.assesment ?? false,
        contract_date: contractData?.contract_date,
        contractDate: formatDate(contractData?.contract_date),
        contractNumber: contractData?.reference_number || "NA",
        fob: "-",
        contact: "-",
        instructions: "-",
        instructionsPdf: "-",
        shipmentPeriod: "-",
        paymentTerms: "-",
        paymentTermsPdf: "-",
        routing: "-",
        premDisc: "-",
        premDiscPdf: "-",
        referenceNumber: contractData?.reference_number || "NA",
        quantityNumber: contractData?.quantity || 0,
        pricingType:
          priceSchedule?.pricing_type === "fixed" ? "Fixed" : "Basis",
        pricingColorType:
          priceSchedule?.pricing_type === "fixed" ? "#b8ebf3" : "#e8d4f1",
        isFixed: priceSchedule?.pricing_type === "fixed",
        isBasis: priceSchedule?.pricing_type === "basis",
        customerId: seller?.people_id,
        customerNumber: seller?.people_id?.slice(-6) || "-",
        customerName: seller?.name || "-",
        customerAddress: "-",
        customerPhone: "-",
        ownerId: buyer?.people_id,
        ownerNumber: buyer?.people_id?.slice(-6) || "-",
        ownerName: buyer?.name || "-",
        typeContract: contractData?.type === "purchase" ? "Purchase" : "Sale",
        quantityUnits: `${formatNumber(contractData?.quantity || 0)} ${contractData?.measurement_unit || ""}`,
        contractPrice: formatCurrency(priceSchedule?.price || 0),
        contractBasis: formatCurrency(priceSchedule?.basis || 0),
        contractFuture: formatCurrency(priceSchedule?.future_price || 0),
        contractOverviewTotal: `${formatNumber(inventory?.total || 0)} ${contractData?.measurement_unit || ""}`,
        contractOverviewDelivered: `${formatNumber(inventory?.fixed || 0)} ${contractData?.measurement_unit || ""}`,
        contractOverviewOpen: `${formatNumber(inventory?.open || 0)} ${contractData?.measurement_unit || ""}`,
        contractOverviewTotalSettled: `${formatNumber(inventory?.settled || 0)} ${contractData?.measurement_unit || ""}`,
        contractOverviewTotalUnSettled: `${formatNumber(inventory?.unsettled || 0)} ${contractData?.measurement_unit || ""}`,
        contractPaymentTotal: formatCurrency(inventoryValue?.total || 0),
        contractPaymentSettled: formatCurrency(inventoryValue?.settled || 0),
        contractFixedSettled: formatCurrency(inventoryValue?.fixed || 0),
        overviewAllSettled: formatCurrency(inventory?.settled || 0),
        percentageDelivered:
          inventory?.total > 0 ? inventory?.fixed / inventory?.total : 0,
        percentageSettled:
          inventory?.total > 0 ? inventory?.settled / inventory?.total : 0,
        percentageFixed:
          inventory?.total > 0 ? inventory?.fixed / inventory?.total : 0,
        sellerName: seller?.name || "-",
        buyerName: buyer?.name || "-",
        companyName: localStorage.getItem("company_business_name") || "",
        companyAddress: localStorage.getItem("company_address_line") || "",
        companyPhone:
          localStorage.getItem("company_calling_code") &&
          localStorage.getItem("company_phone_number")
            ? `${localStorage.getItem("company_calling_code")}${localStorage.getItem("company_phone_number")}`
            : "",
        printDate: new Date().toLocaleDateString("en-GB"),
      },
      load_data_from: null,
      template_id: environment.TEMPLATE_ID,
      export_type: "json",
      expiration: 60,
      output_file: `${contractData?.folio || "CONTRACT"}.pdf`,
      is_cmyk: false,
      image_resample_res: 600,
      direct_download: 1,
      cloud_storage: 1,
      pdf_standard: "string",
      password_protected: false,
      password: "string",
      postaction_s3_filekey: "string",
      postaction_s3_bucket: "string",
    };

    return printData;
  };

  // Función para manejar impresión del contrato padre
  const handlePrintContract = async () => {
    console.log("🖨️ Print contract:", currentContractData?.folio);

    if (!currentContractData) {
      console.error("❌ No contract data available for printing");
      return;
    }

    const contractId = currentContractData?.id || currentContractData?._id;

    // Set loading state
    setPrintingContractId(contractId);

    try {
      // Mapear datos del contrato a formato JSON para imprimir
      const printData = mapContractDataForPrint(currentContractData);

      console.log(
        "📄 Mapped contract data for printing:",
        JSON.stringify(printData, null, 2),
      );

      // Generar y descargar PDF
      const fileName = `${currentContractData.folio}.pdf`;
      await generateAndDownloadPDF(printData, fileName);
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
    } finally {
      // Clear loading state
      setPrintingContractId(null);
    }
  };

  // Función para manejar impresión de sub-contrato
  const handlePrintSubContract = (subContractId: string) => {
    console.log("🖨️ Print sub-contract:", subContractId);

    // Set loading state
    setPrintingSubContractId(subContractId);

    // Encontrar el sub-contrato específico - usar _id que es el campo correcto en la data de la API
    const subContract = subContractsData.find(
      (sc) => sc._id === subContractId || sc.id === subContractId,
    );
    if (!subContract) {
      console.error("❌ Sub-contrato no encontrado:", subContractId);
      console.log(
        "🔍 Sub-contratos disponibles:",
        subContractsData.map((sc) => ({
          _id: sc._id,
          id: sc.id,
          folio: sc.folio,
        })),
      );
      return;
    }

    console.log("🔍 DEBUG subContract encontrado:", subContract);
    console.log("🔍 DEBUG subContract.quantity:", subContract.quantity);
    console.log(
      "🔍 DEBUG subContract.price_schedule:",
      subContract.price_schedule,
    );
    console.log("🔍 DEBUG subContract.commodity:", subContract.commodity);

    // DEBUG: Verificar los valores que se van a usar en el mapping
    console.log("🔍 Valores para mapping:");
    console.log("  - quantity:", subContract.quantity);
    console.log("  - price:", subContract.price_schedule[0].price);
    console.log("  - basis:", subContract.price_schedule[0].basis);
    console.log(
      "  - future_price:",
      subContract.price_schedule[0].future_price,
    );
    console.log("  - commodity name:", currentContractData?.commodity?.name);

    // Crear el JSON para impresión usando SOLO datos del sub-contrato
    const printData = {
      data: {
        path: `/api/v1/contracts/sp-contracts/${contractId}`,

        // Datos básicos del sub-contrato
        id: subContract._id || "",
        _partitionKey: subContract._partitionKey || "",
        active: true,
        created_by: subContract.created_by_name || "",
        created_at: subContract.created_at || "",
        folio: subContract.folio || "",
        contract_id: subContract.contract_id || "",
        contract_folio: subContract.contract_folio || "",
        type: currentContractData?.type || "purchase",
        sub_type: "",

        // Solo commodity name del contrato principal para el display
        commodity: {
          commodity_id: currentContractData?.commodity?.commodity_id || "",
          name: currentContractData?.commodity?.name || "",
        },

        // Campos vacíos que no están en el sub-contrato
        characteristics: { configuration_id: "", configuration_name: "" },
        grade: 0,
        participants: [],

        // Price schedule del sub-contrato
        price_schedule: subContract.price_schedule || [],

        // Campos vacíos
        logistic_schedule: [],
        inventory: subContract.inventory || {},
        inventory_value: subContract.inventory_value || {},

        // Datos específicos del sub-contrato
        quantity: subContract.quantity || 0,
        measurement_unit_id: subContract.measurement_unit_id || "",
        measurement_unit: subContract.measurement_unit || "",
        total_price: subContract.total_price || 0,
        thresholds: subContract.thresholds || {},
        status: subContract.status || "",
        sub_contract_date: subContract.sub_contract_date || "",
        purchase_orders: subContract.purchase_orders || [],

        // Campos vacíos adicionales
        reference_number: "",
        shipping_start_date: "",
        shipping_end_date: "",
        location_id: "",
        location_name: "",
        application_priority: 0,
        delivered: "",
        transport: "",
        weights: "",
        inspections: "",
        proteins: "",
        contract_date: "",
        extras: [],
        externals: [],
        schedule: [],
        sub_contracts: [],
        notes: [],
        remarks: [],
        updated_at: "",

        // Campos calculados para display
        contractDate: subContract.sub_contract_date
          ? new Date(subContract.sub_contract_date).toLocaleDateString("en-US")
          : "",
        contractNumber: "-",
        fob: "-",
        contact: "-",
        instructions: "-",
        instructionsPdf: "-",
        shipmentPeriod: "-",
        paymentTerms: "-",
        paymentTermsPdf: "-",
        routing: "-",
        premDisc: "-",
        premDiscPdf: "-",
        referenceNumber: "",
        quantityNumber: subContract.quantity || 0,
        pricingType: subContract.price_schedule?.[0]?.pricing_type || "basis",
        pricingColorType:
          subContract.price_schedule?.[0]?.pricing_type === "fixed"
            ? "#66b3ff"
            : "#c8bdec",
        isFixed: subContract.price_schedule?.[0]?.pricing_type === "fixed",
        isBasis: subContract.price_schedule?.[0]?.pricing_type === "basis",

        // Información del seller/buyer (vacía para sub-contratos)
        customerId: "",
        customerNumber: "",
        customerName: "",
        customerAddress: "",
        customerPhone: "",
        ownerId: "",
        ownerNumber: "",
        ownerName: "",

        typeContract: "Sub-Contract",
        quantityUnits: `${formatNumber({
          minDecimals: environment.NUMBER_MIN_DECIMALS,
          maxDecimals: environment.NUMBER_MAX_DECIMALS,
          value: subContract.quantity,
          formatPattern: environment.NUMBER_FORMAT_PATTERN,
          roundMode: environment.NUMBER_ROUND_MODE,
        })} ${currentContractData?.commodity?.name || ""}`,
        contractPrice: `$ ${formatNumber({
          minDecimals: environment.NUMBER_MIN_DECIMALS,
          maxDecimals: environment.NUMBER_MAX_DECIMALS,
          value: subContract.price_schedule[0].price,
          formatPattern: environment.NUMBER_FORMAT_PATTERN,
          roundMode: environment.NUMBER_ROUND_MODE,
        })}`,
        contractBasis: `$ ${formatNumber({
          minDecimals: environment.NUMBER_MIN_DECIMALS,
          maxDecimals: environment.NUMBER_MAX_DECIMALS,
          value: subContract.price_schedule[0].basis,
          formatPattern: environment.NUMBER_FORMAT_PATTERN,
          roundMode: environment.NUMBER_ROUND_MODE,
        })}`,
        contractFuture: `$ ${formatNumber({
          minDecimals: environment.NUMBER_MIN_DECIMALS,
          maxDecimals: environment.NUMBER_MAX_DECIMALS,
          value: subContract.price_schedule[0].future_price,
          formatPattern: environment.NUMBER_FORMAT_PATTERN,
          roundMode: environment.NUMBER_ROUND_MODE,
        })}`,

        sellerName: "",
        buyerName: "",
        companyName: "Mi centro contratos",
        companyAddress:
          "Antigua Carretera México-Cuautla 17, Cuautla, Morelos, United Mexican States, 62748",
        companyPhone: "7354691326",
        subContractFolio: subContract.folio || "",
        printDate: new Date().toLocaleDateString("en-GB"),
      },
      load_data_from: null,
      template_id: environment.TEMPLATE_ID,
      export_type: "json",
      expiration: 60,
      output_file: `${subContract.folio || "SUB-CONTRACT"}.pdf`,
      is_cmyk: false,
      image_resample_res: 600,
      direct_download: 1,
      cloud_storage: 1,
      pdf_standard: "string",
      password_protected: false,
      password: "string",
      postaction_s3_filekey: "string",
      postaction_s3_bucket: "string",
    };

    console.log(
      "🔍 DEBUG price mapeados:",
      subContract.price_schedule[0].price,
    );

    console.log("🔍 DEBUG valores finales mapeados:");
    console.log("  - quantityUnits:", printData.data.quantityUnits);
    console.log("  - contractPrice:", printData.data.contractPrice);
    console.log("  - contractBasis:", printData.data.contractBasis);
    console.log("  - contractFuture:", printData.data.contractFuture);

    console.log("🖨️ PRINT DATA JSON:", JSON.stringify(printData, null, 2));
    console.log("🖨️ Sub-contrato a imprimir:", subContract);

    // Llamar al servicio centralizado para generar el PDF
    handleGenerateAndDownloadPDF(
      printData,
      subContract.folio || "SUB-CONTRACT",
    );
  };

  // Función para generar y descargar el PDF usando el servicio centralizado
  const handleGenerateAndDownloadPDF = async (
    printData: any,
    fileName: string,
  ) => {
    try {
      await generateAndDownloadPDF(printData, fileName);
    } catch (error) {
      console.error("❌ Error al generar/descargar PDF:", error);
      alert(
        "Error al generar el PDF. Por favor verifica tu conexión e inténtalo de nuevo.",
      );
    } finally {
      // Clear loading state
      setPrintingSubContractId(null);
    }
  };

  // Función para cargar sub-contratos usando el interceptor addJwtPk
  const loadSubContracts = async (contractId: string) => {
    try {
      setLoadingSubContracts(true);

      const authCheck = hasAuthTokens();
      console.log("🔐 Auth check para sub-contratos:", authCheck);

      if (!authCheck.isAuthenticated) {
        console.log(
          "🔐 Sin autenticación válida - no se cargarán sub-contratos",
        );
        setSubContractsData([]);
        return;
      }

      // Usar el servicio para obtener sub-contratos
      const response = await getSubContractsByContractId(contractId);

      console.log("📡 Response status:", response.status);
      console.log(
        "📡 Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📋 Sub-contratos response:", data);

        if (data.data && Array.isArray(data.data)) {
          console.log(
            `✅ ${data.data.length} sub-contratos cargados exitosamente`,
          );

          // Transformar datos del API al formato esperado por SubContractCard
          const transformedData = data.data.map((item: any, index: number) => {
            const colors = [
              {
                border: "border-l-blue-500",
                dot: "bg-blue-500",
                text: "text-blue-600",
              },
              {
                border: "border-l-green-500",
                dot: "bg-green-500",
                text: "text-green-600",
              },
              {
                border: "border-l-purple-500",
                dot: "bg-purple-500",
                text: "text-purple-600",
              },
              {
                border: "border-l-orange-500",
                dot: "bg-orange-500",
                text: "text-orange-600",
              },
              {
                border: "border-l-red-500",
                dot: "bg-red-500",
                text: "text-red-600",
              },
              {
                border: "border-l-pink-500",
                dot: "bg-pink-500",
                text: "text-pink-600",
              },
              {
                border: "border-l-yellow-500",
                dot: "bg-yellow-500",
                text: "text-yellow-600",
              },
              {
                border: "border-l-indigo-500",
                dot: "bg-indigo-500",
                text: "text-indigo-600",
              },
            ];
            const color = colors[index % colors.length];

            const quantity = item.quantity || 0;
            const reserved = item.inventory?.reserved || 0;
            const unreserved = quantity - reserved;

            return {
              id: item._id,
              contractNumber: item.folio,
              quantity: quantity,
              unit: item.measurement_unit || "Unknown Unit",
              thresholds: {
                min: item.thresholds?.min_thresholds_weight || 0,
                max: item.thresholds?.max_thresholds_weight || 0,
              },
              basis: item.price_schedule?.[0]?.basis || 0,
              price: item.price_schedule?.[0]?.price || 0,
              future: item.price_schedule?.[0]?.future_price || 0,
              delivered: item.inventory?.settled || 0,
              reserved: reserved,
              unreserved: unreserved,
              totalPayment:
                item.inventory_value?.total || item.total_price || 0,
              borderColor: color.border,
              dotColor: color.dot,
              textColor: color.text,
              // Conservar datos originales para acceso directo por key
              ...item,
            };
          });

          setSubContractsData(transformedData);
        } else {
          console.log("⚠️ Respuesta exitosa pero sin datos de sub-contratos");
          setSubContractsData([]);
        }
      } else {
        const errorText = await response.text();
        console.error("❌ Error HTTP al cargar sub-contratos:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        setSubContractsData([]);
      }
    } catch (error) {
      console.error("❌ Error al cargar sub-contratos:", error);
      setSubContractsData([]);
    } finally {
      setLoadingSubContracts(false);
    }
  };

  // Check for refresh parameter and trigger full refresh (same as refresh button)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRefresh = urlParams.get("refresh") === "true";

    if (shouldRefresh && contractId) {
      console.log(
        "🔄 Refresh parameter detected from sub-contract creation, triggering full refresh",
      );
      handleFullRefresh();

      // Clean up the URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [contractId, location]);


  // Efecto que se ejecuta una sola vez al montar el componente
  useEffect(() => {
    if (!contractId) {
      setError("ID de contrato no válido");
      setLoading(false);
      return;
    }

    console.log("🔄 Componente montado - Cargando contrato desde API:", contractId);
    handleFullRefresh();
  }, []); // Array vacío para que solo se ejecute al montar

  // Efecto para persistir cambios de tab activo
  useEffect(() => {
    if (contractState.activeTab !== activeTab) {
      updateState({ activeTab });
    }
  }, [activeTab]);

  // Configuración de campos para el componente agnóstico - sin hardcodear unidades
  const fieldConfig: FieldConfig[] = [
    {
      key: "price",
      label: t("contractDetail.price"),
      color: "black",
      format: "currency",
    },
    {
      key: "basis",
      label: t("contractDetail.basis"),
      color: "black",
      format: "currency",
    },
    {
      key: "future",
      label: t("contractDetail.future"),
      color: "black",
      format: "currency",
    },
    { key: "reserved", label: t("contractDetail.reserved"), color: "blue" },
    {
      key: "unreserved",
      label: t("contractDetail.unreserved"),
      color: "black",
    },
    { key: "delivered", label: t("contractDetail.settled"), color: "green" },
  ];

  // Configuración del progress bar - solo configuración y campos
  const progressBarConfig: ProgressBarConfig = {
    settledField: "delivered", // Campo que contiene el valor entregado
    reservedField: "reserved", // Campo que contiene el valor reservado
    totalField: "quantity", // Campo que contiene el total para porcentajes
    label: t("contractDetail.progress"),
    colorPriority: "settled", // Verde tiene prioridad en caso de empate
  };

  // Estado para sub-contratos reales del API
  const [subContracts, setSubContracts] = useState<any[]>([]);

  // REMOVED: Legacy API fetch - now using only Redux state data

  if (loading) {
    return (
      <DashboardLayout
        title={t(
          contractType === "sale"
            ? "saleContractDetail"
            : "contractDetail.title",
        )}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t("loading")}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {t("contractDetail.loadingContract")}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title={t(
          contractType === "sale"
            ? "saleContractDetail"
            : "contractDetail.title",
        )}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
              {t("contractDetail.errorLoadingContract")}
            </div>
            <div className="text-gray-600 dark:text-gray-400">{error}</div>
            <Link href={`/${contractType}-contracts`}>
              <Button className="mt-4" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToList")}
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentContractData) {
    return (
      <DashboardLayout
        title={t(
          contractType === "sale"
            ? "saleContractDetail"
            : "contractDetail.title",
        )}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t("contractDetail.contractNotFound")}
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-4">
              {error || "Contrato no encontrado en los datos cargados"}
            </div>
            <Link href={`/${contractType}-contracts`}>
              <Button className="mt-4" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToList")}
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const seller = currentContractData.participants?.find(
    (p: any) => p.role === "seller",
  );
  const buyer = currentContractData.participants?.find(
    (p: any) => p.role === "buyer",
  );
  const priceInfo = currentContractData.price_schedule?.[0];
  const logisticInfo = currentContractData.logistic_schedule?.[0];

  return (
    <DashboardLayout title={t("contractDetail.title")}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Main Contract Header */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("contractDetail.contractNumber")} #
                {currentContractData?.folio || "N/A"}
              </h2>
              <div className="flex gap-3 items-center mt-1">
                <span className="text-base font-bold text-gray-600 dark:text-gray-400">
                  {t("contractDetail.contractHeader")}:{" "}
                  {currentContractData?.type === "purchase"
                    ? t("contractDetail.purchase")
                    : t("contractDetail.sale")}
                </span>
                <Badge
                  variant="secondary"
                  className={`text-sm px-2 py-1 ${
                    currentContractData?.price_schedule?.[0]?.pricing_type ===
                    "fixed"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                      : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                  }`}
                >
                  {currentContractData?.price_schedule?.[0]?.pricing_type ||
                    "basis"}
                </Badge>
              </div>

              {/* Seller/Buyer Information */}
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {currentContractData?.type === "purchase"
                      ? "Seller:"
                      : "Buyer:"}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {currentContractData?.type === "purchase"
                      ? seller?.name || "N/A"
                      : buyer?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2 items-end">
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {t("contractDetail.statusContract")}:{" "}
                <span className="text-green-600 dark:text-green-400">
                  {currentContractData?.status || "Active"}
                </span>
              </span>
              <div className="flex space-x-2">
                {/* 1. Refresh Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={handleFullRefresh}
                        disabled={fullScreenLoading}
                        className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${fullScreenLoading ? "animate-spin" : ""}`}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh contract and sub-contracts data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* 2. Print Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={handlePrintContract}
                        disabled={
                          printingContractId ===
                          (currentContractData?.id || currentContractData?._id)
                        }
                        className="h-8 w-8 p-0 bg-gray-500 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {printingContractId ===
                        (currentContractData?.id ||
                          currentContractData?._id) ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Print contract</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* 3. View Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => {
                          console.log("Ver contrato completo:", contractId);
                          setLocation(`/${contractType}-contracts/${contractId}/view`);
                        }}
                        className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View contract</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* 4. Settled Button - solo visible cuando pricing_type es 'fixed' y status es 'in-progress' */}
                {currentContractData?.price_schedule?.[0]?.pricing_type ===
                  "fixed" &&
                  currentContractData?.status === "in-progress" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={openSettleContractModal}
                            className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white"
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Settle contract</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                {/* 5. Edit Button - solo visible cuando status es 'created' */}
                {currentContractData?.status === "created" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            const contractType = location.includes('/purchase-contracts/') ? 'purchase' : 'sale';
                            setLocation(`/${contractType}-contracts/${contractId}/edit`);
                          }}
                          className="h-8 w-8 p-0 bg-yellow-500 hover:bg-yellow-600 text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit contract</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* 6. Delete Button - solo visible cuando status es 'created' */}
                {currentContractData?.status === "created" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => setShowDeleteModal(true)}
                          disabled={deleting}
                          className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete contract</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {/* Basic Contract Info Row */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("contractDetail.contractDate")}:
                </p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {currentContractData?.contract_date
                    ? new Date(
                        currentContractData.contract_date,
                      ).toLocaleDateString("en-US", {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "7/31/2025"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {currentContractData?.participants?.find(
                  (p: any) => p.role === "seller",
                )?.name || "Test Seller LLC"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {participantAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6 h-[320px]">
          {/* Left Column - Tabs within Card */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">
                    {t("contractDetail.generalInformation")}
                  </TabsTrigger>
                  <TabsTrigger value="contact">
                    {t("contractDetail.remarks")}
                  </TabsTrigger>
                  <TabsTrigger value="instructions">Instructions</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.commodity")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-xs">
                        {currentContractData?.commodity?.name || "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.quantityUnits")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatNumber({
                          value: currentContractData?.quantity || 0,
                          minDecimals: 0,
                          maxDecimals: 0,
                          formatPattern: "0,000.00",
                          roundMode: "truncate",
                        })}{" "}
                        {currentContractData?.measurement_unit || "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.thresholds")}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {(() => {
                          console.log(
                            "🔍 DEBUG THRESHOLDS:",
                            currentContractData?.thresholds,
                          );
                          const minValue =
                            currentContractData?.thresholds
                              ?.min_thresholds_weight || 0;
                          const maxValue =
                            currentContractData?.thresholds
                              ?.max_thresholds_weight || 0;
                          console.log("📊 Min/Max values:", {
                            minValue,
                            maxValue,
                          });

                          return `${t("min")}: ${formatNumber({
                            value: minValue,
                            minDecimals: 0,
                            maxDecimals: 0,
                            formatPattern: "0,000.00",
                            roundMode: "truncate",
                          })} ${currentContractData?.measurement_unit || "N/A"} | ${t("max")}: ${formatNumber(
                            {
                              value: maxValue,
                              minDecimals: 0,
                              maxDecimals: 0,
                              formatPattern: "0,000.00",
                              roundMode: "truncate",
                            },
                          )} ${currentContractData?.measurement_unit || "N/A"}`;
                        })()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.price")}:
                      </span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${" "}
                        {formatNumber({
                          value:
                            currentContractData?.price_schedule?.[0]?.price ||
                            0,
                          minDecimals: 2,
                          maxDecimals: 2,
                          formatPattern: "0,000.00",
                          roundMode: "truncate",
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.basis")}:
                      </span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ${" "}
                        {formatNumber({
                          value:
                            currentContractData?.price_schedule?.[0]?.basis ||
                            0,
                          minDecimals: 2,
                          maxDecimals: 2,
                          formatPattern: "0,000.00",
                          roundMode: "truncate",
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.future")}:
                      </span>
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        ${" "}
                        {formatNumber({
                          value:
                            currentContractData?.price_schedule?.[0]
                              ?.future_price || 0,
                          minDecimals: 2,
                          maxDecimals: 2,
                          formatPattern: "0,000.00",
                          roundMode: "truncate",
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Reference Number:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {(() => {
                          const refNumber =
                            currentContractData?.reference_number;
                          console.log(
                            "🔍 Reference Number from API:",
                            refNumber,
                          );
                          console.log(
                            "🔍 Full contract data:",
                            currentContractData,
                          );
                          return refNumber || "N/A";
                        })()}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.contact")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.shipment")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.paymentTerms")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("contractDetail.premiumDiscount")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        -
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="instructions" className="mt-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Special Instructions:
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        -
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>

          {/* Right Column - Quantity Overview */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {t("contractDetail.quantityOverview")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                // Extract real inventory data from current contract
                const inventory = currentContractData?.inventory || {};
                const unit = currentContractData?.measurement_unit || "bu60";

                // Real data from inventory object (use actual values, no fallbacks)
                const totalInventory = inventory.total || 0;
                const openAmount = inventory.open || 0;
                const fixedAmount = inventory.fixed || 0;
                const settledAmount = inventory.settled || 0;
                const unsettledAmount = inventory.unsettled || 0;
                const reservedAmount = inventory.reserved || 0;

                // Calculate available amount - handle edge case where reserved might be larger than total
                const availableAmount = Math.max(
                  0,
                  totalInventory - reservedAmount,
                );

                // Calculate percentages based on actual totals, handle edge cases
                const fixedPercentage =
                  totalInventory > 0
                    ? Math.min(100, (fixedAmount / totalInventory) * 100)
                    : 0;
                const settledPercentage =
                  totalInventory > 0
                    ? Math.min(100, (settledAmount / totalInventory) * 100)
                    : 0;

                // For reserved, calculate percentage based on comparison with total
                const reservedPercentage =
                  reservedAmount > 0 && totalInventory > 0
                    ? Math.min(
                        100,
                        (reservedAmount /
                          Math.max(reservedAmount, totalInventory)) *
                          100,
                      )
                    : 0;

                return (
                  <>
                    {/* Fijado Section - Amarillo */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        <span>{t("contractDetail.fixed")}</span>
                        <span>{t("contractDetail.open")}</span>
                      </div>
                      <Progress
                        value={fixedPercentage}
                        className="w-full h-3"
                        indicatorClassName="bg-yellow-500 dark:bg-yellow-400"
                      />
                      <div className="flex justify-between items-center">
                        <div className="text-base font-bold text-yellow-600 dark:text-yellow-400">
                          {formatNumber({
                            value: fixedAmount,
                            minDecimals: 2,
                            maxDecimals: 2,
                            formatPattern: "0,000.00",
                            roundMode: "truncate",
                          })}{" "}
                          {unit}
                        </div>
                        <div className="text-base font-bold text-yellow-600 dark:text-yellow-400">
                          {formatNumber({
                            value: openAmount,
                            minDecimals: 2,
                            maxDecimals: 2,
                            formatPattern: "0,000.00",
                            roundMode: "truncate",
                          })}{" "}
                          {unit}
                        </div>
                      </div>
                    </div>

                    {/* Reservado Section - Azul */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        <span>{t("contractDetail.reserved")}</span>
                        <span>{t("contractDetail.available")}</span>
                      </div>
                      <Progress
                        value={reservedPercentage}
                        className="w-full h-3"
                        indicatorClassName="bg-blue-500 dark:bg-blue-400"
                      />
                      <div className="flex justify-between items-center">
                        <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber({
                            value: reservedAmount,
                            minDecimals: 2,
                            maxDecimals: 2,
                            formatPattern: "0,000.00",
                            roundMode: "truncate",
                          })}{" "}
                          {unit}
                        </div>
                        <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber({
                            value: availableAmount,
                            minDecimals: 2,
                            maxDecimals: 2,
                            formatPattern: "0,000.00",
                            roundMode: "truncate",
                          })}{" "}
                          {unit}
                        </div>
                      </div>
                    </div>

                    {/* Liquidado Section - Verde */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        <span>{t("contractDetail.settled")}</span>
                        <span>{t("contractDetail.unsettled")}</span>
                      </div>
                      <Progress
                        value={settledPercentage}
                        className="w-full h-3"
                        indicatorClassName="bg-green-500 dark:bg-green-400"
                      />
                      <div className="flex justify-between items-center">
                        <div className="text-base font-bold text-green-600 dark:text-green-400">
                          {formatNumber({
                            value: settledAmount,
                            minDecimals: 2,
                            maxDecimals: 2,
                            formatPattern: "0,000.00",
                            roundMode: "truncate",
                          })}{" "}
                          {unit}
                        </div>
                        <div className="text-base font-bold text-green-600 dark:text-green-400">
                          {formatNumber({
                            value: unsettledAmount,
                            minDecimals: 2,
                            maxDecimals: 2,
                            formatPattern: "0,000.00",
                            roundMode: "truncate",
                          })}{" "}
                          {unit}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Sub-contracts Section - Solo para contratos con pricing_type "basis" */}
        {currentContractData?.price_schedule?.[0]?.pricing_type === "basis" && (
          <div className="mt-8">
            <SubContractsSection
              subContracts={subContractsData}
              fields={fieldConfig}
              progressBar={progressBarConfig}
              parentContractFixed={
                currentContractData?.inventory?.fixed || 1000
              }
              parentContractQuantity={currentContractData?.quantity || 0}
              parentContractOpen={currentContractData?.inventory?.open || 0}
              parentContractStatus={currentContractData?.status || ""}
              onNewSubContract={() => {
                // Establecer el estado del contrato principal en Redux antes de navegar
                dispatch(
                  updateCreateSubContractState({
                    contractId: contractId!,
                    updates: {
                      parentContractData: currentContractData,
                      subContractsData: subContractsData,
                    },
                  }),
                );
                setLocation(
                  `/${contractType}-contracts/${contractId}/sub-contracts/create`,
                );
              }}
              onViewSubContract={(id) => {
                console.log("View sub-contract:", id);
                handleNavigateToPage("viewSubContract", id);

                // Encontrar el sub-contrato específico
                const subContractToView = subContractsData.find(
                  (sc) => sc.id === id,
                );

                if (subContractToView) {
                  // Establecer el estado del sub-contrato en Redux antes de navegar (igual que editar)
                  dispatch(
                    updateEditSubContractState({
                      contractId: contractId!,
                      updates: {
                        parentContractData: currentContractData,
                        subContractsData: subContractsData,
                        currentSubContractData: subContractToView,
                        subContractId: id,
                        pricingType:
                          currentContractData?.price_schedule?.[0]
                            ?.pricing_type || "basis",
                      },
                    }),
                  );

                  setLocation(
                    `/${contractType}-contracts/${contractId}/sub-contracts/${id}/view`,
                  );
                } else {
                  console.error("Sub-contrato no encontrado:", id);
                }
              }}
              onPrintSubContract={handlePrintSubContract}
              printingSubContractId={printingSubContractId}
              onEditSubContract={(id) => {
                console.log("Edit sub-contract:", id);

                // Encontrar el sub-contrato específico
                const subContractToEdit = subContractsData.find(
                  (sc) => sc.id === id,
                );

                if (subContractToEdit) {
                  // Establecer el estado del sub-contrato a editar en Redux antes de navegar
                  dispatch(
                    updateEditSubContractState({
                      contractId: contractId!,
                      updates: {
                        parentContractData: currentContractData,
                        subContractsData: subContractsData,
                        currentSubContractData: subContractToEdit,
                        subContractId: id,
                        pricingType:
                          currentContractData?.price_schedule?.[0]
                            ?.pricing_type || "basis",
                      },
                    }),
                  );

                  setLocation(
                    `/${contractType}-contracts/${contractId}/sub-contracts/${id}/edit`,
                  );
                } else {
                  console.error("Sub-contrato no encontrado:", id);
                }
              }}
              onDeleteSubContract={openDeleteSubContractModal}
              onSettleSubContract={openSettleSubContractModal}
            />
          </div>
        )}
      </div>

      {/* Full-Screen Loading Overlay */}
      {fullScreenLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Refreshing Contract Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Loading contract and sub-contracts information...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <span>{t("deleteContract.title")}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t("deleteContract.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-sm font-semibold">
                    !
                  </span>
                </div>
              </div>
              <div className="flex-grow">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  {t("deleteContract.contractDetails")}
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>{t("deleteContract.contract")}:</strong>{" "}
                  {currentContractData?.folio || "N/A"}
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>{t("deleteContract.commodity")}:</strong>{" "}
                  {currentContractData?.commodity?.name || "N/A"}
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>{t("deleteContract.quantity")}:</strong>{" "}
                  {currentContractData?.quantity?.toLocaleString() || "0"}{" "}
                  {currentContractData?.measurement_unit || "units"}
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>
                    {currentContractData?.type === "purchase"
                      ? t("deleteContract.seller")
                      : t("deleteContract.buyer")}
                    :
                  </strong>{" "}
                  {currentContractData?.type === "purchase"
                    ? seller?.name || "N/A"
                    : buyer?.name || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="flex-1"
            >
              {t("deleteContract.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContract}
              disabled={deleting}
              className="flex-1"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t("deleteContract.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("deleteContract.deleteButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sub-Contract Confirmation Modal */}
      <Dialog
        open={showDeleteSubContractModal}
        onOpenChange={setShowDeleteSubContractModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <span>{t("deleteSubContract.title")}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t("deleteSubContract.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-sm font-semibold">
                    !
                  </span>
                </div>
              </div>
              <div className="flex-grow">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  {t("deleteSubContract.contractDetails")}
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>{t("deleteSubContract.contractNumber")}:</strong>{" "}
                  {selectedSubContractForDelete?.contractNumber || "N/A"}
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>{t("deleteSubContract.quantity")}:</strong>{" "}
                  {selectedSubContractForDelete?.quantity || 0}{" "}
                  {selectedSubContractForDelete?.unit || "bu60"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteSubContractModal(false)}
              disabled={deletingSubContract}
              className="flex-1"
            >
              {t("deleteSubContract.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubContract}
              disabled={deletingSubContract}
              className="flex-1"
            >
              {deletingSubContract ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t("deleteSubContract.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("deleteSubContract.deleteButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Sub-Contract Confirmation Modal */}
      <Dialog
        open={showSettleSubContractModal}
        onOpenChange={setShowSettleSubContractModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-green-600">
              <Lock className="w-5 h-5" />
              <span>{t("settleSubContract.title")}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t("settleSubContract.description")} #
              {selectedSubContractForSettle?.contractNumber || "N/A"}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettleSubContractModal(false)}
              disabled={settlingSubContract}
              className="flex-1"
            >
              {t("settleSubContract.cancel")}
            </Button>
            <Button
              onClick={handleSettleSubContract}
              disabled={settlingSubContract}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {settlingSubContract ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t("settleSubContract.settling")}
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  {t("settleSubContract.confirmButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Parent Contract Confirmation Modal */}
      <Dialog
        open={showSettleContractModal}
        onOpenChange={setShowSettleContractModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-green-600">
              <Lock className="w-5 h-5" />
              <span>{t("settleContract.title")}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t("settleContract.description")} #
              {currentContractData?.folio || "N/A"}?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettleContractModal(false)}
              disabled={settlingContract}
              className="flex-1"
            >
              {t("settleContract.cancel")}
            </Button>
            <Button
              onClick={handleSettleContract}
              disabled={settlingContract}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {settlingContract ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settleContract.settling")}
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  {t("settleContract.confirm")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <X className="w-5 h-5" />
              <span>{t("settleContract.error.title")}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowErrorModal(false)}
              className="flex-1"
            >
              {t("settleContract.error.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
