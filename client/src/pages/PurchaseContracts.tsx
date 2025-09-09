import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import {
  useContractsPageState,
  usePageTracking,
  useNavigationHandler,
} from "@/hooks/usePageState";
import DashboardLayout from "@/layouts/DashboardLayout/view";
import { useCommodities } from "@/hooks/useCommodities";
import {
  GenericTable,
  TableColumn,
  FilterOption,
  DataFetchFunction,
} from "@/components/general/StandardTable";
import { PurchaseSaleContract } from "@/types/purchaseSaleContract.types";
import { formatNumber } from "@/lib/numberFormatter";
import {
  fetchContractsData,
  fetchContractsDataDirect,
  generateContractId,
} from "@/services/contracts/contracts.service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Edit } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function PurchaseContracts() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const {
    commodities,
    loading: commoditiesLoading,
    error: commoditiesError,
  } = useCommodities();

  // Draft system removido - no más indicadores de draft
  const hasDraftData = false;

  // Hook para persistir estado de la página
  const { pageState, updateState } = useContractsPageState("purchaseContracts");
  const { handleNavigateToPage } = useNavigationHandler();
  usePageTracking("/purchase-contracts");

  // Notificar navegación al cargar la página
  useEffect(() => {
    console.log(
      "🔄 PURCHASE CONTRACTS PAGE: Cargando página y ejecutando navegación jerárquica",
    );
    handleNavigateToPage("purchaseContracts");
  }, []);

  // Estado principal organizado como JSON
  const [pageStateData, setPageStateData] = useState<{
    selectedFilters: Record<string, any>;
    contracts: PurchaseSaleContract[];
  }>(() => {
    // Inicializar filtros con valores por defecto o desde el estado persistido
    const defaultFilters = { pricingType: ["all"], commodity: ["all"] };
    const saved = pageState.filters;

    const selectedFilters =
      saved &&
      ((saved.pricingType && !saved.pricingType.includes("all")) ||
        (saved.commodity && !saved.commodity.includes("all")))
        ? saved
        : defaultFilters;

    return {
      selectedFilters,
      contracts: pageState.contractsData || [],
    };
  });

  // Estados adicionales para el control de la UI
  const [currentPage, setCurrentPage] = useState(pageState.currentPage || 1);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [totalContracts, setTotalContracts] = useState(0);

  // Para compatibilidad con componentes existentes
  const selectedFilters = pageStateData.selectedFilters;
  const contracts = pageStateData.contracts;

  // Estado para guardar los datos de la tabla que vienen del API (mantenido para compatibilidad)
  const [tableData, setTableData] = useState<{
    contracts: PurchaseSaleContract[];
    totalElements: number;
    currentPage: number;
    filters: any;
  }>({
    contracts: [],
    totalElements: 0,
    currentPage: 1,
    filters: {},
  });

  // Estado para parámetros de tabla (paginación, búsqueda, etc)
  const [tableParams, setTableParams] = useState({
    page: 1,
    limit: 5,
    search: "",
    sort: null as any,
  });

  // Efecto para persistir cambios de filtros y página
  useEffect(() => {
    updateState({
      filters: pageStateData.selectedFilters,
      currentPage,
      searchTerm: "",
      contractsData: pageStateData.contracts,
    });
  }, [
    JSON.stringify(pageStateData.selectedFilters),
    currentPage,
    pageStateData.contracts.length,
  ]);

  // Debug: Log commodity data
  useEffect(() => {
    console.log("Commodities data:", commodities);
    console.log("Commodities loading:", commoditiesLoading);
    console.log("Commodities error:", commoditiesError);
  }, [commodities, commoditiesLoading, commoditiesError]);

  // Crear filtros de commodity basados en los datos reales
  const commodityFilters: FilterOption[] = [
    {
      key: "all",
      value: "all",
      label: { key: "filters.all" },
    },
    ...commodities.map((commodity) => ({
      key: commodity.key,
      value: commodity.value,
      label: commodity.label,
    })),
  ];

  // Debug: Log commodity filters
  useEffect(() => {
    console.log("Commodity filters:", commodityFilters);
  }, [commodityFilters]);

  // Función para cargar contratos desde la API
  const fetchContracts = async (
    page: number = 1,
    limit: number = 10,
    activeFilters: Record<string, any> = {},
    searchTerm: string = "",
    sortConfig: { field: string; direction: string } | null = null,
  ) => {
    try {
      setContractsLoading(true);
      setContractsError(null);

      // Obtener datos de autenticación
      const partitionKey = localStorage.getItem("partition_key") || "";
      const idToken = localStorage.getItem("id_token") || "";

      if (!partitionKey || !idToken) {
        console.error(
          "No hay datos de autenticación disponibles para contratos",
        );
        setPageStateData((prev) => ({ ...prev, contracts: [] }));
        return;
      }

      // Usar servicio centralizado de contratos
      const result = await fetchContractsDataDirect(
        page,
        limit,
        searchTerm,
        activeFilters,
        sortConfig,
        commodities,
        { partitionKey, idToken }
      );

      const mappedContracts = result.data;
      const totalElements = result.total;
      const totalPages = result.totalPages;

      console.log("Contracts from service:", mappedContracts);
      console.log("Setting contracts in state. Total contracts:", mappedContracts.length);
      console.log("First contract example:", mappedContracts[0] || "No contracts found");
      console.log("=== TODOS LOS IDs MAPEADOS ===");
      console.log(
        "IDs de contratos cargados:",
        mappedContracts.map((c) => ({ _id: c._id, folio: c.folio })),
      );
      console.log("===========================");

      // Actualizar el estado principal con los contratos
      setPageStateData((prev) => ({ ...prev, contracts: mappedContracts }));
      setTotalContracts(totalElements);

      // Actualizar tableData con información de paginación completa
      setTableData({
        contracts: mappedContracts,
        totalElements: totalElements,
        currentPage: tableParams.page,
        filters: selectedFilters,
      });

      console.log(
        "📊 PAGINACIÓN - Total elementos:",
        totalElements,
        "Total páginas:",
        totalPages,
        "Página actual:",
        tableParams.page,
      );

      // Guardar contratos en Redux state para uso en otras páginas
      updateState({
        contractsData: mappedContracts,
      });
    } catch (error) {
      console.error("Error al cargar contratos:", error);
      setContractsError(
        error instanceof Error ? error.message : "Error al cargar contratos",
      );
      setPageStateData((prev) => ({ ...prev, contracts: [] }));
    } finally {
      setContractsLoading(false);
    }
  };

  // Auto-reload table data when selectedFilters change (without using table callback to avoid loops)
  useEffect(() => {
    const reloadTableWithFilters = async () => {
      if (commodities.length > 0) {
        console.log(
          "🔄 Filtros cambiaron, recargando tabla con nuevos filtros:",
          selectedFilters,
        );

        // Usar parámetros básicos para evitar loops
        const basicParams = {
          page: 1,
          pageSize: tableParams.limit,
          search: "",
          sort: null,
        };

        await handleFetchContractsData(basicParams);
        console.log("✅ Tabla recargada con filtros actualizados");
      }
    };

    reloadTableWithFilters();
  }, [selectedFilters, commodities.length]); // Trigger when filters or commodities change

  // Función de fetch de datos usando el servicio externo
  const handleFetchContractsData: DataFetchFunction<
    PurchaseSaleContract
  > = async (params) => {
    // Iniciar loading y tiempo de control
    setContractsLoading(true);
    const startTime = Date.now();

    try {
      // Obtener datos de autenticación desde localStorage
      const partitionKey =
        localStorage.getItem("partitionKey") ||
        localStorage.getItem("partition_key");
      const idToken = localStorage.getItem("id_token");

      // Aplicar filtros seleccionados
      const filters = selectedFilters;

      console.log("📤 ENVIANDO AL ENDPOINT - Filtros:", filters);
      console.log("📤 ENVIANDO AL ENDPOINT - Parámetros completos:", {
        ...params,
        filters,
      });

      const result = await fetchContractsData({
        page: params.page,
        limit: params.limit || params.pageSize,
        search: params.search,
        sort: params.sort,
        filters,
        commodities,
        authData: {
          partitionKey: partitionKey || "",
          idToken: idToken || "",
        },
      });

      // Calcular tiempo transcurrido
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 300; // 300ms mínimo

      // Si han pasado menos de 300ms, esperar hasta completar el tiempo mínimo
      if (elapsedTime < minLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minLoadingTime - elapsedTime),
        );
      }

      // Guardar los datos en el estado local (tabla)
      setTableData({
        contracts: result.data,
        totalElements: result.total,
        currentPage: params.page,
        filters: filters,
      });

      // Actualizar el estado JSON principal con los contratos
      setPageStateData((prev) => ({
        ...prev,
        contracts: result.data,
      }));

      console.log(
        "🔄 DATOS ACTUALIZADOS - Total contratos encontrados:",
        result.data.length,
      );
      console.log(
        "🔄 DATOS ACTUALIZADOS - Contratos (primeros 2):",
        result.data
          .slice(0, 2)
          .map((c) => ({ folio: c.folio, commodity: c.commodity?.name })),
      );

      // Guardar contratos en Redux state para uso en otras páginas
      updateState({
        contractsData: result.data,
      });

      return result;
    } catch (error) {
      console.error("❌ Error cargando contratos:", error);

      // Asegurar tiempo mínimo incluso en error
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 300;

      if (elapsedTime < minLoadingTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, minLoadingTime - elapsedTime),
        );
      }

      // Retornar datos vacíos en caso de error
      return {
        data: [] as PurchaseSaleContract[],
        total: 0,
        totalPages: 0,
      };
    } finally {
      setContractsLoading(false);
    }
  };

  // Función para toggle de filtros
  const toggleFilter = (filterKey: string, value: any) => {
    console.log("🔄 TOGGLE FILTER:", filterKey, "Value:", value);
    console.log("Current filters before toggle:", selectedFilters);

    setPageStateData((prev) => {
      const currentFilters = prev.selectedFilters;
      // Comportamiento especial para pricingType: solo un valor a la vez
      if (filterKey === "pricingType") {
        const currentValues = currentFilters[filterKey] || [];
        // Si ya está seleccionado, lo deseleccionamos (permitir quitar el filtro)
        const newValues = currentValues.includes(value) ? [] : [value]; // Solo un valor seleccionado a la vez

        return {
          ...prev,
          selectedFilters: { ...currentFilters, [filterKey]: newValues },
        };
      }

      // Comportamiento especial para commodity: "All" es mutuamente exclusivo
      if (filterKey === "commodity") {
        const currentValues = currentFilters[filterKey] || [];

        // Si se selecciona "all"
        if (value === "all") {
          // Si "all" ya está seleccionado, no hacer nada (mantenerlo seleccionado)
          if (currentValues.includes("all")) {
            return prev;
          }
          // Si "all" no está seleccionado, seleccionarlo y deseleccionar todo lo demás
          return {
            ...prev,
            selectedFilters: { ...currentFilters, [filterKey]: ["all"] },
          };
        }

        // Si se selecciona cualquier valor que no es "all"
        // Primero remover "all" si está presente
        let newValues = currentValues.filter((v: any) => v !== "all");

        // Luego aplicar la lógica normal de toggle
        if (newValues.includes(value)) {
          newValues = newValues.filter((v: any) => v !== value);
          // Si no queda ningún valor seleccionado, volver a "all"
          if (newValues.length === 0) {
            newValues = ["all"];
          }
        } else {
          newValues = [...newValues, value];
        }

        console.log("📦 COMMODITY - New values:", newValues);
        return {
          ...prev,
          selectedFilters: { ...currentFilters, [filterKey]: newValues },
        };
      }

      // Comportamiento por defecto para otros filtros (múltiple selección)
      const currentValues = currentFilters[filterKey] || [];
      const newValues = Array.isArray(currentValues)
        ? currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value]
        : [value];

      const newFilters = { ...currentFilters, [filterKey]: newValues };
      console.log("📋 Final filter result:", newFilters);
      return { ...prev, selectedFilters: newFilters };
    });
    setCurrentPage(1);
  };

  // Definir las columnas de la tabla
  const columns: TableColumn<PurchaseSaleContract>[] = [
    {
      key: "pricingIndicator",
      titleKey: "", // Sin título para esta columna
      render: (contract) => {
        const pricingType = contract.price_schedule?.[0]?.pricing_type;
        const bgColor =
          pricingType === "basis"
            ? "bg-purple-100 dark:bg-purple-900"
            : "bg-blue-100 dark:bg-blue-900";

        return <div className={`w-6 h-6 rounded-full ${bgColor}`}></div>;
      },
      sortable: false,
      width: "50px",
    },
    {
      key: "customer",
      titleKey: "customer",
      render: (contract) => {
        const seller = contract.participants?.find((p) => p.role === "seller");
        return (
          <span className="font-medium text-gray-900 dark:text-white">
            {seller?.name || "Unknown"}
          </span>
        );
      },
      sortable: true,
      width: "200px",
    },
    {
      key: "date",
      titleKey: "date",
      render: (contract) => {
        const date = new Date(contract.contract_date || "");
        const formattedDate = date.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
        });
        return (
          <span className="text-gray-700 dark:text-gray-300">
            {formattedDate}
          </span>
        );
      },
      sortable: true,
      width: "120px",
    },
    {
      key: "commodity",
      titleKey: "commodity",
      render: (contract) => (
        <span className="text-gray-900 dark:text-white">
          {contract.commodity.name}
        </span>
      ),
      sortable: true,
      width: "180px",
    },
    {
      key: "quantity",
      titleKey: "quantity",
      render: (contract) => {
        const formattedQuantity = formatNumber({
          value: contract.quantity || 0,
          minDecimals: 2,
          maxDecimals: 2,
          formatPattern: "0,000.00",
          roundMode: "truncate",
        });
        return (
          <span className="text-gray-900 dark:text-white font-medium">
            {formattedQuantity}{" "}
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {contract.measurement_unit}
            </span>
          </span>
        );
      },
      sortable: true,
      width: "150px",
    },
    {
      key: "price",
      titleKey: "price",
      render: (contract) => {
        const priceValue = contract.price_schedule?.[0]?.price || 0;
        const formattedPrice = formatNumber({
          value: priceValue,
          minDecimals: 2,
          maxDecimals: 4,
          formatPattern: "0,000.00",
          roundMode: "truncate",
        });
        return (
          <span className="text-green-600 dark:text-green-400 font-bold font-mono">
            $ {formattedPrice}
          </span>
        );
      },
      sortable: true,
      width: "120px",
    },
    {
      key: "basis",
      titleKey: "basis",
      render: (contract) => {
        const basisValue = contract.price_schedule?.[0]?.basis || 0;
        const formattedBasis = formatNumber({
          value: basisValue,
          minDecimals: 2,
          maxDecimals: 4,
          formatPattern: "0,000.00",
          roundMode: "truncate",
        });
        return (
          <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">
            $ {formattedBasis}
          </span>
        );
      },
      sortable: true,
      width: "120px",
    },
    {
      key: "future",
      titleKey: "future",
      render: (contract) => {
        const futureValue = contract.price_schedule?.[0]?.future_price || 0;
        const formattedFuture = formatNumber({
          value: futureValue,
          minDecimals: 2,
          maxDecimals: 4,
          formatPattern: "0,000.00",
          roundMode: "truncate",
        });
        return (
          <span className="text-orange-600 dark:text-orange-400 font-bold font-mono">
            $ {formattedFuture}
          </span>
        );
      },
      sortable: true,
      width: "120px",
    },
    {
      key: "reserve",
      titleKey: "reserve",
      render: (contract) => {
        const reserveValue = contract.inventory?.reserved || 0;
        const formattedReserve = formatNumber({
          value: reserveValue,
          minDecimals: 2,
          maxDecimals: 4,
          formatPattern: "0,000.00",
          roundMode: "truncate",
        });
        return (
          <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
            {formattedReserve}{" "}
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {contract.measurement_unit}
            </span>
          </span>
        );
      },
      sortable: true,
      width: "120px",
    },
    {
      key: "id",
      titleKey: "id",
      render: (contract) => (
        <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
          {contract.folio || contract._id}
        </span>
      ),
      sortable: true,
      width: "150px",
    },
  ];

  return (
    <DashboardLayout title={t("purchaseContracts")}>
      <div className="space-y-6">
        {/* Header with title and create button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("purchaseContractsList")}
          </h1>
          <div className="flex gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 relative"
              size="lg"
              onClick={async () => {
                console.log(
                  "🆔 Generating contract ID before navigationwwwwww...",
                );
                const contractIdGenerated = await generateContractId();
                console.log(contractIdGenerated);
                if (contractIdGenerated) {
                  console.log(
                    "✅ Contract ID generated8888:",
                    contractIdGenerated,
                  );
                  setLocation(
                    `/purchase-contracts/create/${contractIdGenerated}`,
                  );
                } else {
                  console.error("❌ Failed to generate contract ID");
                }
              }}
            >
              {hasDraftData && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
              )}
              <Plus className="w-4 h-4" />
              {t("createContract")}
            </Button>
          </div>
        </div>

        {/* Pricing Type Filters */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("contractType")}
          </h3>
          <div className="flex flex-wrap gap-2">
          {[
            { key: "all", value: "all", labelKey: "filters.all" },
            { key: "fixed", value: "fixed", labelKey: "filters.fixed" },
            { key: "basis", value: "basis", labelKey: "filters.basis" },
          ].map((filter) => (
            <Button
              key={filter.key}
              variant="ghost"
              size="sm"
              onClick={() => toggleFilter("pricingType", filter.value)}
              className={`px-4 py-2 rounded-full border transition-colors ${
                selectedFilters.pricingType?.includes(filter.value)
                  ? filter.value === "all"
                    ? "bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-800/60 dark:to-blue-800/60 border-purple-400 dark:border-purple-500 text-purple-800 dark:text-purple-200 shadow-md hover:from-purple-300 hover:to-blue-300 dark:hover:from-purple-900/70 dark:hover:to-blue-900/70"
                    : filter.value === "basis"
                      ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 shadow-md hover:bg-purple-200 hover:border-purple-400 dark:hover:bg-purple-900/50"
                      : "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 shadow-md hover:bg-blue-200 hover:border-blue-400 dark:hover:bg-blue-900/50"
                  : filter.value === "fixed"
                    ? "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 dark:hover:bg-blue-900/40 dark:hover:border-blue-400 dark:hover:text-blue-200"
                    : filter.value === "basis"
                      ? "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-800 dark:hover:bg-purple-900/40 dark:hover:border-purple-400 dark:hover:text-purple-200"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-800 dark:hover:bg-gray-700/40 dark:hover:border-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t(filter.labelKey)}
            </Button>
          ))}
          </div>
        </div>

        {/* Commodity Filters */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("commodity")}
          </h3>
          <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFilter("commodity", "all")}
            className={`px-4 py-2 rounded-full border transition-colors ${
              selectedFilters.commodity?.includes("all")
                ? "bg-gradient-to-r from-green-200 to-emerald-200 dark:from-green-800/60 dark:to-emerald-800/60 border-green-400 dark:border-green-500 text-green-800 dark:text-green-200 shadow-md hover:from-green-300 hover:to-emerald-300 dark:hover:from-green-900/70 dark:hover:to-emerald-900/70"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-green-100 hover:border-green-400 hover:text-green-800 dark:hover:bg-green-900/40 dark:hover:border-green-400 dark:hover:text-green-200"
            }`}
          >
            {t("filters.all")}
          </Button>
          {commodities.map((commodity) => (
            <Button
              key={commodity.key}
              variant="ghost"
              size="sm"
              onClick={() => toggleFilter("commodity", commodity.key)}
              className={`px-4 py-2 rounded-full border transition-colors ${
                selectedFilters.commodity?.includes(commodity.key)
                  ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 shadow-md hover:bg-green-200 hover:border-green-400 dark:hover:bg-green-900/50"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-green-100 hover:border-green-400 hover:text-green-800 dark:hover:bg-green-900/40 dark:hover:border-green-400 dark:hover:text-green-200"
              }`}
            >
              {commodity.label}
            </Button>
          ))}
          </div>
        </div>

        {/* Table without filters, title, or create button */}
        <GenericTable
          columns={columns}
          data={tableData.contracts} // Pass pre-loaded data directly
          totalElements={tableData.totalElements}
          totalPages={Math.ceil(tableData.totalElements / tableParams.limit)} // Calculate total pages
          loading={contractsLoading}
          getItemId={(item: PurchaseSaleContract) => item._id} // Use _id field for unique identification
          showFilters={false} // Filters are handled by parent component
          sortFieldMapping={{
            // UI field -> API field mapping
            seller: "participants.name",
            date: "contract_date",
            commodity: "commodity.name",
            quantity: "quantity",
            price: "price_schedule.price",
            basis: "price_schedule.basis",
            future: "price_schedule.future_price",
            reserve: "inventory.reserved",
            id: "folio",
          }}
          onPageChange={(page) => {
            const newParams = {
              page,
              pageSize: tableParams.limit,
              search: tableParams.search,
              sort: tableParams.sort,
            };
            setTableParams({ ...tableParams, page });
            handleFetchContractsData(newParams);
          }}
          onPageSizeChange={(pageSize) => {
            const newParams = {
              page: 1,
              pageSize,
              search: tableParams.search,
              sort: tableParams.sort,
            };
            setTableParams({ ...tableParams, page: 1, limit: pageSize });
            handleFetchContractsData(newParams);
          }}
          onSearchChange={(search) => {
            const newParams = {
              page: 1,
              pageSize: tableParams.limit,
              search,
              sort: tableParams.sort,
            };
            setTableParams({ ...tableParams, page: 1, search });
            handleFetchContractsData(newParams);
          }}
          onSortChange={(sort) => {
            console.log("🔧 SORT CHANGE - Sort recibido:", sort);
            const newParams = {
              page: 1,
              pageSize: tableParams.limit,
              search: tableParams.search,
              sort,
            };
            setTableParams({ ...tableParams, page: 1, sort });
            handleFetchContractsData(newParams);
          }}
          actionMenuItems={[
            {
              key: "view",
              labelKey: "view",
              action: (contract: PurchaseSaleContract) => {
                console.log("Ver contrato:", contract._id);
                handleNavigateToPage("contractDetail", contract._id);
                setLocation(`/purchase-contracts/${contract._id}`);
              },
            },
            {
              key: "edit",
              labelKey: "edit",
              action: (contract: PurchaseSaleContract) => {
                console.log("Editar contrato:", contract._id);
                // Implementar navegación a editar
              },
            },
          ]}
        />
      </div>
    </DashboardLayout>
  );
}
