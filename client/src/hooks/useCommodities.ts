import { useState, useEffect } from 'react';
import { CommoditiesService, type CommodityOption } from '@/services/commodities/commodities.service';

export const useCommodities = () => {
  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommodities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth data from localStorage
        const partitionKey = localStorage.getItem('partition_key') || '';

        if (!partitionKey) {
          console.log('Missing partition key for commodities');
          setCommodities([]);
          return;
        }

        const mappedCommodities = await CommoditiesService.fetchCommodities({
          partitionKey,
          page: 1,
          limit: 20
        });

        setCommodities(mappedCommodities);
      } catch (err) {
        console.error('Error fetching commodities:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch commodities');
        setCommodities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommodities();
  }, []);

  return { commodities, loading, error };
};