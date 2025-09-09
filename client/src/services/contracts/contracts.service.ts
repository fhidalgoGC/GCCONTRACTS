import { PurchaseSaleContract } from "@/types/purchaseSaleContract.types";
import { authenticatedFetch } from "@/utils/apiInterceptors";
import { environment } from "@/environment/environment";
import { ContractResponse, FetchContractsParams, sortFieldMapping } from "./types";

// Direct fetch function for contracts (to be deprecated)
export const fetchContractsDataDirect = async (
  page: number,
  limit: number,
  search: string | undefined,
  filters: Record<string, any>,
  sortConfig: { field: string; direction: "asc" | "desc" } | null,
  commodities: Array<{ key: string; value: string; label: string }>,
  authData: { partitionKey: string; idToken: string }
) => {
  const { partitionKey, idToken } = authData;
  
  try {
    // Construir filtros para la API
    const filter: any = { type: "purchase" };
    
    // Si hay filtros de commodity, los aplicamos
    if (filters?.commodity?.length && !filters.commodity.includes("all")) {
      const selectedCommodityIds = filters.commodity;
      if (selectedCommodityIds.length > 0) {
        filter["commodity.commodity_id"] = { $in: selectedCommodityIds };
      }
    }

    // Si hay filtros de pricing type, los aplicamos
    if (filters?.pricingType?.length && !filters.pricingType.includes("all")) {
      const validPricingTypes = filters.pricingType.filter(
        (type: string) => type === "fixed" || type === "basis",
      );
      if (validPricingTypes.length > 0) {
        // Para pricingType usamos solo el primer valor ya que es single selection
        filter["price_schedule.pricing_type"] = validPricingTypes[0];
      }
    }

    // Construir parámetros de URL
    const params = new URLSearchParams({
      all: "true",
      filter: JSON.stringify(filter),
      page: page.toString(),
      limit: limit.toString(),
    });

    // Agregar ordenamiento si existe
    if (sortConfig) {
      params.append(
        `sort[${sortConfig.field}]`,
        sortConfig.direction === "asc" ? "1" : "-1",
      );
    } else {
      // Ordenamiento por defecto por fecha de creación descendente
      params.append("sort[created_at]", "-1");
    }

    const url = `${environment.TRM_BASE_URL}/contracts/sp-contracts?${params.toString()}`;
    console.log("Fetching contracts from:", url);

    const response = await authenticatedFetch(url, {
      method: "GET",
      customHeaders: {
        accept: "*/*",
        "accept-language": "es-419,es;q=0.9",
        origin: environment.CONTRACTS_ORIGIN,
      },
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `HTTP error! status: ${response.status}, response: ${errorText}`,
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: any = await response.json();
    console.log("Contracts response:", data);

    // Mapear los datos de la API real a nuestro formato
    const mappedContracts: PurchaseSaleContract[] = data.data.map(
      (contract: any) => ({
        id: contract._id || contract.id,
        folio: contract.folio,
        reference_number: contract.folio,
        commodity: contract.commodity,
        participants: contract.participants,
        characteristics: contract.characteristics,
        type: contract.type as "purchase",
        sub_type: contract.sub_type as
          | "direct"
          | "imported"
          | "importedFreight",
        quantity: contract.quantity,
        measurement_unit_id: contract.measurement_unit_id,
        measurement_unit: contract.measurement_unit,
        price_schedule: contract.price_schedule,
        logistic_schedule: contract.logistic_schedule,
        shipping_start_date: contract.shipping_start_date,
        shipping_end_date: contract.shipping_end_date,
        contract_date: contract.contract_date,
        delivered: contract.delivered,
        transport: contract.transport,
        weights: contract.weights,
        inspections: contract.inspections,
        proteins: contract.proteins,
        application_priority: contract.application_priority,
        thresholds: contract.thresholds,
        status: contract.status,
        grade:
          typeof contract.grade === "string"
            ? parseInt(contract.grade) || 0
            : contract.grade,
        inventory: contract.inventory,
      }),
    );

    return {
      data: mappedContracts,
      total: data._meta.total_elements,
      totalPages: data._meta.total_pages,
    };
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return {
      data: [] as PurchaseSaleContract[],
      total: 0,
      totalPages: 0,
    };
  }
};

export const fetchContractsData = async (params: FetchContractsParams) => {
  const {
    page,
    limit,
    search,
    filters,
    sort,
    commodities,
    authData,
    contractType = "purchase",
  } = params;
  const { partitionKey, idToken } = authData;

  try {
    // Validar tokens de autenticación
    if (!partitionKey || !idToken) {
      console.error("Missing authentication data");
      return {
        data: [] as PurchaseSaleContract[],
        total: 0,
        totalPages: 0,
      };
    }

    // Construir filtros para la API usando $and structure
    const andConditions: any[] = [{ type: contractType }];

    console.log("🔍 SERVICIO - Filtros recibidos:", filters);

    if (filters?.pricingType?.length && !filters.pricingType.includes("all")) {
      console.log(
        "📍 SERVICIO - Aplicando filtro pricingType:",
        filters.pricingType[0],
      );
      andConditions.push({
        "price_schedule.pricing_type": filters.pricingType[0],
      });
    }

    if (filters?.commodity?.length && !filters.commodity.includes("all")) {
      // Los filtros ya contienen los IDs directamente, solo necesitamos usarlos
      const selectedCommodityIds = filters.commodity;

      console.log(
        "📍 SERVICIO - Commodities seleccionadas (IDs):",
        filters.commodity,
      );
      console.log(
        "📍 SERVICIO - Aplicando filtro con IDs:",
        selectedCommodityIds,
      );

      if (selectedCommodityIds.length > 0) {
        andConditions.push({
          "commodity.commodity_id": { $in: selectedCommodityIds },
        });
      }
    }

    // Agregar búsqueda si existe - implementar OR sobre todos los campos relevantes
    if (search) {
      const searchTerm = search.trim();
      if (searchTerm) {
        const orConditions: any[] = [
          // Buscar en participantes (seller/buyer names)
          { "participants.name": { $regex: `.*${searchTerm}`, $options: "i" } },
          // Buscar en commodity name
          { "commodity.name": { $regex: `.*${searchTerm}`, $options: "i" } },
          // Buscar en folio/reference number
          { folio: { $regex: `.*${searchTerm}`, $options: "i" } },
          // Buscar en measurement unit
          { measurement_unit: { $regex: `.*${searchTerm}`, $options: "i" } },
        ];

        // Intentar convertir a número para campos numéricos
        const numericValue = parseFloat(searchTerm);
        if (!isNaN(numericValue)) {
          orConditions.push(
            { "price_schedule.price": numericValue },
            { "price_schedule.basis": numericValue },
            { "price_schedule.future_price": numericValue },
            { quantity: numericValue },
          );
        }

        andConditions.push({ $or: orConditions });
      }
    }

    const apiFilter = { $and: andConditions };

    console.log(
      "🎯 SERVICIO - Filtro final para API:",
      JSON.stringify(apiFilter, null, 2),
    );

    // Construir parámetros de consulta usando el mismo formato que fetchContracts
    const queryParams = new URLSearchParams({
      all: "true",
      filter: JSON.stringify(apiFilter),
      page: (page || 1).toString(),
      limit: (limit || 10).toString(),
    });

    // Agregar ordenamiento en el mismo formato que fetchContracts
    console.log(
      "🔧 SERVICIO - Sort recibido:",
      sort,
      "Type:",
      typeof sort,
      "Sort.key:",
      sort?.key,
    );
    if (sort && sort.key && sort.key !== "undefined" && sort.key !== null) {
      const apiFieldName = sortFieldMapping[sort.key] || sort.key;
      console.log(
        "🔧 SERVICIO - Usando sort:",
        sort.key,
        "→",
        apiFieldName,
        "Direction:",
        sort.direction,
      );
      queryParams.append(
        `sort[${apiFieldName}]`,
        sort.direction === "asc" ? "1" : "-1",
      );
    } else {
      // Ordenamiento por defecto por fecha de contrato descendente
      console.log("🔧 SERVICIO - Usando sort por defecto: contract_date");
      queryParams.append("sort[contract_date]", "-1");
    }

    console.log("🌐 SERVICIO - URL con parámetros:", queryParams.toString());

    const url = `${environment.TRM_BASE_URL}/contracts/sp-contracts?${queryParams.toString()}`;
    console.log("📡 SERVICIO - URL completa:", url);

    const response = await authenticatedFetch(url, {
      method: "GET",
      customHeaders: {
        accept: "*/*",
        "accept-language": "es-419,es;q=0.9",
        origin: environment.CONTRACTS_ORIGIN,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `HTTP error! status: ${response.status}, response: ${errorText}`,
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ContractResponse = await response.json();

    // Check if data exists and has data array
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.log("⚠️ SERVICIO - No data found in API response:", data);
      return {
        contracts: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: page,
      };
    }

    // Mapear los datos de la API real a nuestro formato
    const mappedContracts: PurchaseSaleContract[] = data.data.map(
      (contract) => ({
        _id: contract._id,
        folio: contract.folio,
        reference_number: contract.reference_number || "N/A",
        commodity: contract.commodity,
        participants: (contract.participants || []).map((p) => ({
          ...p,
          role: p.role as "buyer" | "seller",
        })),
        characteristics: contract.characteristics,
        type: contract.type as "purchase",
        sub_type: contract.sub_type as
          | "direct"
          | "imported"
          | "importedFreight",
        grade: contract.grade,
        quantity: contract.quantity,
        measurement_unit_id: contract.measurement_unit_id,
        measurement_unit: contract.measurement_unit,
        price_schedule: (contract.price_schedule || []).map((ps) => ({
          ...ps,
          pricing_type: ps.pricing_type as "fixed" | "basis",
          basis_operation: ps.basis_operation as "add" | "subtract",
          payment_currency: ps.payment_currency,
        })),
        logistic_schedule: (contract.logistic_schedule || []).map((ls) => ({
          ...ls,
          logistic_payment_responsability:
            ls.logistic_payment_responsability as "buyer" | "seller" | "other",
          logistic_coordination_responsability:
            ls.logistic_coordination_responsability as
              | "buyer"
              | "seller"
              | "other",
          payment_currency: ls.payment_currency,
          freight_cost: {
            ...ls.freight_cost,
            type: ls.freight_cost?.type as "none" | "fixed" | "variable",
          },
        })),
        shipping_start_date: contract.shipping_start_date,
        shipping_end_date: contract.shipping_end_date,
        contract_date: contract.contract_date,
        delivered: contract.delivered,
        transport: contract.transport,
        weights: contract.weights,
        inspections: contract.inspections,
        proteins: contract.proteins,
        application_priority: contract.application_priority,
        status: contract.status,
        thresholds: {
          min_thresholds_percentage:
            contract.thresholds?.min_thresholds_percentage || 0,
          min_thresholds_weight:
            contract.thresholds?.min_thresholds_weight || 0,
          max_thresholds_percentage:
            contract.thresholds?.max_thresholds_percentage || 0,
          max_thresholds_weight:
            contract.thresholds?.max_thresholds_weight || 0,
        },
        inventory: contract.inventory,
        remarks: contract.remarks?.map((r) => r.comment) || [],
      }),
    );

    return {
      data: mappedContracts,
      total: data._meta.total_elements,
      totalPages: data._meta.total_pages,
    };
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return {
      data: [] as PurchaseSaleContract[],
      total: 0,
      totalPages: 0,
    };
  }
};

// Función para eliminar un sub-contrato
export const deleteSubContract = async (
  subContractId: string,
): Promise<boolean> => {
  try {
    console.log("🗑️ Iniciando eliminación de sub-contrato:", subContractId);

    // Usar authenticatedFetch del interceptor
    const { authenticatedFetch } = await import("@/utils/apiInterceptors");

    const response = await authenticatedFetch(
      `${environment.TRM_BASE_URL}/contracts/sp-sub-contracts/${subContractId}`,
      {
        method: "DELETE",
        customHeaders: {
          "pk-organization": localStorage.getItem("partition_key") || "",
        },
      },
    );

    console.log("📡 Delete response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Error al eliminar sub-contrato! status: ${response.status}, response: ${errorText}`,
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log("✅ Sub-contrato eliminado exitosamente");
    return true;
  } catch (error) {
    console.error("❌ Error eliminando sub-contrato:", error);
    throw error;
  }
};

// Service function to generate a new contract ID
export const generateContractId = async (): Promise<string | null> => {
  try {
    console.log("🆔 Generating new contract ID....");
    const response = await authenticatedFetch(
      `${environment.TRM_BASE_URL}/contracts/sp-contracts`,
      {
        method: "POST",
        body: "",
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅  SERVICE Contract ID generated:", data.data.key);
    return data.data.key;
  } catch (error) {
    console.error("❌ SERVICE Error generating contract ID:", error);
    return null;
  }
};

// Service function to submit/update a contract
// Get contract by ID
export const getContractById = async (contractId: string) => {
  const url = `${environment.TRM_BASE_URL}/contracts/sp-contracts/${contractId}`;
  return await authenticatedFetch(url, {
    method: "GET",
    customHeaders: {
      "pk-organization": localStorage.getItem("partition_key") || "",
    },
  });
};

// Get sub-contracts by contract ID
export const getSubContractsByContractId = async (contractId: string) => {
  const filter = JSON.stringify({ contract_id: contractId });
  const url = `${environment.TRM_BASE_URL}/contracts/sp-sub-contracts?filter=${encodeURIComponent(filter)}&limit=100`;
  return await authenticatedFetch(url, {
    method: "GET",
    customHeaders: {
      "pk-organization": localStorage.getItem("partition_key") || "",
    },
  });
};

// Get participant location
export const getParticipantLocation = async (participantId: string) => {
  const url = `${environment.CRM_BASE_URL}/crm-locations/address/contracts-owner/${participantId}`;
  return await authenticatedFetch(url, {
    method: "GET",
    customHeaders: {
      "pk-organization": localStorage.getItem("partition_key") || "",
    },
  });
};

// Delete contract by ID
export const deleteContract = async (contractId: string) => {
  const url = `${environment.TRM_BASE_URL}/contracts/sp-contracts/${contractId}`;
  return await authenticatedFetch(url, {
    method: "DELETE",
    customHeaders: {
      "pk-organization": localStorage.getItem("partition_key") || "",
    },
  });
};

// Settle parent contract
export const settleParentContract = async (contractId: string) => {
  const url = `${environment.TRM_BASE_URL}/contracts/sp-contracts/settled/${contractId}`;
  return await authenticatedFetch(url, {
    method: "PATCH",
    customHeaders: {
      "pk-organization": localStorage.getItem("partition_key") || "",
    },
  });
};

// Settle sub-contract
export const settleSubContract = async (subContractId: string) => {
  const url = `${environment.TRM_BASE_URL}/contracts/sp-contracts/settled/${subContractId}`;
  return await authenticatedFetch(url, {
    method: "PATCH",
    customHeaders: {
      "pk-organization": localStorage.getItem("partition_key") || "",
    },
  });
};

export const submitContract = async (
  contractId: string,
  contractData: any,
): Promise<{ success: boolean; error?: string; data?: any }> => {
  try {
    console.log("📝 Submitting contract:", contractId);
    console.log("📦 Contract data:", JSON.stringify(contractData, null, 2));

    const url = `${environment.TRM_BASE_URL}/contracts/sp-contracts/${contractId}`;
    console.log("📡 Submit URL:", url);

    const response = await authenticatedFetch(url, {
      method: "PUT",
      body: JSON.stringify(contractData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Error submitting contract! status: ${response.status}, response: ${errorText}`,
      );

      // Parse error message from response - prioritize messages.value from API
      let errorMessage = `Error ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        // Priority order: messages.value (API specific error) > message > error > raw text
        if (errorData.messages && errorData.messages.value) {
          errorMessage = errorData.messages.value;
        } else {
          errorMessage = errorData.message || errorData.error || errorText;
        }
      } catch {
        errorMessage = errorText || `Error ${response.status}`;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const responseData = await response.json();
    console.log("✅ Contract submitted successfully:", responseData);

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    console.error("❌ Error submitting contract:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

// Generate and download PDF using CraftMyPDF service
export const generateAndDownloadPDF = async (printData: any, fileName: string): Promise<void> => {
  try {
    console.log("📄 Iniciando generación de PDF...");
    
    const response = await fetch(`${environment.CRAFTMYPDF_BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'es-419,es;q=0.9',
        'content-type': 'application/json; charset=utf-8',
        'origin': environment.CONTRACTS_ORIGIN,
        'priority': 'u=1, i',
        'referer': `${environment.CONTRACTS_ORIGIN}/`,
        'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'x-api-key': environment.CRAFTMYPDF_API_KEY
      },
      body: JSON.stringify(printData)
    });

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ Respuesta de CraftMyPDF:", result);

    // Verificar que la respuesta contiene la URL del archivo
    if (result.file) {
      console.log("📄 URL del PDF generado:", result.file);
      
      // Descargar automáticamente el PDF
      const link = document.createElement('a');
      link.href = result.file;
      link.download = `${fileName}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("✅ PDF descargado exitosamente");
    } else {
      console.error("❌ No se encontró la URL del archivo en la respuesta:", result);
      throw new Error("No se pudo generar el PDF. Inténtalo de nuevo.");
    }
  } catch (error) {
    console.error("❌ Error al generar/descargar PDF:", error);
    throw error;
  }
};
