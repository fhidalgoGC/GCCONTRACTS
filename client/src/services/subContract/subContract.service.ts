import { authenticatedFetch } from '@/utils/apiInterceptors';
import { environment } from '@/environment/environment';
import { SubContractKeyResponse, CreateSubContractPayload } from './types';

export type { SubContractKeyResponse, CreateSubContractPayload };

export class SubContractService {
  private static readonly BASE_URL = `${environment.TRM_BASE_URL}/contracts/sp-sub-contracts`;

  /**
   * Obtiene una clave única para crear un nuevo sub-contrato
   * @returns Promise con la respuesta que contiene la clave del sub-contrato
   */
  public static async getSubContractKey(): Promise<SubContractKeyResponse> {
    try {
      console.log('🔑 Fetching sub-contract key...');
      
      const response = await authenticatedFetch(this.BASE_URL, {
        method: 'POST',

        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sub-contract key: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Sub-contract key response:', result);
      
      // La clave está anidada en result.data.key basado en la respuesta de la API
      if (result.data?.key) {
        return {
          key: result.data.key,
          location: result.data.location || this.BASE_URL
        };
      } else if (result.key) {
        return {
          key: result.key,
          location: result.location || this.BASE_URL
        };
      } else {
        throw new Error('No key found in response');
      }
      
    } catch (error) {
      console.error('❌ Error fetching sub-contract key:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo sub-contrato usando la clave obtenida previamente
   * @param key - La clave del sub-contrato obtenida del método getSubContractKey
   * @param payload - Los datos del sub-contrato a crear
   * @returns Promise con la respuesta de la creación del sub-contrato
   */
  public static async createSubContract(key: string, payload: CreateSubContractPayload): Promise<any> {
    try {
      console.log('📤 Creating sub-contract with API payload:', payload);
      console.log('🔗 Using sub-contract key:', key);
      
      const response = await authenticatedFetch(`${this.BASE_URL}/${key}`, {
        method: 'PUT',

        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed with status ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Sub-contract created successfully:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error creating sub-contract:', error);
      throw error;
    }
  }

  /**
   * Método de conveniencia que obtiene la clave y crea el sub-contrato en una sola operación
   * @param payload - Los datos del sub-contrato a crear
   * @returns Promise con la respuesta de la creación del sub-contrato
   */
  public static async getKeyAndCreateSubContract(payload: CreateSubContractPayload): Promise<any> {
    const keyResponse = await this.getSubContractKey();
    return await this.createSubContract(keyResponse.key, payload);
  }
}