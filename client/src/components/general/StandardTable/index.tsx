export { GenericTable, GenericTable as StandardTable, ContractsTable } from './StandardTable.view';
export type { 
  TableColumn, 
  FilterOption, 
  TableFilter, 
  ActionMenuItem, 
  DataFetchFunction, 
  GenericTableProps 
} from './StandardTable.types';
export { getNestedValue, searchInAllColumns, getFilterButtonClass } from './StandardTable.utils';
export { useStandardTable } from './StandardTable.hooks';
export { useLocalTranslation as useStandardTableTranslation } from './hooks/useLocalTranslation';