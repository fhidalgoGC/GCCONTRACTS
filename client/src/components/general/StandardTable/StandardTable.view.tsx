
import React, { useMemo } from 'react';
import { useLocalTranslation } from './hooks/useLocalTranslation';
import { MoreHorizontal, Plus, Trash2, Edit, Eye } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { DataTable, Column, TableData } from '@/components/ui/data-table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { GenericTableProps, FilterOption, TableColumn } from './StandardTable.types';
import { getFilterButtonClass, getNestedValue } from './StandardTable.utils';
import { useStandardTable } from './StandardTable.hooks';
import './StandardTable.css';


export function GenericTable<T = any>({
  columns,
  fetchData,
  data, // NEW: Pre-loaded data for controlled mode
  totalElements,
  totalPages,
  loading = false,
  getItemId, // NEW: Required prop for getting unique ID
  title,
  titleKey,
  description,
  descriptionKey,
  createButtonLabelKey = 'create',
  createButtonHref,
  showCreateButton = true,
  showFilters = true,
  filters = [],
  defaultFilters = {},
  showActionColumn = true,
  actionMenuItems = [],
  actionColumnTitleKey = 'actions',
  showActionIcons = false,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onSortChange,
  sortFieldMapping = {},
  rowSpacing = 'compact',
}: GenericTableProps<T>) {
  const { t } = useLocalTranslation();
  
  // Use hook for internal state and logic
  const {
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
    toggleFilter,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleSearchChange
  } = useStandardTable({
    fetchData,
    defaultFilters,
    columns
  });


  // Crear las columnas de la tabla con i18n
  const tableColumns: Column<T>[] = useMemo(() => {
    const cols: Column<T>[] = columns.map(col => ({
      key: col.key,
      title: t(col.titleKey),
      render: col.render || ((item: T) => {
        if (col.dataMapping) {
          const value = getNestedValue(item, col.dataMapping);
          return value?.toString() || '';
        }
        return (item as any)[col.key]?.toString() || '';
      }),
      sortable: col.sortable ?? false,
      width: col.width
    }));

    // Agregar columna de acciones si está habilitada
    if (showActionColumn && actionMenuItems.length > 0) {
      // Función para obtener el icono predeterminado según la acción
      const getDefaultIcon = (key: string) => {
        switch (key) {
          case 'delete':
          case 'eliminar':
            return <Trash2 className="standard-table-delete-icon" />;
          case 'edit':
          case 'editar':
            return <Edit className="standard-table-edit-icon" />;
          case 'view':
          case 'ver':
            return <Eye className="standard-table-view-icon" />;
          default:
            return null;
        }
      };

      // Filtrar acciones que se mostrarán como iconos
      const iconActions = showActionIcons 
        ? actionMenuItems.filter(item => item.showAsIcon !== false && (item.icon || getDefaultIcon(item.key)))
        : [];
      
      // Si hay iconos disponibles y showActionIcons está activo, NO mostrar menú
      // Si no hay iconos O showActionIcons está desactivo, mostrar todas las acciones en el menú
      const hasIcons = showActionIcons && iconActions.length > 0;
      const menuActions = hasIcons ? [] : actionMenuItems;

      cols.push({
        key: 'actions',
        title: t(actionColumnTitleKey || 'actions'),
        render: (item: T) => (
          <div className="standard-table-actions">
            {/* Iconos individuales */}
            {showActionIcons && iconActions.map((menuItem) => {
              const icon = menuItem.icon || getDefaultIcon(menuItem.key);
              return (
                <Button
                  key={`icon-${menuItem.key}`}
                  variant="ghost"
                  size="sm"
                  className={`standard-table-action-icon ${menuItem.className || ''}`}
                  onClick={() => menuItem.action(item)}
                  title={t(menuItem.labelKey)} // Tooltip con el nombre de la acción
                >
                  {icon}
                </Button>
              );
            })}
            
            {/* Menú desplegable (si hay acciones restantes o no se muestran iconos) */}
            {menuActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="standard-table-action-menu-trigger">
                    <MoreHorizontal className="standard-table-action-menu-icon" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuActions.map((menuItem) => (
                    <DropdownMenuItem 
                      key={menuItem.key}
                      onClick={() => menuItem.action(item)}
                      className={menuItem.className}
                    >
                      {t(menuItem.labelKey)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ),
        sortable: false,
        width: showActionIcons ? '120px' : '80px' // Más ancho si hay iconos
      });
    }

    return cols;
  }, [columns, t, showActionColumn, actionMenuItems, actionColumnTitleKey, showActionIcons]);

  // Determinar qué datos usar (externos o internos)
  const currentData = data || internalData;
  const currentLoading = loading || internalLoading;
  const currentTotalElements = totalElements || internalTotalElements;
  const currentTotalPages = totalPages || internalTotalPages;

  // Crear estructura de datos para DataTable
  const tableDataStructure: TableData<T> = {
    data: currentData,
    meta: {
      page_size: pageSize,
      page_number: currentPage,
      total_elements: currentTotalElements,
      total_pages: currentTotalPages
    }
  };

  // Debug: Log pagination info
  console.log('🔢 PAGINACIÓN DEBUG - currentTotalElements:', currentTotalElements, 'currentTotalPages:', currentTotalPages, 'pageSize:', pageSize, 'currentPage:', currentPage);


  return (
    <div className="standard-table-container">
      {/* Header with Add Button */}
      {(title || titleKey || showCreateButton) && (
        <div className="standard-table-header">
          {(title || titleKey) && (
            <div>
              <h1 className="standard-table-title">
                {title || (titleKey && t(titleKey))}
              </h1>
              {(description || descriptionKey) && (
                <p className="standard-table-description">
                  {description || (descriptionKey && t(descriptionKey))}
                </p>
              )}
            </div>
          )}
          
          {showCreateButton && createButtonHref && (
            <Link href={createButtonHref}>
              <Button 
                className="standard-table-create-button"
                size="lg"
              >
                <Plus className="standard-table-create-icon" />
                {t(createButtonLabelKey)}
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Filtros - DESHABILITADOS porque ahora están en el componente padre */}
      {false && showFilters && filters.length > 0 && (
        <div className="standard-table-filters">
          {filters.map((filter) => (
            <div key={filter.key} className="standard-table-filter-group">
              {filter.type === 'button' && filter.availableValues?.map((value) => {
                // Manejar tanto strings como FilterOption objects
                const isObject = typeof value === 'object' && value !== null;
                const originalLabel = isObject ? (value as FilterOption).label : value as string;
                const displayValue = typeof originalLabel === 'string' 
                  ? originalLabel 
                  : originalLabel.key.startsWith('filters.')
                    ? t(originalLabel.key)
                    : originalLabel.key;
                const filterValue = isObject ? (value as FilterOption).value : value as string;
                const uniqueKey = isObject ? (value as FilterOption).key : value as string;
                
                // Obtener clases CSS usando la función utilitaria
                const buttonStyles = getFilterButtonClass(
                  filter.key,
                  filterValue,
                  selectedFilters
                );
                
                return (
                  <Button
                    key={uniqueKey}
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFilter(filter.key, filterValue)}
                    className={`standard-table-filter-button ${buttonStyles}`}
                  >
                    {displayValue}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={tableColumns}
        data={tableDataStructure}
        onPageChange={(page) => {
          handlePageChange(page);
          onPageChange?.(page); // Call parent callback
        }}
        onPageSizeChange={(size) => {
          handlePageSizeChange(size);
          onPageSizeChange?.(size); // Call parent callback
        }}
        onSortChange={(keyOrSort: string | { key: string; direction: 'asc' | 'desc' }, direction?: 'asc' | 'desc') => {
          // Handle both formats: object {key, direction} and separate parameters (key, direction)
          let sortKey: string;
          let sortDirection: 'asc' | 'desc';
          
          if (typeof keyOrSort === 'object' && keyOrSort !== null) {
            // Object format: {key, direction}
            sortKey = keyOrSort.key;
            sortDirection = keyOrSort.direction;
          } else if (typeof keyOrSort === 'string' && direction) {
            // Separate parameters format: (key, direction)
            sortKey = keyOrSort;
            sortDirection = direction;
          } else {
            // No sort or invalid format
            handleSortChange('', 'asc');
            onSortChange?.(null);
            return;
          }
          
          handleSortChange(sortKey, sortDirection);
          // Map UI field to API field for parent callback
          const apiFieldKey = sortFieldMapping[sortKey] || sortKey;
          onSortChange?.({ key: apiFieldKey, direction: sortDirection });
        }}
        onSearchChange={(search) => {
          handleSearchChange(search);
          onSearchChange?.(search); // Call parent callback
        }}
        currentPage={currentPage}
        pageSize={pageSize}
        sortKey={sortKey}
        sortDirection={sortDirection}
        searchValue={searchValue}
        loading={currentLoading}
        getItemId={getItemId}
        rowSpacing={rowSpacing}
      />
    </div>
  );
}

// Mantener compatibilidad con el componente anterior
export const ContractsTable = GenericTable;

// The GenericTable component is already exported above on line 20