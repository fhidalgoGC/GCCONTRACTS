import { authenticatedFetch } from "@/utils/apiInterceptors";
import { environment } from "@/environment/environment";
import { 
  CommodityData, 
  CommodityResponse, 
  CommodityOption, 
  FetchCommoditiesParams,
  CharacteristicsConfigurationData,
  CharacteristicsConfigurationResponse,
  CharacteristicsConfigurationOption,
  FetchCharacteristicsConfigurationsParams
} from "./types";

// Re-export types for backwards compatibility
export type {
  CommodityData, 
  CommodityResponse, 
  CommodityOption, 
  FetchCommoditiesParams,
  CharacteristicsConfigurationData,
  CharacteristicsConfigurationResponse,
  CharacteristicsConfigurationOption,
  FetchCharacteristicsConfigurationsParams
};

export class CommoditiesService {
  /**
   * Fetch commodities from the CRM API
   */
  static async fetchCommodities({
    partitionKey,
    page = 1,
    limit = 20
  }: FetchCommoditiesParams): Promise<CommodityOption[]> {
    try {
      // Construct the API URL with filter
      const filter = JSON.stringify({
        "_partitionKey": partitionKey
      });
      
      const url = `${environment.CRM_BASE_URL}/commodities/commodities?page=${page}&limit=${limit}&filter=${encodeURIComponent(filter)}`;
      
      console.log('Fetching commodities from:', url);

      const response = await authenticatedFetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CommodityResponse = await response.json();
      console.log('Commodities response:', data);
      console.log('Raw commodities from API:', data.data);

      // Map the response to the expected format
      const mappedCommodities: CommodityOption[] = data.data
        .filter(commodity => commodity.active) // Only active commodities
        .map(commodity => ({
          key: commodity._id,           // _id -> key
          value: commodity.name,        // name -> value  
          label: commodity.name,        // name -> label
          data: commodity               // Store original data for subcategory access
        }));

      console.log('Mapped commodities for UI:', mappedCommodities);
      return mappedCommodities;
    } catch (error) {
      console.error('Error fetching commodities:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch commodities');
    }
  }

  /**
   * Fetch characteristics configurations from the SSM API
   */
  static async fetchCharacteristicsConfigurations({
    commodityId,
    subcategoryId
  }: FetchCharacteristicsConfigurationsParams): Promise<CharacteristicsConfigurationOption[]> {
    try {
      const url = `${environment.SSM_BASE_URL}/chars-configs/summary?commodity_id=${commodityId}&subcategory_id=${subcategoryId}`;
      
      console.log('Fetching characteristics configurations from:', url);

      const response = await authenticatedFetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        console.error('Failed to fetch characteristics configurations:', {
          status: response.status,
          statusText: response.statusText,
          url: url
        });
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const result: CharacteristicsConfigurationResponse = await response.json();
      
      console.log('Raw characteristics configurations from API:', result.data);

      // Map to standardized structure
      const mappedConfigurations: CharacteristicsConfigurationOption[] = result.data.map((config: CharacteristicsConfigurationData) => ({
        key: config._id,
        value: config.name,
        label: config.name
      }));

      console.log('Mapped characteristics configurations for UI:', mappedConfigurations);

      return mappedConfigurations;
    } catch (error) {
      console.error('Error fetching characteristics configurations:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch characteristics configurations');
    }
  }
}