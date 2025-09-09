import { useTranslation } from 'react-i18next';
import standardTableTranslations from '../i18n';

/**
 * Hook personalizado para traducciones con fallback
 * 1. Busca primero en las traducciones locales del StandardTable
 * 2. Si no encuentra, busca en las traducciones globales
 * 3. Si no encuentra en ningún lado, retorna la clave original
 */
export function useLocalTranslation() {
  const { t: globalT, i18n } = useTranslation();
  const currentLanguage = i18n.language as 'en' | 'es';
  
  const localTranslations = standardTableTranslations[currentLanguage] || standardTableTranslations['en'];
  
  const t = (key: string, options?: any) => {
    // 1. Buscar en traducciones locales del componente usando dot notation
    const localValue = getNestedValue(localTranslations, key);
    if (localValue !== undefined && localValue !== null && localValue !== '') {
      // Si tiene interpolación, procesarla manualmente
      if (options && typeof localValue === 'string') {
        return interpolateString(localValue, options);
      }
      return localValue;
    }
    
    // 2. Si no encuentra en local, usar traducciones globales
    const globalValue = globalT(key, options);
    
    // 3. Si las traducciones globales retornan la misma key (no encontrada), 
    // intentar buscar en traducciones globales con prefijos comunes
    if (globalValue === key) {
      // Intentar con prefijo 'table.'
      const tableKey = `table.${key}`;
      const tableValue = globalT(tableKey, options);
      if (tableValue !== tableKey) {
        return tableValue;
      }
      
      // Intentar claves comunes directamente
      const directValue = globalT(key, options);
      if (directValue !== key) {
        return directValue;
      }
    }
    
    return globalValue;
  };
  
  return { t, i18n };
}

// Función auxiliar para obtener valores anidados usando dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Función auxiliar para interpolación manual simple
function interpolateString(str: string, options: Record<string, any>): string {
  let result = str;
  Object.keys(options).forEach(key => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), options[key]);
  });
  return result;
}