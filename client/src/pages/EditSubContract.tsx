import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'wouter';
import { usePageTracking, useNavigationHandler } from '@/hooks/usePageState';
import { setLocation } from 'wouter/use-browser-location';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import DashboardLayout from '@/layouts/DashboardLayout/view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Calendar, Package, FileText, X, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useMeasurementUnits } from '@/hooks/useMeasurementUnits';
import { formatNumber } from '@/lib/numberFormatter';
import { NUMBER_FORMAT_CONFIG } from '@/environment/environment';
import { authenticatedFetch } from '@/utils/apiInterceptors';
import { QuantityActualOverview } from '@/components/contracts/QuantityActualOverview';

// Sub-contract form validation schema with business rules for editing
const editSubContractValidationSchema = (openInventory: number = 0, currentQuantity: number = 0) => z.object({
  // Form display fields
  contractNumber: z.string().min(1, 'Contract number is required'),
  contractDate: z.string().min(1, 'Contract date is required'),
  customerNumber: z.string().min(1, 'Customer number is required'),
  idContract: z.string().min(1, 'ID Contract is required'),
  referenceNumber: z.string().min(1, 'Reference number is required'),
  commodity: z.string().min(1, 'Commodity is required'),
  contact: z.string().optional(),
  shipmentPeriod: z.string().optional(),
  
  // API fields with business validation - for editing, we need to consider current quantity
  future: z.number().optional(), // Future is not required
  basis: z.number(),
  price: z.number(), // Add price field
  totalPrice: z.number().min(0, 'Total price must be positive'),
  totalDate: z.string().min(1, 'Date is required'), // Required field
  quantity: z.number()
    .min(0.01, 'Quantity must be greater than 0') // Cannot be negative or zero
    .max(openInventory + currentQuantity, `Quantity cannot exceed available inventory (${openInventory + currentQuantity})`), // Can use current quantity plus available
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
  price: z.number(),
  totalPrice: z.number(),
  totalDate: z.string(),
  quantity: z.number(),
  measurementUnitId: z.string(),
});

type SubContractFormData = z.infer<typeof baseSubContractSchema>;

interface ContractData {
  contractNumber: string;
  contractDate: string;
  customerNumber: string;
  idContract: string;
  referenceNumber: string;
  commodity: string;
  quantityUnits: number;
  price: number;
  basis: number;
  future: number;
  contact: string;
  shipmentPeriod: string;
}

interface SubContractData {
  _id: string;
  folio: string;
  quantity: number;
  measurement_unit_id: string;
  measurement_unit: string;
  price_schedule: Array<{
    pricing_type: string;
    price: number;
    basis: number;
    future_price: number;
    option_month: string;
    option_year: number;
  }>;
  total_price: number;
  sub_contract_date: string;
}

export default function EditSubContract() {
  const { t } = useTranslation();
  const params = useParams();
  const [location, setLocation] = useLocation();
  
  const contractId = params.contractId;
  const subContractId = params.subContractId;
  
  const { handleNavigateToPage } = useNavigationHandler();
  
  // Determinar el tipo de contrato desde la URL
  const contractType = location.includes('/purchase-contracts/') ? 'purchase' : 'sale';
  
  // Obtener contratos del state de Redux para buscar el contrato actual
  const contractsState = useSelector((state: any) => 
    contractType === 'purchase' 
      ? state.pageState.purchaseContracts 
      : state.pageState.saleContracts
  );
  const contractsData = contractsState.contractsData || [];
  
  // Obtener el estado del contrato principal para editar sub-contrato
  const editSubContractState = useSelector((state: any) => state.pageState.editSubContract[contractId!]);
  const parentContractData = editSubContractState?.parentContractData;
  const subContractsData = editSubContractState?.subContractsData || [];
  const currentSubContractData = editSubContractState?.currentSubContractData;
  
  // Use the specific sub-contract data from Redux state
  const currentSubContract = currentSubContractData;
  
  usePageTracking(`/${contractType}-contracts/${contractId}/sub-contracts/${subContractId}/edit`);
  
  // State management
  const [loadingSubContractKey, setLoadingSubContractKey] = useState(false);
  const [contractData, setContractData] = useState<ContractData>({
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
  });
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formDataForSubmission, setFormDataForSubmission] = useState<SubContractFormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to reload sub-contracts after successful update
  const reloadSubContracts = async () => {
    try {
      const response = await authenticatedFetch(
        `${environment.TRM_BASE_URL}/contracts/sp-sub-contracts?filter={"contract_id":"${contractId}"}`
      );
      if (response.ok) {
        const result = await response.json();
        console.log('🔄 Sub-contracts reloaded after update:', result.data?.length || 0);
        // Dispatch to Redux to update sub-contracts data if needed
      }
    } catch (error) {
      console.error('Error reloading sub-contracts:', error);
    }
  };
  
  // Load measurement units
  const { data: measurementUnits = [], isLoading: loadingUnits, error: unitsError } = useMeasurementUnits();
  
  // Calculate available inventory (add current sub-contract quantity to open inventory)
  const currentQuantity = currentSubContract?.quantity || 0;
  const openInventory = parentContractData?.inventory?.open || 0;
  const availableInventory = openInventory + currentQuantity;
  
  // Form setup with validation schema
  const validationSchema = editSubContractValidationSchema(openInventory, currentQuantity);
  
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    setError,
    formState: { errors },
    reset
  } = useForm<SubContractFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      contractNumber: '',
      contractDate: '',
      customerNumber: '',
      idContract: '',
      referenceNumber: '',
      commodity: '',
      contact: '',
      shipmentPeriod: '',
      future: 0,
      basis: 0,
      price: 0,
      totalPrice: 0,
      totalDate: '',
      quantity: 0,
      measurementUnitId: ''
    }
  });
  
  // Watch form changes for total price calculation  
  const watchedPrice = watch('price');
  const watchedQuantity = watch('quantity');
  const watchedMeasurementUnit = watch('measurementUnitId');

  // Get the selected measurement unit name for display
  const getSelectedMeasurementUnitName = () => {
    const selectedUnit = measurementUnits.find(unit => unit.value === watchedMeasurementUnit);
    return selectedUnit?.label || watchedMeasurementUnit || 'bu48';
  };
  
  // Calculate total price whenever price or quantity changes
  useEffect(() => {
    const price = watchedPrice || 0;
    const quantity = watchedQuantity || 0;
    
    const totalPrice = price * quantity;
    setValue('totalPrice', totalPrice);
  }, [watchedPrice, watchedQuantity, setValue]);
  
  // Initialize form with sub-contract data
  useEffect(() => {
    if (currentSubContract && parentContractData && contractsData.length > 0) {
      // Find parent contract from Redux state
      const parentContract = contractsData.find((contract: any) => contract._id === contractId);
      
      if (parentContract) {
        // Set contract data for display
        setContractData({
          contractNumber: parentContract.folio || '',
          contractDate: parentContract.contract_date ? new Date(parentContract.contract_date).toLocaleDateString() : '',
          customerNumber: parentContract.participants?.find((p: any) => p.role === 'seller')?.name || 'N/A',
          idContract: parentContract.folio || '',
          referenceNumber: parentContract.reference_number || 'N/A',
          commodity: parentContract.commodity?.name || '',
          quantityUnits: parentContract.quantity || 0,
          price: parentContract.price_schedule?.[0]?.price || 0,
          basis: parentContract.price_schedule?.[0]?.basis || 0,
          future: parentContract.price_schedule?.[0]?.future_price || 0,
          contact: '',
          shipmentPeriod: ''
        });
        
        // Set form values with current sub-contract data
        const subContractDate = currentSubContract.sub_contract_date 
          ? new Date(currentSubContract.sub_contract_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        reset({
          contractNumber: parentContract.folio || '',
          contractDate: parentContract.contract_date ? new Date(parentContract.contract_date).toLocaleDateString() : '',
          customerNumber: parentContract.participants?.find((p: any) => p.role === 'seller')?.name || 'N/A',
          idContract: parentContract.folio || '',
          referenceNumber: parentContract.reference_number || 'N/A',
          commodity: parentContract.commodity?.name || '',
          contact: '',
          shipmentPeriod: '',
          future: currentSubContract.price_schedule?.[0]?.future_price || 0,
          basis: currentSubContract.price_schedule?.[0]?.basis || 0,
          price: currentSubContract.price_schedule?.[0]?.price || 0,
          totalPrice: currentSubContract.total_price || 0,
          totalDate: subContractDate,
          quantity: currentSubContract.quantity || 0,
          measurementUnitId: currentSubContract.measurement_unit || 'bu60'
        });
        
        console.log('📝 Form initialized with sub-contract data:', {
          subContractId: currentSubContract._id,
          quantity: currentSubContract.quantity,
          future: currentSubContract.price_schedule?.[0]?.future_price,
          basis: currentSubContract.price_schedule?.[0]?.basis,
          price: currentSubContract.price_schedule?.[0]?.price,
          totalPrice: currentSubContract.total_price,
          totalDate: subContractDate,
          measurementUnit: currentSubContract.measurement_unit
        });
        
        console.log('✅ All fields loaded from sub-contract state:', {
          'Future from API': currentSubContract.price_schedule?.[0]?.future_price,
          'Basis from API': currentSubContract.price_schedule?.[0]?.basis,
          'Price from API': currentSubContract.price_schedule?.[0]?.price,
          'Quantity from API': currentSubContract.quantity,
          'Date from API': currentSubContract.sub_contract_date,
          'Measurement Unit from API': currentSubContract.measurement_unit,
          'Total Price from API': currentSubContract.total_price
        });
      }
    }
  }, [currentSubContract, parentContractData, contractsData, contractId, reset]);
  
  // Helper function to format quantity
  const formatQuantity = (value: number) => {
    return formatNumber({
      minDecimals: NUMBER_FORMAT_CONFIG.minDecimals,
      maxDecimals: NUMBER_FORMAT_CONFIG.maxDecimals,
      value: value,
      formatPattern: NUMBER_FORMAT_CONFIG.formatPattern,
      roundMode: NUMBER_FORMAT_CONFIG.roundMode
    });
  };
  
  // Handle form submission
  const onSubmit = (data: SubContractFormData) => {
    console.log('📝 Form submitted with data:', data);
    setFormDataForSubmission(data);
    setShowConfirmModal(true);
  };
  
  // Handle actual update after confirmation
  const handleUpdateSubContract = async () => {
    if (!formDataForSubmission || !currentSubContract) return;
    
    setIsSubmitting(true);
    
    try {
      // Get original values from current sub-contract to maintain structure  
      const originalSubContract = currentSubContract;
      const parentPriceSchedule = parentContractData?.price_schedule?.[0];
      
      // Use the measurement_unit_id from the current sub-contract (it has the correct _id)
      const measurementUnitId = originalSubContract.measurement_unit_id;
      
      console.log('🔍 Measurement Unit Debug:', {
        slugFromForm: formDataForSubmission.measurementUnitId,
        idFromSubContract: measurementUnitId,
        originalSubContract: originalSubContract
      });
      
      // Prepare API payload using same structure as creation
      const payload = {
        contract_id: contractId,
        contract_folio: originalSubContract.contract_folio,
        measurement_unit: formDataForSubmission.measurementUnitId, // Keep slug for this field
        total_price: formDataForSubmission.totalPrice,
        price_schedule: [{
          pricing_type: parentPriceSchedule?.pricing_type || 'basis',
          price: formDataForSubmission.price, // Use price from form (future + basis)
          basis: formDataForSubmission.basis,
          future_price: formDataForSubmission.future || 0,
          basis_operation: parentPriceSchedule?.basis_operation || 'add',
          option_month: parentPriceSchedule?.option_month || 'september',
          option_year: parentPriceSchedule?.option_year || 2025,
          exchange: parentPriceSchedule?.exchange || 'Chicago Board of Trade',
          payment_currency: parentPriceSchedule?.payment_currency || 'usd'
        }],
        quantity: formDataForSubmission.quantity,
        sub_contract_date: formDataForSubmission.totalDate,
        measurement_unit_id: measurementUnitId, // Use _id for this field
        thresholds: {
          max_thresholds_percentage: 0,
          max_thresholds_weight: formDataForSubmission.quantity,
          min_thresholds_percentage: 0,
          min_thresholds_weight: formDataForSubmission.quantity
        }
      };
      
      console.log('🔄 Updating sub-contract with payload:', payload);
      
      // Call update API
      const response = await authenticatedFetch(
        `${environment.TRM_BASE_URL}/contracts/sp-sub-contracts/${currentSubContract._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Sub-contract updated successfully:', result);
        
        // Close modal first
        setShowConfirmModal(false);
        
        // Reload sub-contracts data and navigate back using Wouter with refresh parameter
        await reloadSubContracts();
        setLocation(`/${contractType}-contracts/${contractId}?refresh=true`);
      } else {
        console.error('❌ Failed to update sub-contract:', response.status, response.statusText);
        // Handle error - show user feedback
      }
    } catch (error) {
      console.error('❌ Error updating sub-contract:', error);
      // Handle error - show user feedback
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    setLocation(`/${contractType}-contracts/${contractId}`);
  };
  
  if (!currentSubContract) {
    return (
      <DashboardLayout title={t('editSubContract.editSubContract')}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t('editSubContract.subContractNotFound')}
            </h1>
            <Button onClick={handleCancel}>
              {t('editSubContract.backToContract')}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title={t('editSubContract.editSubContract')}>
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        
        {/* Main Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Contract Details */}
          <div className="space-y-6">
            
            {/* Contract Overview Card */}
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-xl border-0 ring-1 ring-gray-200/50 dark:ring-gray-700/50">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-t-lg">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>{t('editSubContract.purchasePriceContract')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('editSubContract.idContract')}</span>
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono">
                      #{contractData.idContract}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('editSubContract.contractDate')}</span>
                    <span className="text-sm font-medium">{contractData.contractDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {parentContractData?.type === 'purchase' ? t('editSubContract.seller') : t('editSubContract.buyer')}
                    </span>
                    <span className="text-sm font-medium">{contractData.customerNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('editSubContract.referenceNumber')}</span>
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
                  <span>{t('editSubContract.generalInformation')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('editSubContract.quantityUnits')}</span>
                    <span className="text-sm font-bold font-mono text-amber-500 dark:text-amber-400">
                      {(parentContractData?.quantity || contractData.quantityUnits).toLocaleString()} {parentContractData?.measurement_unit || 'bushel'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('editSubContract.availableInventory')}</span>
                    <span className="text-sm font-bold font-mono text-green-600 dark:text-green-400">
                      {availableInventory.toLocaleString()} {parentContractData?.measurement_unit || 'bushel'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('editSubContract.price')}</span>
                    <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      $ {(parentContractData?.price_schedule?.[0]?.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('editSubContract.basis')}</span>
                    <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                      $ {(parentContractData?.price_schedule?.[0]?.basis ?? 0).toFixed(2)} {parentContractData?.price_schedule?.[0]?.option_month || 'september'}{parentContractData?.price_schedule?.[0]?.option_year || '2025'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('editSubContract.future')}</span>
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
            
            {/* Quantity Overview Card - Using reusable component */}
            <QuantityActualOverview
              control={control}
              errors={errors}
              setValue={setValue}
              parentContractData={parentContractData}
              contractData={contractData}
              measurementUnits={measurementUnits}
              loadingUnits={loadingUnits}
              unitsError={unitsError}
              mode="edit"
            />

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleSubmit(onSubmit)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {t('editSubContract.updateSubContract')}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full py-3 text-base font-medium border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t('editSubContract.cancel')}
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
              {t('editSubContract.confirmModal.title')}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 dark:text-gray-400">
              {t('editSubContract.confirmModal.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-4">
            {/* Sub-Contract Changes Summary */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700 p-4">
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-3">
                {t('editSubContract.confirmModal.changesSummary')}
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">{t('editSubContract.confirmModal.subContractId')}</span>
                  <span className="font-mono text-orange-900 dark:text-orange-100">{currentSubContract.folio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">Old Quantity:</span>
                  <span className="font-mono text-orange-900 dark:text-orange-100">
                    {formatQuantity(currentSubContract?.quantity || 0)} {currentSubContract?.measurement_unit || 'bu48'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">New Quantity:</span>
                  <span className="font-mono text-orange-900 dark:text-orange-100">
                    {formatQuantity(formDataForSubmission?.quantity || 0)} {getSelectedMeasurementUnitName()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">Old Future:</span>
                  <span className="font-mono text-orange-900 dark:text-orange-100">
                    ${(currentSubContract?.price_schedule?.[0]?.future_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">New Future:</span>
                  <span className="font-mono text-orange-900 dark:text-orange-100">
                    ${(formDataForSubmission?.future || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">Old Price:</span>
                  <span className="font-mono text-orange-900 dark:text-orange-100">
                    ${(currentSubContract?.price_schedule?.[0]?.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-700 dark:text-orange-300">New Price:</span>
                  <span className="font-mono text-orange-900 dark:text-orange-100">
                    ${(formDataForSubmission?.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                {t('editSubContract.confirmModal.cancel')}
              </Button>
              <Button
                onClick={handleUpdateSubContract}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2 animate-spin" />
                    {t('editSubContract.confirmModal.updating')}
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {t('editSubContract.confirmModal.confirmUpdate')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}