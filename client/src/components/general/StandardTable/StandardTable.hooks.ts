import { useState, useEffect } from 'react';
import { DataFetchFunction, TableColumn } from './StandardTable.types';

export interface UseStandardTableProps<T> {
  fetchData?: DataFetchFunction<T>;
  defaultFilters?: Record<string, any>;
  columns: TableColumn<T>[];
}

export function useStandardTable<T>({
  fetchData,
  defaultFilters = {},
  columns
}: UseStandardTableProps<T>) {
  // Estados para filtros únicamente (modo no controlado) - paginación manejada por parent
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(defaultFilters || {});
  
  // Estados para UI internos únicamente (no afectan API)
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortKey, setSortKey] = useState<string>();
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Estados para datos (internos - solo para modo no-controlado)
  const [internalData, setInternalData] = useState<T[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalTotalElements, setInternalTotalElements] = useState(0);
  const [internalTotalPages, setInternalTotalPages] = useState(0);

  // Función para cargar datos con loading mínimo de 300ms (solo para modo no-controlado)
  const loadData = async () => {
    if (!fetchData) return; // Skip if no fetchData function provided (controlled mode)
    
    setInternalLoading(true);
    const startTime = Date.now();
    
    try {
      const result = await fetchData({
        page: currentPage,
        pageSize,
        search: searchValue,
        filters: selectedFilters,
        sort: sortKey ? { key: sortKey, direction: sortDirection } : undefined,
        columns // Pasar las columnas para la búsqueda
      });
      
      // Calcular tiempo transcurrido
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 300; // 300ms mínimo
      
      // Si han pasado menos de 300ms, esperar hasta completar el tiempo mínimo
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      setInternalData(result.data);
      setInternalTotalElements(result.total);
      setInternalTotalPages(result.totalPages);
    } catch (error) {
      console.error('Error loading data:', error);
      // Asegurar tiempo mínimo incluso en error
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 300;
      
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      setInternalData([]);
      setInternalTotalElements(0);
      setInternalTotalPages(0);
    } finally {
      setInternalLoading(false);
    }
  };

  // Cargar datos cuando cambien los parámetros (solo en modo no-controlado)
  useEffect(() => {
    if (fetchData) {
      loadData();
    }
  }, [currentPage, pageSize, searchValue, selectedFilters, sortKey, sortDirection, fetchData]);

  // Función para toggle de filtros
  const toggleFilter = (filterKey: string, value: any) => {
    setSelectedFilters(prev => {
      // Comportamiento especial para pricingType: solo un valor a la vez
      if (filterKey === 'pricingType') {
        const currentValues = prev[filterKey] || [];
        // Si ya está seleccionado, lo deseleccionamos (permitir quitar el filtro)
        const newValues = currentValues.includes(value) 
          ? [] 
          : [value]; // Solo un valor seleccionado a la vez
        
        return { ...prev, [filterKey]: newValues };
      }
      
      // Comportamiento especial para commodity: "All" es mutuamente exclusivo
      if (filterKey === 'commodity') {
        const currentValues = prev[filterKey] || [];
        
        // Si se selecciona "all"
        if (value === 'all') {
          // Si "all" ya está seleccionado, no hacer nada (mantenerlo seleccionado)
          if (currentValues.includes('all')) {
            return prev;
          }
          // Si "all" no está seleccionado, seleccionarlo y deseleccionar todo lo demás
          return { ...prev, [filterKey]: ['all'] };
        }
        
        // Si se selecciona cualquier valor que no es "all"
        // Primero remover "all" si está presente
        let newValues = currentValues.filter((v: any) => v !== 'all');
        
        // Luego aplicar la lógica normal de toggle
        if (newValues.includes(value)) {
          newValues = newValues.filter((v: any) => v !== value);
          // Si no queda ningún valor seleccionado, volver a "all"
          if (newValues.length === 0) {
            newValues = ['all'];
          }
        } else {
          newValues = [...newValues, value];
        }
        
        return { ...prev, [filterKey]: newValues };
      }
      
      // Comportamiento por defecto para otros filtros (múltiple selección)
      const currentValues = prev[filterKey] || [];
      const newValues = Array.isArray(currentValues)
        ? (currentValues.includes(value) 
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value])
        : [value];
      
      return { ...prev, [filterKey]: newValues };
    });
    setCurrentPage(1);
  };

  // Handlers para la tabla
  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };
  const handleSortChange = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  };
  const handleSearchChange = (search: string) => {
    if (search !== searchValue) {
      setSearchValue(search);
      setCurrentPage(1);
    }
  };

  return {
    // Estados
    selectedFilters,
    searchValue,
    currentPage,
    pageSize,
    sortKey,
    sortDirection,
    internalData,
    internalLoading,
    internalTotalElements,
    internalTotalPages,
    
    // Métodos
    toggleFilter,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleSearchChange,
    loadData
  };
}