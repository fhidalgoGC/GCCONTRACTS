import { environment } from '@/environment/environment';
import { authenticatedFetch } from '@/utils/apiInterceptors';
import i18n from '@/common/utils/i18n';
import { MeasurementUnit, MeasurementUnitOption } from './types';

export type { MeasurementUnit, MeasurementUnitOption };

export class MeasurementUnitsService {
  private static buildUrl(): string {
    const baseUrl = environment.CRM_BASE_URL;
    const endpoint = environment.UNIT_CONVERSIONS_ENDPOINT;
    const language = i18n.language === 'es' ? 'es' : 'en';
    const limit = environment.API_LIMIT;
    
    // Filter for weight and volume types
    const filter = encodeURIComponent(JSON.stringify({
      "type": {
        "$in": ["weight", "volume"]
      }
    }));
    
    return `${baseUrl}${endpoint}?limit=${limit}&language=${language}&filter=${filter}`;
  }


  public static async fetchMeasurementUnits(): Promise<MeasurementUnit[]> {
    try {
      const url = this.buildUrl();

      console.log('Fetching measurement units from:', url);

      const response = await authenticatedFetch(url, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Measurement units response:', data);

      // Handle response structure - could be direct array or wrapped in data property
      const units = data.data ? data.data : (Array.isArray(data) ? data : []);
      return units;
    } catch (error) {
      console.error('Error fetching measurement units:', error);
      return [];
    }
  }

  public static transformToOptions(units: MeasurementUnit[], filterType?: 'weight' | 'volume'): MeasurementUnitOption[] {
    const currentLanguage = i18n.language === 'es' ? 'es' : 'en';
    
    return units
      .filter(unit => !filterType || unit.type === filterType)
      .filter(unit => unit.active)
      .map(unit => {
        // Get the appropriate name based on current language
        const label = unit.names[currentLanguage] || unit.names.default || unit.slug;
        
        return {
          key: unit._id,
          value: unit.slug,
          label: label,
          type: unit.type
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  public static async getWeightUnits(): Promise<MeasurementUnitOption[]> {
    const units = await this.fetchMeasurementUnits();
    return this.transformToOptions(units, 'weight');
  }

  public static async getVolumeUnits(): Promise<MeasurementUnitOption[]> {
    const units = await this.fetchMeasurementUnits();
    return this.transformToOptions(units, 'volume');
  }
}