// Types for Commodities API
export interface CommodityData {
  _id: string;
  name: string;
  active: boolean;
  _partitionKey: string;
  original_name_id?: {
    _id?: string;
    names?: {
      es?: string;
      en?: string;
      default?: string;
    };
    subcategory?: {
      _id: string;
      name: string;
    };
  };
}

export interface CommodityResponse {
  data: CommodityData[];
}

export interface CommodityOption {
  key: string;
  value: string;
  label: string;
  data?: CommodityData; // Store original data for subcategory access
}

export interface FetchCommoditiesParams {
  partitionKey: string;
  page?: number;
  limit?: number;
}

// Types for Characteristics Configurations API
export interface CharacteristicsConfigurationData {
  _id: string;
  name: string;
  commodity_id?: string;
  subcategory_id?: string;
  commodity?: {
    _id: string;
    name: string;
  };
  subcategory?: {
    _id: string;
    name: string;
  };
}

export interface CharacteristicsConfigurationResponse {
  data: CharacteristicsConfigurationData[];
  path: string;
  code: string;
  messages: {
    name: string;
    value: string;
  };
  status: number;
}

export interface CharacteristicsConfigurationOption {
  key: string;
  value: string;
  label: string;
}

export interface FetchCharacteristicsConfigurationsParams {
  commodityId: string;
  partitionKey: string;
}