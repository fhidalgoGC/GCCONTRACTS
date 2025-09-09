import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'wouter';
import { useCreateSubContractState, usePageTracking, useNavigationHandler } from '@/hooks/usePageState';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import DashboardLayout from '@/layouts/DashboardLayout/view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Calendar, Package, DollarSign, FileText, X, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { FormattedNumberInput } from '@/components/PurchaseContractForm/components/FormattedNumberInput';
import { useMeasurementUnits } from '@/hooks/useMeasurementUnits';
import { DatePicker } from '@/components/ui/datepicker';
import { formatNumber } from '@/lib/numberFormatter';
import { NUMBER_FORMAT_CONFIG } from '@/environment/environment';
import { SubContractService, CreateSubContractPayload } from '@/services/subContract/subContract.service';
import { QuantityActualOverview } from '@/components/contracts/QuantityActualOverview';

// Sub-contract form validation schema with business rules
const createSubContractValidationSchema = (openInventory: number = 0) => z.object({
  // Form display fields
  contractNumber: z.string().min(1, 'Contract number is required'),
  contractDate: z.string().min(1, 'Contract date is required'),
  customerNumber: z.string().min(1, 'Customer number is required'),
  idContract: z.string().min(1, 'ID Contract is required'),
  referenceNumber: z.string().min(1, 'Reference number is required'),
  commodity: z.string().min(1, 'Commodity is required'),
  contact: z.string().optional(),
  shipmentPeriod: z.string().optional(),
  
  // API fields with business validation
  future: z.number().optional(), // Future is not required
  basis: z.number(),
  totalPrice: z.number().min(0, 'Total price must be positive'),
  totalDate: z.string().min(1, 'Date is required'), // Required field
  quantity: z.number()
    .min(0.01, 'Quantity must be greater than 0') // Cannot be negative or zero
    .max(openInventory, `Quantity cannot exceed available inventory (${openInventory})`), // Cannot exceed open inventory
  measurementUnitId: z.string().min(1, 'Measurement unit is required'), // Required field
});

// Create a base schema for type inference
const baseSubContractSchema = z.object({
  contractNumber: z.string(),
  contractDate: z.string(),
  customerNumber: z.string(),
  idContract: z.string(),
  referenceNumber: z.string(),
  commodity: z.string(),
  contact: z.string().optional(),
  shipmentPeriod: z.string().optional(),
  future: z.number().optional(),
  basis: z.number(),
  totalPrice: z.number(),
  totalDate: z.string(),
  quantity: z.number(),
  measurementUnitId: z.string(),
});

type SubContractFormData = z.infer<typeof baseSubContractSchema>;

interface ContractData {
  contractNumber: string; // Ya no se usa, mantener por compatibilidad
  contractDate: string;
  customerNumber: string; // Representa seller para purchase contracts, buyer para sale contracts
  idContract: string; // Ahora es el folio
  referenceNumber: string;
  commodity: string;
  quantityUnits: number;
  price: number;
  basis: number;
  future: number;
  contact: string;
  shipmentPeriod: string;
}



export default function CreateSubContract() {
  const { t } = useTranslation();
  const params = useParams();
  const [location, setLocation] = useLocation();
  
  const contractId = params.contractId;
  
  // Hook para persistir estado de crear sub-contrato
  const { createSubContractState, updateState } = useCreateSubContractState(contractId!);
  const { handleNavigateToPage } = useNavigationHandler();
  
  // Initialize subContractKey from Redux state if available
  const initialSubContractKey = createSubContractState.subContractKey;
  
  // Detectar tipo de contrato basado en la URL
  const contractType = location.includes('/sale-contracts/') ? 'sale' : 'purchase';
  
  // Obtener contratos del state de Redux basado en el tipo
  const contractsState = useSelector(
    (state: any) => contractType === 'sale' 
      ? state.pageState.saleContracts 
      : state.pageState.purchaseContracts,
  );
  const contractsData = contractsState.contractsData || [];
  
  // Obtener el estado del contrato principal para crear sub-contrato
  const parentContractState = useSelector((state: any) => state.pageState.createSubContract[contractId!]);
  const parentContractData = parentContractState?.parentContractData;
  const subContractsData = parentContractState?.subContractsData || [];
  
  usePageTracking(`/${contractType}-contracts/${contractId}/sub-contracts/create`);
  
  // Function to fetch sub-contract key when page loads using service
  const fetchSubContractKey = async () => {
    // Skip if key already exists
    if (subContractKey) {
      console.log('🔑 Sub-contract key already exists:', subContractKey);
      return;
    }
    
    setLoadingSubContractKey(true);
    try {
      const keyResponse = await SubContractService.getSubContractKey();
      
      setSubContractKey(keyResponse.key);
      console.log('🔑 Sub-contract key set:', keyResponse.key);
      
      // Save the key to Redux state for persistence and debug visibility
      updateState({ subContractKey: keyResponse.key });
      
    } catch (error) {
      console.error('❌ Error fetching sub-contract key:', error);
    } finally {
      setLoadingSubContractKey(false);
    }
  };
  
  // Estados locales - usar datos del contrato principal si están disponibles
  const [contractData] = useState<ContractData>(() => {
    if (parentContractData) {
      // Determinar qué participante mostrar basado en el tipo de contrato
      const contractType = parentContractData.type; // 'purchase' o 'sale'
      const targetRole = contractType === 'purchase' ? 'seller' : 'buyer';
      const participant = parentContractData.participants?.find((p: any) => p.role === targetRole);
      
      return {
        contractNumber: '', // Removido - ya no se usa
        contractDate: parentContractData.contract_date ? new Date(parentContractData.contract_date).toLocaleDateString() : new Date().toLocaleDateString(),
        customerNumber: participant?.name || 'N/A', // Ahora muestra seller para purchase contracts
        idContract: parentContractData.folio || 'N/A', // Usar folio como ID Contract
        referenceNumber: parentContractData.reference_number || 'N/A',
        commodity: parentContractData.commodity?.name || 'N/A',
        quantityUnits: parentContractData.quantity || 0,
        price: parentContractData.price_schedule?.[0]?.price ?? 0,
        basis: parentContractData.price_schedule?.[0]?.basis ?? 0,
        future: parentContractData.price_schedule?.[0]?.future_price ?? 0,
        contact: '-',
        shipmentPeriod: '-'
      };
    }
    
    // Si no hay datos del contrato principal, retornar valores vacíos
    return {
      contractNumber: '',
      contractDate: '',
      customerNumber: '',
      idContract: '',
      referenceNumber: '',
      commodity: '',
      quantityUnits: 0,
      price: 0,
      basis: 0,
      future: 0,
      contact: '',
      shipmentPeriod: ''
    };
  });

  // API hooks - Force refetch measurement units every time this page loads
  const { data: measurementUnits = [], isLoading: loadingUnits, error: unitsError, refetch: refetchMeasurementUnits } = useMeasurementUnits();
  
  // Notificar navegación al cargar la página y obtener key del sub-contrato
  useEffect(() => {
    handleNavigateToPage('createSubContract', contractId);
    fetchSubContractKey();
    // Force refetch measurement units every time this page loads
    refetchMeasurementUnits();
  }, [contractId, refetchMeasurementUnits]);
  
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formDataForSubmission, setFormDataForSubmission] = useState<SubContractFormData | null>(null);
  const [isSubmittingSubContract, setIsSubmittingSubContract] = useState(false);
  
  // Sub-contract key state for API
  const [subContractKey, setSubContractKey] = useState<string | null>(initialSubContractKey);
  const [loadingSubContractKey, setLoadingSubContractKey] = useState(false);

  // Helper functions for formatting numbers
  const formatQuantity = (value: number | undefined | null) => {
    return formatNumber({
      minDecimals: NUMBER_FORMAT_CONFIG.minDecimals,
      maxDecimals: NUMBER_FORMAT_CONFIG.maxDecimals,
      value: value || 0,
      formatPattern: NUMBER_FORMAT_CONFIG.formatPattern,
      roundMode: NUMBER_FORMAT_CONFIG.roundMode
    });
  };

  const formatPrice = (value: number | undefined | null) => {
    const formattedValue = formatNumber({
      minDecimals: 2,
      maxDecimals: 2,
      value: value || 0,
      formatPattern: NUMBER_FORMAT_CONFIG.formatPattern,
      roundMode: NUMBER_FORMAT_CONFIG.roundMode
    });
    return `$${formattedValue}`;
  };
  
  // Debug measurement units loading
  useEffect(() => {
    console.log('🔍 Measurement Units Debug:');
    console.log('- Loading:', loadingUnits);
    console.log('- Error:', unitsError);
    console.log('- Data:', measurementUnits);
    console.log('- Count:', measurementUnits.length);
    console.log('🔍 Parent Contract measurement_unit_id:', parentContractData?.measurement_unit_id);
    console.log('🔍 Parent Contract measurement_unit:', parentContractData?.measurement_unit);
    
    // Debug form default values
    console.log('📝 Form Default Values Debug:');
    console.log('- Today date:', new Date().toISOString().split('T')[0]);
    console.log('- Open inventory:', parentContractData?.inventory?.open);
    console.log('- Contract contract_date:', parentContractData?.contract_date);
    console.log('- All parent contract keys:', parentContractData ? Object.keys(parentContractData) : 'No parent data');
    console.log('- Contract created_at:', parentContractData?.created_at);
    console.log('- Min date for picker:', parentContractData?.contract_date ? new Date(parentContractData.contract_date) : new Date());
  }, [measurementUnits, loadingUnits, unitsError, parentContractData]);
  
  // Get open inventory for validation
  const openInventory = parentContractData?.inventory?.open || 0;
  
  // Create dynamic validation schema with current open inventory
  const validationSchema = createSubContractValidationSchema(openInventory);
  
  // Form setup with react-hook-form
  const form = useForm<SubContractFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      contractNumber: parentContractData?.folio || '',
      contractDate: parentContractData?.contract_date ? new Date(parentContractData.contract_date).toLocaleDateString() : '',
      customerNumber: (() => {
        const contractType = parentContractData?.type;
        const targetRole = contractType === 'purchase' ? 'seller' : 'buyer';
        return parentContractData?.participants?.find((p: any) => p.role === targetRole)?.name || '';
      })(),
      idContract: parentContractData?.folio || '',
      referenceNumber: parentContractData?.reference_number || '',
      commodity: parentContractData?.commodity?.name || '',
      future: parentContractData?.price_schedule?.[0]?.future_price ?? 0,
      basis: parentContractData?.price_schedule?.[0]?.basis ?? 0,
      totalPrice: (parentContractData?.price_schedule?.[0]?.future_price ?? 0) + (parentContractData?.price_schedule?.[0]?.basis ?? 0),
      totalDate: new Date().toISOString().split('T')[0], // Fecha de hoy en formato YYYY-MM-DD
      quantity: parentContractData?.inventory?.open ?? 0,
      measurementUnitId: parentContractData?.measurement_unit || '',
      contact: '-',
      shipmentPeriod: '-',
    }
  });

  const { control, handleSubmit, watch, setValue, formState: { errors } } = form;
  
  // Watch values for calculations
  const futureValue = watch('future');
  const basisValue = watch('basis');
  const quantityValue = watch('quantity');
  const totalPriceValue = watch('totalPrice');
  const measurementUnitValue = watch('measurementUnitId');
  const totalDateValue = watch('totalDate');

  // Get the selected measurement unit name for display
  const getSelectedMeasurementUnitName = () => {
    const selectedUnit = measurementUnits.find(unit => unit.value === measurementUnitValue);
    return selectedUnit?.label || measurementUnitValue || 'bu48';
  };

  // Auto-save form data to Redux state whenever fields change (with debounce)
  useEffect(() => {
    // Only update if we have valid values to prevent infinite loops
    if (futureValue !== undefined && basisValue !== undefined) {
      const timeoutId = setTimeout(() => {
        const formData = {
          future: futureValue,
          basis: basisValue,
          quantity: quantityValue,
          totalPrice: totalPriceValue,
          measurementUnitId: measurementUnitValue,
          totalDate: totalDateValue,
          contractNumber: parentContractData?.folio || 'SPC-46'
        };
        
        updateState({ formData });
        console.log('💾 Auto-saved form data to Redux:', formData);
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [futureValue, basisValue, quantityValue, totalPriceValue, measurementUnitValue, totalDateValue, parentContractData?.folio]);

  const handleCancel = () => {
    setLocation(`/${contractType}-contracts/${contractId}`);
  };

  const handleCreateSubContract = handleSubmit((data: SubContractFormData) => {
    // Get the most up-to-date data from Redux state (auto-saved)
    const stateFormData = parentContractState?.formData;
    const mergedData = {
      ...data,
      ...stateFormData, // Redux state takes precedence
      contractNumber: parentContractData?.folio || 'SPC-46'
    };
    
    console.log('📋 Form submission data:', data);
    console.log('📋 Redux state data:', stateFormData);
    console.log('📋 Merged data for modal:', mergedData);
    
    // Store merged data for submission and open confirmation modal
    setFormDataForSubmission(mergedData);
    setShowConfirmModal(true);
  });

  const handleConfirmSubmission = async () => {
    if (!formDataForSubmission) return;
    
    const data = formDataForSubmission;
    
    // Start loading and track timing for minimum duration
    setIsSubmittingSubContract(true);
    const startTime = Date.now();
    
    try {
      // Get auth data from localStorage  
      const createdById = localStorage.getItem('user_id') || '';
      const createdByName = localStorage.getItem('user_name') || '';
      
      // Find selected measurement unit details from raw API data
      const measurementUnitsData = measurementUnits;
      const selectedUnitSlug = data.measurementUnitId; // This is the slug like "bu45"
      
      // Find the full unit data from the API response to get the correct ObjectId
      const selectedUnit = measurementUnits.find(unit => unit.value === selectedUnitSlug);
      const selectedUnitId = selectedUnit?.key || ''; // Use the key (ObjectId) of the selected unit
      
      // Extract price schedule values from parent contract
      const parentPriceSchedule = parentContractData?.price_schedule?.[0] || {};
      
      // Construct API payload matching the required structure
      const apiPayload: CreateSubContractPayload = {
        contract_id: contractId!, // Parent contract ID from route params
        contract_folio: data.contractNumber,
        measurement_unit: selectedUnitSlug, // Short code like "bu60"
        total_price: data.totalPrice,
        created_by_id: createdById,
        created_by_name: createdByName,
        price_schedule: [{
          pricing_type: parentPriceSchedule.pricing_type || 'basis',
          price: data.totalPrice, // Use totalPrice (future + basis)
          basis: data.basis || 0,
          future_price: data.future || 0,
          basis_operation: parentPriceSchedule.basis_operation || 'add',
          option_month: parentPriceSchedule.option_month || 'september',
          option_year: parentPriceSchedule.option_year || 2025,
          exchange: parentPriceSchedule.exchange || 'Chicago Board of Trade',
          payment_currency: parentPriceSchedule.payment_currency || 'usd'
        }],
        quantity: data.quantity,
        sub_contract_date: data.totalDate,
        measurement_unit_id: selectedUnitId, // ObjectId from parent contract
        thresholds: {
          max_thresholds_percentage: 0,
          max_thresholds_weight: data.quantity,
          min_thresholds_percentage: 0,
          min_thresholds_weight: data.quantity
        }
      };
      
      console.log('🔗 Parent Contract ID from route:', contractId);
      console.log('🔗 Parent Contract Data ID:', parentContractData?._id);
      
      // Make API call to create sub-contract using the service
      if (!subContractKey) {
        throw new Error('Sub-contract key not available. Please try again.');
      }
      
      const result = await SubContractService.createSubContract(subContractKey, apiPayload);
      
      // Calculate elapsed time and ensure minimum duration of 0.3 seconds
      const elapsedTime = Date.now() - startTime;
      const minimumDuration = 300; // 0.3 seconds in milliseconds
      const remainingTime = Math.max(0, minimumDuration - elapsedTime);
      
      // Wait for remaining time if API was faster than minimum duration
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      // Close modal and reset states
      setIsSubmittingSubContract(false);
      setShowConfirmModal(false);
      setFormDataForSubmission(null);
      
      // Navigate back to contract detail and trigger data refresh
      setLocation(`/${contractType}-contracts/${contractId}?refresh=true`);
      
    } catch (error) {
      console.error('❌ Error creating sub-contract:', error);
      
      // Calculate elapsed time and ensure minimum duration even for errors
      const elapsedTime = Date.now() - startTime;
      const minimumDuration = 300; // 0.3 seconds in milliseconds
      const remainingTime = Math.max(0, minimumDuration - elapsedTime);
      
      // Wait for remaining time if API was faster than minimum duration
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      // Reset loading state
      setIsSubmittingSubContract(false);
      // Error will be visible in console, no modal/alert needed
    }
  };

  const handleCancelSubmission = () => {
    setShowConfirmModal(false);
    setFormDataForSubmission(null);
  };
  
  // Update total price when future changes
  useEffect(() => {
    if (futureValue !== undefined) {
      setValue('totalPrice', futureValue + basisValue);
    }
  }, [futureValue, basisValue, setValue]);

  return (
    <DashboardLayout title="Crear Sub-Contrato">
      <div className="max-w-7xl mx-auto space-y-8">
        


        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          
          {/* Left Column - Contract Details */}
          <div className="space-y-6">
            
            {/* Contract Overview Card */}
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-xl border-0 ring-1 ring-gray-200/50 dark:ring-gray-700/50">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-t-lg">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Contrato de Precio de Compra</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">ID Contrato</span>
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono">
                      #{contractData.idContract}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Fecha del Contrato</span>
                    <span className="text-sm font-medium">{contractData.contractDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {parentContractData?.type === 'purchase' ? 'Vendedor' : 'Comprador'}
                    </span>
                    <span className="text-sm font-medium">{contractData.customerNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Número de Referencia</span>
                    <span className="text-sm font-medium">{contractData.referenceNumber}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* General Information Card */}
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-xl border-0 ring-1 ring-gray-200/50 dark:ring-gray-700/50">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-t-lg">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span>Información General</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">

                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Cantidad / Unidades</span>
                    <span className="text-sm font-bold font-mono text-amber-500 dark:text-amber-400">
                      {(parentContractData?.quantity || contractData.quantityUnits).toLocaleString()} {parentContractData?.measurement_unit || 'bushel'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Precio</span>
                    <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      $ {(parentContractData?.price_schedule?.[0]?.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Basis</span>
                    <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                      $ {(parentContractData?.price_schedule?.[0]?.basis ?? 0).toFixed(2)} {parentContractData?.price_schedule?.[0]?.option_month || 'september'}{parentContractData?.price_schedule?.[0]?.option_year || '2025'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Futuro</span>
                    <span className="text-sm font-bold font-mono text-orange-600 dark:text-orange-400">
                      $ {(parentContractData?.price_schedule?.[0]?.future_price ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>

          {/* Right Column - Quantity Overview */}
          <div className="space-y-6">
            
            {/* Quantity Overview Card - Now as reusable component */}
            <QuantityActualOverview
              control={control}
              errors={errors}
              setValue={setValue as any}
              parentContractData={parentContractData}
              contractData={contractData}
              measurementUnits={measurementUnits}
              loadingUnits={loadingUnits}
              unitsError={unitsError}
              mode="create"
            />

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleCreateSubContract}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {t('createSubContract.createSubContract')}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full py-3 text-base font-medium border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-xl mx-auto p-0 overflow-hidden">
          <DialogHeader className="bg-white dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Crear Sub-Contrato
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 dark:text-gray-400">
              Revisa y confirma los detalles del sub-contrato antes de crear
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-3 space-y-3">
            {/* Partial Pricing Summary Card */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-2 space-y-2">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Resumen de Precios Parciales
              </h3>
              
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Cantidad Sub-Contrato:</span>
                    <div className="text-blue-600 dark:text-blue-400 font-semibold">
                      {formatQuantity(formDataForSubmission?.quantity)} {getSelectedMeasurementUnitName()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-600 dark:text-gray-400">Contrato Abierto:</span>
                    <div className="text-gray-900 dark:text-gray-100 font-semibold">
                      {formatQuantity(parentContractData?.inventory?.open)} {parentContractData?.measurement_unit || 'bu60'}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(((formDataForSubmission?.quantity || 0) / (parentContractData?.inventory?.open || 1)) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Contract Changes and New Sub Contract Cards */}
            <div className="grid grid-cols-2 gap-2">
              {/* Contract Changes Card */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 space-y-1">
                <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Cambios del Contrato
                </h3>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">ID Contrato:</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Cantidad</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      #{parentContractData?.folio || 'SPC-46'}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatQuantity(parentContractData?.inventory?.open)} {parentContractData?.measurement_unit || 'bu60'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Balance</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatQuantity((parentContractData?.inventory?.open || 0) - (formDataForSubmission?.quantity || 0))} {parentContractData?.measurement_unit || 'bu60'}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Sub Contract Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    Nuevo Sub Contrato
                  </h3>
                  <div className="text-sm">→</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">ID Contrato:</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Cantidad</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      #{formDataForSubmission?.contractNumber || 'SPC-46-SUBC-5'}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatQuantity(formDataForSubmission?.quantity)} {getSelectedMeasurementUnitName()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Balance</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatQuantity(formDataForSubmission?.quantity)} {getSelectedMeasurementUnitName()}
                    </span>
                  </div>
                  
                  {/* Divider line */}
                  <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Basis</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Futuros</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {formatPrice(formDataForSubmission?.basis)}
                    </span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {formatPrice(formDataForSubmission?.future)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Precio</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {formatPrice(formDataForSubmission?.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>



            {/* Action Buttons */}
            <div className="flex space-x-2 pt-1">
              <Button
                onClick={handleCancelSubmission}
                variant="outline"
                className="flex-1 h-8 text-xs border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                disabled={isSubmittingSubContract}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleConfirmSubmission}
                className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmittingSubContract}
              >
                {isSubmittingSubContract ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creando...</span>
                  </div>
                ) : (
                  'Crear Sub-Contrato'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}