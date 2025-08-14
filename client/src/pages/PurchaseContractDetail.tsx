import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'wouter';
import { useContractDetailState, usePageTracking, useNavigationHandler } from '@/hooks/usePageState';
import { useSelector } from 'react-redux';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Edit, Trash2, Eye, Printer, Plus, Check } from 'lucide-react';
import { Link } from 'wouter';
import { PurchaseContract } from '@/types/purchaseContract.types';
import { formatNumber } from '@/lib/numberFormatter';
import SubContractsSection from '@/components/contracts/SubContractsSection';
import { SubContract, FieldConfig, ProgressBarConfig } from '@/components/contracts/SubContractCard';

export default function PurchaseContractDetail() {
  const { t } = useTranslation();
  const params = useParams();
  const [location, setLocation] = useLocation();
  
  const contractId = params.id;
  
  // Hook para persistir estado del detalle de contrato
  const { contractState, updateState } = useContractDetailState(contractId!);
  const { handleNavigateToPage } = useNavigationHandler();
  
  // Obtener contratos del state de Redux
  const contractsState = useSelector((state: any) => state.pageState.purchaseContracts);
  const contractsData = contractsState.contractsData || [];
  
  usePageTracking(`/purchase-contracts/${contractId}`);
  
  // Notificar navegación al cargar la página
  useEffect(() => {
    handleNavigateToPage('contractDetail', contractId);
  }, [contractId]);
  
  // Estados
  const [contract, setContract] = useState<PurchaseContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(contractState.activeTab || 'general');
  
  // Estado para el contrato específico encontrado
  const [currentContractData, setCurrentContractData] = useState<any>(null);
  
  // Estado para la dirección del participante
  const [participantAddress, setParticipantAddress] = useState<string>('Loading address...');
  
  // Función para cargar la dirección del participante
  const loadParticipantAddress = async (participantId: string) => {
    try {
      // Obtener token y partition key del localStorage
      const authData = localStorage.getItem('auth');
      const organizationData = localStorage.getItem('organization');
      
      console.log('📋 Verificando datos de autenticación...');
      console.log('Auth data:', authData ? 'Disponible' : 'No disponible');
      console.log('Organization data:', organizationData ? 'Disponible' : 'No disponible');
      
      if (!authData || !organizationData) {
        console.error('❌ No se encontraron datos de autenticación');
        setParticipantAddress('Address requires authentication');
        return;
      }
      
      const auth = JSON.parse(authData);
      const org = JSON.parse(organizationData);
      
      const response = await fetch(`https://crm-develop.grainchain.io/api/v1/crm-locations/address/contracts-owner/${participantId}`, {
        method: 'GET',
        headers: {
          '_partitionkey': org.partition_key,
          'accept': '*/*',
          'accept-language': 'es-419,es;q=0.9',
          'authorization': `Bearer ${auth.accessToken}`,
          'bt-organization': org.partition_key,
          'bt-uid': org.partition_key,
          'organization_id': org.partition_key,
          'pk-organization': org.partition_key,
          'origin': 'https://contracts-develop.grainchain.io',
          'referer': 'https://contracts-develop.grainchain.io/',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📍 Dirección cargada:', data.data);
        
        if (data.data && data.data.string_format) {
          setParticipantAddress(data.data.string_format);
        } else {
          // Construir dirección manualmente si no viene el string_format
          const address = data.data;
          const formattedAddress = `${address.address_line_1}, ${address.city}, ${address.state_code} ${address.zip_code}, ${address.country_slug}`;
          setParticipantAddress(formattedAddress);
        }
      } else {
        console.error('❌ Error al cargar dirección:', response.status);
        setParticipantAddress('Address not available');
      }
    } catch (error) {
      console.error('❌ Error al cargar dirección del participante:', error);
      setParticipantAddress('Error loading address');
    }
  };
  
  // Buscar y establecer el contrato específico al cargar la página
  useEffect(() => {
    console.log('=== EFFECT DE BÚSQUEDA EJECUTADO ===');
    console.log('Contract ID:', contractId);
    console.log('Contracts Data Length:', contractsData.length);
    
    if (contractId) {
      if (contractsData.length > 0) {
        console.log('Buscando contrato con ID:', contractId);
        console.log('IDs disponibles en contractsData:', contractsData.map((c: any) => c._id));
        
        const foundContract = contractsData.find((contract: any) => contract._id === contractId);
        
        if (foundContract) {
          console.log('✅ Contrato ENCONTRADO en Redux, estableciendo en estado del componente');
          console.log('Contrato encontrado:', foundContract.folio);
          setCurrentContractData(foundContract);
          setLoading(false);
          setError(null);
          
          // Cargar dirección del seller
          const seller = foundContract.participants?.find((p: any) => p.role === 'seller');
          if (seller && seller.people_id) {
            console.log('📍 Cargando dirección para seller ID:', seller.people_id);
            loadParticipantAddress(seller.people_id);
          }
          
          // Contrato encontrado - Redux state ya tiene los datos necesarios
        } else {
          console.log('❌ Contrato NO encontrado en Redux state');
          console.log('Contract ID buscado:', contractId);
          console.log('IDs disponibles:', contractsData.map((c: any) => ({ _id: c._id, folio: c.folio })));
          setCurrentContractData(null);
          setError('Contrato no encontrado en los datos cargados');
          setLoading(false);
        }
      } else {
        console.log('❌ No hay datos de contratos en Redux state');
        setCurrentContractData(null);
        setError('No hay datos de contratos disponibles');
        setLoading(false);
      }
    } else {
      console.log('❌ No hay contractId');
      setCurrentContractData(null);
      setError('ID de contrato no válido');
      setLoading(false);
    }
    console.log('=== FIN EFFECT ===');
  }, [contractId, contractsData]);

  // Efecto para persistir cambios de tab activo
  useEffect(() => {
    if (contractState.activeTab !== activeTab) {
      updateState({ activeTab });
    }
  }, [activeTab]);

  // Configuración de campos para el componente agnóstico
  const fieldConfig: FieldConfig[] = [
    { key: 'price', label: t('contractDetail.price'), color: 'black', format: 'currency' },
    { key: 'basis', label: t('contractDetail.basis'), color: 'black', format: 'currency' },
    { key: 'future', label: t('contractDetail.future'), color: 'black', format: 'currency' },
    { key: 'reserved', label: t('contractDetail.reserved'), color: 'blue', unit: 'bu60' },
    { key: 'delivered', label: t('contractDetail.settled'), color: 'green', unit: 'bu60' },
    { key: 'balance', label: t('contractDetail.yourBalance'), color: 'black', unit: 'bu60' }
  ];

  // Configuración del progress bar - solo configuración y campos
  const progressBarConfig: ProgressBarConfig = {
    settledField: 'delivered', // Campo que contiene el valor entregado
    reservedField: 'reserved', // Campo que contiene el valor reservado  
    totalField: 'quantity', // Campo que contiene el total para porcentajes
    label: t('contractDetail.progress'),
    colorPriority: 'settled' // Verde tiene prioridad en caso de empate
  };

  // Generar 10 sub-contratos con datos random para testing
  const generateRandomSubContracts = (): SubContract[] => {
    const colors = [
      { border: 'border-l-blue-500', dot: 'bg-blue-500', text: 'text-blue-600' },
      { border: 'border-l-green-500', dot: 'bg-green-500', text: 'text-green-600' },
      { border: 'border-l-purple-500', dot: 'bg-purple-500', text: 'text-purple-600' },
      { border: 'border-l-orange-500', dot: 'bg-orange-500', text: 'text-orange-600' },
      { border: 'border-l-red-500', dot: 'bg-red-500', text: 'text-red-600' },
      { border: 'border-l-pink-500', dot: 'bg-pink-500', text: 'text-pink-600' },
      { border: 'border-l-yellow-500', dot: 'bg-yellow-500', text: 'text-yellow-600' },
      { border: 'border-l-indigo-500', dot: 'bg-indigo-500', text: 'text-indigo-600' },
      { border: 'border-l-cyan-500', dot: 'bg-cyan-500', text: 'text-cyan-600' },
      { border: 'border-l-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-600' }
    ];

    // Primeros 10 cards con datos variados
    const regularCards = Array.from({ length: 10 }, (_, i) => {
      const quantity = Math.floor(Math.random() * 500) + 100; // 100-600
      
      // Datos más variados para progress bars realistas
      const reservedPercent = 0.2 + Math.random() * 0.7; // 20%-90% reserved
      const deliveredPercent = Math.random() * reservedPercent; // 0% a reservedPercent delivered
      
      const reserved = Math.floor(quantity * reservedPercent);
      const delivered = Math.floor(quantity * deliveredPercent);
      const balance = quantity - delivered;
      const color = colors[i];
      
      return {
        id: `${i + 1}`,
        contractNumber: `SPC-46-SUBC-${i + 1}`,
        quantity,
        reserved, // Agregamos campo reserved
        delivered,
        balance,
        unit: 'bu60',
        thresholds: { 
          min: quantity * 0.9, 
          max: quantity * 1.1 
        },
        basis: Math.floor(Math.random() * 1000) + 1000, // 1000-2000
        price: Math.floor(Math.random() * 1000) + 1500, // 1500-2500
        future: (99 + Math.random() * 4).toFixed(2), // 99.00-103.00 como precio futures
        totalPayment: quantity * (Math.floor(Math.random() * 1000) + 1500),
        borderColor: color.border,
        dotColor: color.dot,
        textColor: color.text
      };
    });

    // 5 cards adicionales con empates para probar prioridad de colores
    const tieCards = [
      // Card 11: Empate 240-240 (60% cada uno)
      {
        id: '11',
        contractNumber: 'SPC-46-SUBC-11',
        quantity: 400,
        reserved: 240, // 60%
        delivered: 240, // 60% - EMPATE
        balance: 160,
        unit: 'bu60',
        thresholds: { min: 360, max: 440 },
        basis: 1500,
        price: 2000,
        future: 101.25,
        totalPayment: 400 * 2000,
        borderColor: 'border-l-yellow-500',
        dotColor: 'bg-yellow-500',
        textColor: 'text-yellow-600'
      },
      // Card 12: Empate 360-360 (60% cada uno)
      {
        id: '12',
        contractNumber: 'SPC-46-SUBC-12',
        quantity: 600,
        reserved: 360, // 60%
        delivered: 360, // 60% - EMPATE
        balance: 240,
        unit: 'bu60',
        thresholds: { min: 540, max: 660 },
        basis: 1200,
        price: 1800,
        future: 99.75,
        totalPayment: 600 * 1800,
        borderColor: 'border-l-purple-500',
        dotColor: 'bg-purple-500',
        textColor: 'text-purple-600'
      },
      // Card 13: Empate 120-120 (60% cada uno)
      {
        id: '13',
        contractNumber: 'SPC-46-SUBC-13',
        quantity: 200,
        reserved: 120, // 60%
        delivered: 120, // 60% - EMPATE
        balance: 80,
        unit: 'bu60',
        thresholds: { min: 180, max: 220 },
        basis: 1800,
        price: 2200,
        future: 102.50,
        totalPayment: 200 * 2200,
        borderColor: 'border-l-pink-500',
        dotColor: 'bg-pink-500',
        textColor: 'text-pink-600'
      },
      // Card 14: Empate 300-300 (60% cada uno)
      {
        id: '14',
        contractNumber: 'SPC-46-SUBC-14',
        quantity: 500,
        reserved: 300, // 60%
        delivered: 300, // 60% - EMPATE
        balance: 200,
        unit: 'bu60',
        thresholds: { min: 450, max: 550 },
        basis: 1600,
        price: 1900,
        future: 100.80,
        totalPayment: 500 * 1900,
        borderColor: 'border-l-indigo-500',
        dotColor: 'bg-indigo-500',
        textColor: 'text-indigo-600'
      },
      // Card 15: Empate 480-480 (60% cada uno)
      {
        id: '15',
        contractNumber: 'SPC-46-SUBC-15',
        quantity: 800,
        reserved: 480, // 60%
        delivered: 480, // 60% - EMPATE
        balance: 320,
        unit: 'bu60',
        thresholds: { min: 720, max: 880 },
        basis: 1300,
        price: 2100,
        future: 98.95,
        totalPayment: 800 * 2100,
        borderColor: 'border-l-teal-500',
        dotColor: 'bg-teal-500',
        textColor: 'text-teal-600'
      }
    ];

    return [...regularCards, ...tieCards];
  };

  const [subContracts] = useState<SubContract[]>(generateRandomSubContracts());

  // REMOVED: Legacy API fetch - now using only Redux state data

  if (loading) {
    return (
      <DashboardLayout title={t('contractDetail.title')}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('loading')}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {t('contractDetail.loadingContract')}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title={t('contractDetail.title')}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
              {t('contractDetail.errorLoadingContract')}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {error}
            </div>
            <Link href="/purchase-contracts">
              <Button className="mt-4" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToList')}
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentContractData) {
    return (
      <DashboardLayout title={t('contractDetail.title')}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('contractDetail.contractNotFound')}
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'Contrato no encontrado en los datos cargados'}
            </div>
            <Link href="/purchase-contracts">
              <Button className="mt-4" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToList')}
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const seller = currentContractData.participants?.find((p: any) => p.role === 'seller');
  const buyer = currentContractData.participants?.find((p: any) => p.role === 'buyer');
  const priceInfo = currentContractData.price_schedule?.[0];
  const logisticInfo = currentContractData.logistic_schedule?.[0];

  return (
    <DashboardLayout title={t('contractDetail.title')}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/purchase-contracts">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('back')}
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('contractDetail.title')}
            </h1>
          </div>
        </div>

        {/* Main Contract Header */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                ID Contract #{currentContractData?.folio || 'N/A'}
              </h2>
              <div className="flex gap-3 items-center mt-1">
                <span className="text-base font-bold text-gray-600 dark:text-gray-400">
                  Contract: {currentContractData?.type === 'purchase' ? 'Purchase' : 'Sale'}
                </span>
                <Badge 
                  variant="secondary" 
                  className={`text-sm px-2 py-1 ${
                    currentContractData?.price_schedule?.[0]?.pricing_type === 'fixed' 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                  }`}
                >
                  {currentContractData?.price_schedule?.[0]?.pricing_type || 'basis'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col space-y-2 items-end">
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {t('contractDetail.statusContract')}: <span className="text-green-600 dark:text-green-400">
                  {currentContractData?.status || 'Active'}
                </span>
              </span>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="text-gray-600 border-gray-600 hover:bg-gray-50">
                  <Printer className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  onClick={() => {
                    console.log('=== DEBUG: Estado del Componente ===');
                    console.log('Contract ID actual:', contractId);
                    console.log('Estado del componente currentContractData:');
                    
                    if (currentContractData) {
                      console.log(JSON.stringify(currentContractData, null, 2));
                    } else {
                      console.log('NULL - No hay contrato en el estado del componente');
                    }
                    
                    console.log('Estado Redux del componente:', contractState);
                    console.log('=== FIN DEBUG ===');
                  }}
                >
                  Debug
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Basic Contract Info Row */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.contractDate')}:</p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {currentContractData?.contract_date 
                    ? new Date(currentContractData.contract_date).toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric', 
                        year: 'numeric'
                      })
                    : '7/31/2025'
                  }
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {currentContractData?.participants?.find((p: any) => p.role === 'seller')?.name || 'Test Seller LLC'}
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">{t('contractDetail.generalInformation')}</TabsTrigger>
                  <TabsTrigger value="contact">{t('contractDetail.remarks')}</TabsTrigger>
                  <TabsTrigger value="instructions">Instructions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.commodity')}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-xs">
                        {currentContractData?.commodity?.name || 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.quantityUnits')}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatNumber({ 
                          value: currentContractData?.quantity || 0, 
                          minDecimals: 0, 
                          maxDecimals: 0,
                          formatPattern: '0,000.00',
                          roundMode: 'truncate'
                        })} {currentContractData?.measurement_unit || 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.thresholds')}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('min')}: {formatNumber({ 
                          value: currentContractData?.thresholds?.min_thresholds_weight || 0, 
                          minDecimals: 0, 
                          maxDecimals: 0,
                          formatPattern: '0,000.00',
                          roundMode: 'truncate'
                        })} {currentContractData?.measurement_unit || 'N/A'} | {t('max')}: {formatNumber({ 
                          value: currentContractData?.thresholds?.max_thresholds_weight || 0, 
                          minDecimals: 0, 
                          maxDecimals: 0,
                          formatPattern: '0,000.00',
                          roundMode: 'truncate'
                        })} {currentContractData?.measurement_unit || 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.price')}:</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        $ {formatNumber({ 
                          value: currentContractData?.price_schedule?.[0]?.price || 0, 
                          minDecimals: 2, 
                          maxDecimals: 2,
                          formatPattern: '0,000.00',
                          roundMode: 'truncate'
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.basis')}:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        $ {formatNumber({ 
                          value: currentContractData?.price_schedule?.[0]?.basis || 0, 
                          minDecimals: 2, 
                          maxDecimals: 2,
                          formatPattern: '0,000.00',
                          roundMode: 'truncate'
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.future')}:</span>
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        $ {formatNumber({ 
                          value: currentContractData?.price_schedule?.[0]?.future_price || 0, 
                          minDecimals: 2, 
                          maxDecimals: 2,
                          formatPattern: '0,000.00',
                          roundMode: 'truncate'
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Reference Number:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {currentContractData?.reference_number || 'N/A'}
                      </span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.contact')}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">-</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.shipment')}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">-</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.paymentTerms')}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">-</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('contractDetail.premiumDiscount')}:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">-</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="instructions" className="mt-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Special Instructions:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">-</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>

          {/* Right Column - Quantity Overview */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{t('contractDetail.quantityOverview')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                // Extract real inventory data from current contract
                const inventory = currentContractData?.inventory || {};
                const unit = currentContractData?.measurement_unit || 'bu60';
                
                // Real data from inventory object (use actual values, no fallbacks)
                const totalInventory = inventory.total || 0;
                const openAmount = inventory.open || 0;
                const fixedAmount = inventory.fixed || 0;
                const settledAmount = inventory.settled || 0;
                const unsettledAmount = inventory.unsettled || 0;
                const reservedAmount = inventory.reserved || 0;
                
                // Calculate available amount - handle edge case where reserved might be larger than total
                const availableAmount = Math.max(0, totalInventory - reservedAmount);
                
                // Calculate percentages based on actual totals, handle edge cases
                const fixedPercentage = totalInventory > 0 ? Math.min(100, (fixedAmount / totalInventory) * 100) : 0;
                const settledPercentage = totalInventory > 0 ? Math.min(100, (settledAmount / totalInventory) * 100) : 0;
                
                // For reserved, calculate percentage based on comparison with total
                const reservedPercentage = reservedAmount > 0 && totalInventory > 0 
                  ? Math.min(100, (reservedAmount / Math.max(reservedAmount, totalInventory)) * 100) 
                  : 0;
                
                return (
                  <>
                    {/* Fijado Section - Amarillo */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        <span>Fijado</span>
                        <span>Abierto</span>
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
                            formatPattern: '0,000.00',
                            roundMode: 'truncate'
                          })} {unit}
                        </div>
                        <div className="text-base font-bold text-yellow-600 dark:text-yellow-400">
                          {formatNumber({ 
                            value: openAmount, 
                            minDecimals: 2, 
                            maxDecimals: 2,
                            formatPattern: '0,000.00',
                            roundMode: 'truncate'
                          })} {unit}
                        </div>
                      </div>
                    </div>

                    {/* Reservado Section - Azul */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        <span>Reservado</span>
                        <span>Disponible</span>
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
                            formatPattern: '0,000.00',
                            roundMode: 'truncate'
                          })} {unit}
                        </div>
                        <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber({ 
                            value: availableAmount, 
                            minDecimals: 2, 
                            maxDecimals: 2,
                            formatPattern: '0,000.00',
                            roundMode: 'truncate'
                          })} {unit}
                        </div>
                      </div>
                    </div>

                    {/* Liquidado Section - Verde */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        <span>Liquidado</span>
                        <span>Sin liquidar</span>
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
                            formatPattern: '0,000.00',
                            roundMode: 'truncate'
                          })} {unit}
                        </div>
                        <div className="text-base font-bold text-green-600 dark:text-green-400">
                          {formatNumber({ 
                            value: unsettledAmount, 
                            minDecimals: 2, 
                            maxDecimals: 2,
                            formatPattern: '0,000.00',
                            roundMode: 'truncate'
                          })} {unit}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>



        {/* Sub-contracts Section */}
        <div className="mt-8">
          <SubContractsSection
            subContracts={subContracts}
            fields={fieldConfig}
            progressBar={progressBarConfig}
            onNewSubContract={() => setLocation(`/purchase-contracts/${contractId}/sub-contracts/create`)}
            onViewSubContract={(id) => console.log('View sub-contract:', id)}
            onPrintSubContract={(id) => console.log('Print sub-contract:', id)}
            onEditSubContract={(id) => console.log('Edit sub-contract:', id)}
            onDeleteSubContract={(id) => console.log('Delete sub-contract:', id)}
            onSettleSubContract={(id) => console.log('Settle sub-contract:', id)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
