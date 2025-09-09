import { useQuery } from '@tanstack/react-query';
import { environment } from '@/environment/environment';

interface CharacteristicsConfigurationData {
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

interface CharacteristicsConfigurationResponse {
  data: CharacteristicsConfigurationData[];
  path: string;
  code: string;
  messages: {
    name: string;
    value: string;
  };
  status: number;
}

interface CharacteristicsConfigurationOption {
  key: string;
  value: string;
  label: string;
}

interface UseCharacteristicsConfigurationsParams {
  commodityId?: string;
  subcategoryId?: string;
}

export function useCharacteristicsConfigurations({ 
  commodityId, 
  subcategoryId 
}: UseCharacteristicsConfigurationsParams) {
  return useQuery<CharacteristicsConfigurationOption[]>({
    queryKey: ['characteristics-configurations', commodityId, subcategoryId],
    queryFn: async () => {
      if (!commodityId || !subcategoryId) {
        return [];
      }

      // Get auth data from localStorage - check all available tokens
      const accessToken = localStorage.getItem('access_token');
      const idToken = localStorage.getItem('id_token');
      const partitionKey = localStorage.getItem('partition_key');
      
      console.log('Available tokens:', {
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
        hasPartition: !!partitionKey,
        accessTokenStart: accessToken?.substring(0, 20) || 'none',
        idTokenStart: idToken?.substring(0, 20) || 'none'
      });
      
      // Use id_token preferentially for this endpoint, with access_token fallback
      const authToken = idToken || accessToken;
      
      if (!authToken || !partitionKey) {
        console.log('No auth data available for characteristics configurations:', { 
          hasAuthToken: !!authToken, 
          hasPartition: !!partitionKey 
        });
        return [];
      }
      
      console.log('Auth data for characteristics configurations:', {
        tokenType: idToken ? 'id_token' : 'access_token',
        tokenLength: authToken.length,
        partitionKey: partitionKey
      });

      const url = `${environment.SSM_BASE_URL}/chars-configs/summary?commodity_id=${commodityId}&subcategory_id=${subcategoryId}`;
      
      console.log('Characteristics configurations URL:', url);
      console.log('Making request with token:', authToken.substring(0, 50) + '...');
      console.log('Making request with partition:', partitionKey);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${authToken}`,
          '_partitionkey': partitionKey,
          'accept': '*/*',
          'accept-language': 'es-419,es;q=0.9',
          'bt-organization': partitionKey,
          'bt-uid': partitionKey,
          'organization_id': partitionKey,
          'origin': environment.CONTRACTS_ORIGIN,
          'pk-organization': partitionKey,
          'referer': `${environment.CONTRACTS_ORIGIN}/`,
          'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        }
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
      const mappedConfigurations = result.data.map((config: CharacteristicsConfigurationData) => ({
        key: config._id,
        value: config.name,
        label: config.name
      }));

      console.log('Mapped characteristics configurations for UI:', mappedConfigurations);

      return mappedConfigurations;
    },
    enabled: !!(commodityId && subcategoryId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
}