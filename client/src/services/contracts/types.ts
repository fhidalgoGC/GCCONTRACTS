// Interface para la respuesta de contratos basada en la respuesta real de la API
export interface ContractResponse {
  data: Array<{
    _id: string;
    folio: string;
    reference_number?: string;
    type: string;
    sub_type: string;
    commodity: {
      commodity_id: string;
      name: string;
    };
    characteristics: {
      configuration_id: string;
      configuration_name: string;
    };
    grade: number;
    participants: Array<{
      people_id: string;
      name: string;
      role: "buyer" | "seller";
    }>;
    price_schedule: Array<{
      pricing_type: string;
      price: number;
      basis: number;
      basis_operation: string;
      future_price: number;
      option_month: string;
      option_year: number;
      payment_currency: string;
      exchange: string;
    }>;
    logistic_schedule: Array<{
      logistic_payment_responsability: string;
      logistic_coordination_responsability: string;
      freight_cost: {
        type: string;
        min: number;
        max: number;
        cost: number;
      };
      payment_currency: string;
    }>;
    quantity: number;
    measurement_unit_id: string;
    measurement_unit: string;
    shipping_start_date: string;
    shipping_end_date: string;
    contract_date: string;
    delivered: string;
    transport: string;
    weights: string;
    inspections: string;
    proteins: string;
    application_priority: number;
    thresholds: {
      min_thresholds_percentage: number;
      max_thresholds_percentage: number;
      min_thresholds_weight: number;
      max_thresholds_weight: number;
    };
    status?: string;
    inventory?: {
      total: number;
      open: number;
      fixed: number;
      unsettled: number;
      settled: number;
      reserved: number;
    };
    remarks: Array<{
      comment: string;
    }>;
  }>;
  _meta: {
    total_elements: number;
    total_pages: number;
    page_number: number;
    page_size: number;
  };
}

export interface FetchContractsParams {
  page: number;
  limit: number;
  search?: string;
  filters?: Record<string, any>;
  sort?: { key: string; direction: "asc" | "desc" };
  commodities: Array<{ key: string; value: string; label: string }>;
  authData: {
    partitionKey: string;
    idToken: string;
  };
  contractType?: "purchase" | "sale";
}

// Mapeo de campos de la UI a campos de la API para ordenamiento
export const sortFieldMapping: Record<string, string> = {
  customer: "participants.name",
  date: "contract_date",
  commodity: "commodity.name",
  quantity: "quantity",
  price: "price_schedule.price",
  basis: "price_schedule.basis",
  future: "price_schedule.future_price",
  reserve: "reserved",
  id: "_id",
};