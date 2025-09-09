import { useState, useEffect, useRef } from 'react';
import { type CrmPerson } from '@/services/crm-people/crm-people.service';
import { PersonType } from './PersonSelectionModal.types';
import { getServiceFunction } from './PersonSelectionModal.utils';

export const usePersonSelection = (personType: PersonType, isOpen: boolean, searchTerm: string) => {
  const [people, setPeople] = useState<CrmPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load people when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log(`🔄 PersonModal: Modal opened for ${personType}, loading fresh data...`);
      setLoading(true);
      setPeople([]);
      setCurrentPage(1);
      setHasMore(true);
      setLoadingMore(false);
      setSearchLoading(false);
      
      loadPeople(1, true);
    } else {
      setPeople([]);
      setLoading(false);
      setLoadingMore(false);
      setSearchLoading(false);
    }
  }, [isOpen, personType]);

  // Debounce search with 200ms delay
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const trimmedSearch = searchTerm.trim();
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (trimmedSearch.length >= 2) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(() => {
        console.log(`🔍 Debounced search triggered for ${personType}:`, trimmedSearch);
        setCurrentPage(1);
        setHasMore(true);
        loadPeople(1, true);
      }, 200);
    } else if (trimmedSearch.length === 0) {
      setCurrentPage(1);
      setHasMore(true);
      loadPeople(1, true);
    }
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, personType]);

  const loadPeople = async (page: number = 1, reset: boolean = false) => {
    try {
      console.log(`🚀 PersonModal: Loading ${personType} - Page ${page}, Reset: ${reset}`);
      
      if (!reset) {
        setLoadingMore(true);
      }

      const searchOptions = {
        page, 
        limit: 10,
        ...(searchTerm.trim().length >= 2 && { search: searchTerm.trim() })
      };

      // Add sort for traders
      if (personType === 'traders') {
        (searchOptions as any).sort = { full_name: '1' };
      }

      const serviceFunction = getServiceFunction(personType);
      const response = await serviceFunction(searchOptions);
      
      console.log(`✅ PersonModal: Loaded ${response.data.length} ${personType}`);
      console.log(`📊 PersonModal: Pagination - Page ${response._meta.page_number}/${response._meta.total_pages}, Total: ${response._meta.total_elements}`);
      
      if (reset) {
        setPeople(response.data);
      } else {
        setPeople(prev => [...prev, ...response.data]);
      }
      
      setHasMore(response._meta.page_number < response._meta.total_pages);
      setCurrentPage(response._meta.page_number);
      
    } catch (error) {
      console.error(`❌ PersonModal: Error fetching ${personType}:`, error);
      if (reset) {
        setPeople([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setSearchLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading && !searchLoading) {
      loadPeople(currentPage + 1, false);
    }
  };

  return {
    people,
    loading,
    loadingMore,
    searchLoading,
    hasMore,
    handleLoadMore
  };
};