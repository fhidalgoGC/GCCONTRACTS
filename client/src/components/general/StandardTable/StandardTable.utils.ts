import { TableColumn } from './StandardTable.types';

// Función auxiliar para obtener valor anidado usando dot notation
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    // Manejo de arrays: "participants[0].name"
    if (key.includes('[') && key.includes(']')) {
      const arrayKey = key.substring(0, key.indexOf('['));
      const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
      return current?.[arrayKey]?.[index];
    }
    return current?.[key];
  }, obj);
}

// Función auxiliar para buscar en todas las columnas
export function searchInAllColumns<T>(item: T, searchTerm: string, columns: TableColumn<T>[]): boolean {
  const searchLower = searchTerm.toLowerCase();
  
  return columns.some(column => {
    let value: any;
    
    // Si la columna tiene dataMapping, usar eso
    if (column.dataMapping) {
      value = getNestedValue(item, column.dataMapping);
    } else {
      value = (item as any)[column.key];
    }
    
    // Convertir a string y buscar
    if (value != null) {
      const stringValue = value.toString().toLowerCase();
      return stringValue.includes(searchLower);
    }
    
    return false;
  });
}

// Función para obtener estilos de filtros según el tipo y estado
export function getFilterButtonClass(
  filterKey: string, 
  filterValue: string, 
  selectedFilters: Record<string, any>
): string {
  const isActive = selectedFilters[filterKey]?.includes(filterValue);
  
  if (filterKey === 'pricingType') {
    if (filterValue === 'all') {
      return isActive ? 'filter-pricing-all-active' : 'filter-pricing-all-inactive';
    } else if (filterValue === 'basis') {
      return isActive ? 'filter-pricing-basis-active' : 'filter-pricing-basis-inactive';
    } else if (filterValue === 'fixed') {
      return isActive ? 'filter-pricing-fixed-active' : 'filter-pricing-fixed-inactive';
    }
  }
  
  if (filterKey === 'commodity') {
    if (filterValue === 'all') {
      return isActive ? 'filter-commodity-all-active' : 'filter-commodity-all-inactive';
    } else {
      return isActive ? 'filter-commodity-active' : 'filter-commodity-inactive';
    }
  }
  
  return isActive ? 'filter-default-active' : 'filter-default-inactive';
}