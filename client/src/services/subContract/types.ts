export interface SubContractKeyResponse {
  key: string;
  location: string;
}

export interface CreateSubContractPayload {
  contract_id: string;
  contract_folio: string;
  measurement_unit: string;
  total_price: number;
  created_by_id: string;
  created_by_name: string;
  price_schedule: Array<{
    pricing_type: string;
    price: number;
    basis: number;
    future_price: number;
    basis_operation: string;
    option_month: string;
    option_year: number;
    exchange: string;
    payment_currency: string;
  }>;
  quantity: number;
  sub_contract_date: string;
  measurement_unit_id: string;
  thresholds: {
    max_thresholds_percentage: number;
    max_thresholds_weight: number;
    min_thresholds_percentage: number;
    min_thresholds_weight: number;
  };
}