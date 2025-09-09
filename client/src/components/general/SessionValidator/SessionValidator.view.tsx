import { SessionValidatorProps } from './SessionValidator.types';
import { useSessionValidatorComponent } from './SessionValidator.hooks';

/**
 * Componente que maneja la validación integral de sesión
 * Incluye:
 * - Validación automática al cargar la página
 * - Detección de cambios de visibilidad del tab
 * - Sincronización entre tabs usando storage events
 * - Rastreo automático de actividad del usuario
 */
export function SessionValidator({ children }: SessionValidatorProps) {
  // Configurar el componente de validación de sesión
  useSessionValidatorComponent({
    showExpirationToast: true,
    validateOnMount: true,
    throttleTime: 30000 // Actualizar máximo cada 30 segundos
  });

  // Este componente no renderiza nada visible, solo maneja la lógica de sesión
  return <>{children}</>;
}