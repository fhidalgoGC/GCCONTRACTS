// Generador de ID único por pestaña para evitar eventos redundantes
// Este ID se genera una sola vez por pestaña y se mantiene durante toda la sesión

let globalTabId: string | null = null;

export const getTabId = (): string => {
  if (!globalTabId) {
    globalTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🆔 TAB ID: Generando nuevo ID para esta pestaña:', globalTabId);
  }
  return globalTabId;
};

export const resetTabId = (): void => {
  globalTabId = null;
  console.log('🔄 TAB ID: ID de pestaña reseteado');
};