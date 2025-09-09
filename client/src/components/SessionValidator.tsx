import { useSessionValidator } from '@/hooks/useSessionValidator';
import { useActivityTracker } from '@/hooks/useActivityTracker';

interface SessionValidatorProps {
  children?: React.ReactNode;
}

/**
 * Componente que maneja la validación integral de sesión
 * Incluye:
 * - Validación automática al cargar la página
 * - Detección de cambios de visibilidad del tab
 * - Sincronización entre tabs usando storage events
 * - Rastreo automático de actividad del usuario
 */
export function SessionValidator({ children }: SessionValidatorProps) {
  // Configurar el hook de validación de sesión
  useSessionValidator({
    showExpirationToast: true,
    validateOnMount: true
  });

  // Configurar el rastreador de actividad
  useActivityTracker({
    throttleTime: 30000 // Actualizar máximo cada 30 segundos
  });

  // Este componente no renderiza nada visible, solo maneja la lógica de sesión
  return <>{children}</>;
}