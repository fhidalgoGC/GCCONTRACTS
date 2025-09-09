import { useQuery } from '@tanstack/react-query';
import { MeasurementUnitsService, MeasurementUnitOption } from '@/services/measurementUnits/measurementUnits.service';

export const useMeasurementUnits = (type?: 'weight' | 'volume') => {
  return useQuery<MeasurementUnitOption[]>({
    queryKey: ['measurementUnits', type],
    queryFn: async () => {
      if (type === 'weight') {
        return await MeasurementUnitsService.getWeightUnits();
      } else if (type === 'volume') {
        return await MeasurementUnitsService.getVolumeUnits();
      } else {
        // Get all units
        const units = await MeasurementUnitsService.fetchMeasurementUnits();
        return MeasurementUnitsService.transformToOptions(units);
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useWeightUnits = () => {
  return useMeasurementUnits('weight');
};

export const useVolumeUnits = () => {
  return useMeasurementUnits('volume');
};