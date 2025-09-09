import { useSessionValidator } from '@/hooks/useSessionValidator';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { SessionValidatorConfig } from './SessionValidator.types';

/**
 * Hook principal para el componente SessionValidator
 * Configura y coordina la validación de sesión y el rastreo de actividad
 */
export function useSessionValidatorComponent(config: SessionValidatorConfig = {}) {
  const {
    showExpirationToast = true,
    validateOnMount = true,
    throttleTime = 30000 // 30 segundos por defecto
  } = config;

  // Configurar el hook de validación de sesión
  useSessionValidator({
    showExpirationToast,
    validateOnMount
  });

  // Configurar el rastreador de actividad
  useActivityTracker({
    throttleTime
  });
}