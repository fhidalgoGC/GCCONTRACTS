import React from 'react';

// Definición de tipos genéricos
export interface TableColumn<T = any> {
  key: string;
  titleKey: string; // Clave para i18n
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  dataMapping?: string; // Ruta para acceder al dato (ej: "participants[0].name")
}

export interface FilterOption {
  key: string;
  value: string;
  label: string | { key: string };
}

export interface TableFilter {
  key: string;
  titleKey: string;
  type: 'button' | 'select';
  options?: string[];
  availableValues?: string[] | FilterOption[];
}

export interface ActionMenuItem {
  key: string;
  labelKey: string; // Clave para i18n
  action: (item: any) => void;
  className?: string;
  icon?: React.ReactNode; // Icono opcional para mostrar como botón individual
  showAsIcon?: boolean; // Si se debe mostrar como icono además del menú
}

export interface DataFetchFunction<T = any> {
  (params: {
    page: number;
    pageSize: number;
    search?: string;
    filters?: Record<string, any>;
    sort?: { key: string; direction: 'asc' | 'desc' };
    columns?: TableColumn<T>[]; // Pasar las columnas para la búsqueda
  }): Promise<{
    data: T[];
    total: number;
    totalPages: number;
  }>;
}

export interface GenericTableProps<T = any> {
  // Configuración básica
  columns: TableColumn<T>[];
  fetchData?: DataFetchFunction<T>; // OPTIONAL: Function to fetch data (for tables that manage their own data)
  data?: T[]; // OPTIONAL: Pre-loaded data (for controlled tables)
  totalElements?: number; // Total elements for pagination
  totalPages?: number; // Total pages for pagination
  loading?: boolean; // Loading state
  getItemId: (item: T) => string; // REQUIRED: Función para obtener ID único del item
  title?: string;
  titleKey?: string; // Clave para i18n del título
  description?: string;
  descriptionKey?: string; // Clave para i18n de la descripción
  
  // Botón de creación
  createButtonLabelKey?: string;
  createButtonHref?: string;
  showCreateButton?: boolean;
  
  // Filtros
  showFilters?: boolean;
  filters?: TableFilter[];
  defaultFilters?: Record<string, any>;
  
  // Acciones
  showActionColumn?: boolean;
  actionMenuItems?: ActionMenuItem[];
  actionColumnTitleKey?: string;
  showActionIcons?: boolean; // Nueva prop para mostrar iconos individuales
  
  // Callbacks for controlled mode
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSearchChange?: (search: string) => void;
  onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' } | null) => void;
  
  // Field mapping for sorting (UI field key to API field key)
  sortFieldMapping?: Record<string, string>;
  
  // Row spacing
  rowSpacing?: 'compact' | 'normal' | 'relaxed'; // compact=py-1, normal=py-2, relaxed=py-3
}