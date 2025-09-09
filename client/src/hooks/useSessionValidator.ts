import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout as logoutAction, login as loginAction } from '@/features/auth/slices/authSlice';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { environment } from '@/environment/environment';

interface SessionValidatorOptions {
  // Si se debe mostrar un toast cuando la sesión expira
  showExpirationToast?: boolean;
  // Si se debe validar al cargar la página
  validateOnMount?: boolean;
}

export const useSessionValidator = (options: SessionValidatorOptions = {}) => {
  const {
    showExpirationToast = true,
    validateOnMount = true
  } = options;

  const [, setLocation] = useLocation();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { clearSession } = useUser();
  const { toast } = useToast();
  const isValidatingRef = useRef(false);

  // Función para verificar si los tokens están presentes y son válidos
  const validateTokens = useCallback((): boolean => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const idToken = localStorage.getItem('id_token');
      
      if (!accessToken || !refreshToken || !idToken) {
        return false;
      }

      // Verificar si el token ID está expirado
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        return false;
      }

      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Verificar si el token ha expirado
        if (payload.exp && payload.exp < currentTime) {
          return false;
        }
      } catch (error) {
        console.error('Error parsing token:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating tokens:', error);
      return false;
    }
  }, []);

  // Función para verificar si la sesión ha expirado por alguno de los dos timeouts
  const isSessionExpired = useCallback((): { expired: boolean; reason?: string } => {
    const lastActivity = localStorage.getItem('last_activity');
    const loginTime = localStorage.getItem('login_time');
    const currentTime = Date.now();

    console.log('🔍 SESSION VALIDATOR: Verificando estado de sesión...');
    console.log('📅 Tiempo actual:', new Date(currentTime).toLocaleString());
    console.log('🔑 Login time:', loginTime ? new Date(parseInt(loginTime)).toLocaleString() : 'No encontrado');
    console.log('⚡ Last activity:', lastActivity ? new Date(parseInt(lastActivity)).toLocaleString() : 'No encontrado');

    // Si no hay datos de actividad o login, la sesión está expirada
    if (!lastActivity || !loginTime) {
      console.log('❌ SESSION EXPIRED: Datos de sesión faltantes');
      return { expired: true, reason: 'missing_session_data' };
    }

    const lastActivityTime = parseInt(lastActivity, 10);
    const loginTimeMs = parseInt(loginTime, 10);

    // Convertir minutos a milisegundos
    const maxSessionDurationMs = environment.MAX_SESSION_DURATION_MINUTES * 60 * 1000;
    const inactivityTimeoutMs = environment.INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;

    console.log('⚙️ Configuración de timeouts:');
    console.log(`   Max session: ${environment.MAX_SESSION_DURATION_MINUTES} minutos (${maxSessionDurationMs}ms)`);
    console.log(`   Inactividad: ${environment.INACTIVITY_TIMEOUT_MINUTES} minutos (${inactivityTimeoutMs}ms)`);

    // Verificar timeout absoluto (desde el login)
    const timeSinceLogin = currentTime - loginTimeMs;
    const minutesSinceLogin = Math.floor(timeSinceLogin / (60 * 1000));
    const sessionExpiresAt = new Date(loginTimeMs + maxSessionDurationMs);
    
    console.log(`⏰ Tiempo desde login: ${minutesSinceLogin} minutos`);
    console.log(`🕐 Sesión expira absolutamente a: ${sessionExpiresAt.toLocaleString()}`);

    if (timeSinceLogin > maxSessionDurationMs) {
      console.log('❌ SESSION EXPIRED: Tiempo máximo de sesión excedido');
      console.log(`   Límite: ${environment.MAX_SESSION_DURATION_MINUTES} minutos`);
      console.log(`   Transcurrido: ${minutesSinceLogin} minutos`);
      return { expired: true, reason: 'max_session_duration' };
    }

    // Verificar timeout de inactividad
    const timeSinceActivity = currentTime - lastActivityTime;
    const minutesSinceActivity = Math.floor(timeSinceActivity / (60 * 1000));
    const inactivityExpiresAt = new Date(lastActivityTime + inactivityTimeoutMs);
    
    console.log(`💤 Tiempo desde última actividad: ${minutesSinceActivity} minutos`);
    console.log(`🕐 Sesión expira por inactividad a: ${inactivityExpiresAt.toLocaleString()}`);

    if (timeSinceActivity > inactivityTimeoutMs) {
      console.log('❌ SESSION EXPIRED: Timeout de inactividad excedido');
      console.log(`   Límite: ${environment.INACTIVITY_TIMEOUT_MINUTES} minutos`);
      console.log(`   Inactivo por: ${minutesSinceActivity} minutos`);
      return { expired: true, reason: 'inactivity_timeout' };
    }

    console.log('✅ SESSION VALID: Sesión activa y dentro de límites');
    return { expired: false };
  }, []);

  // Función para actualizar la última actividad
  const updateLastActivity = useCallback(() => {
    const now = Date.now();
    localStorage.setItem('last_activity', now.toString());
    console.log('⚡ ACTIVITY UPDATE: Última actividad actualizada a:', new Date(now).toLocaleString());
  }, []);

  // Función para restaurar el estado de Redux desde localStorage
  const restoreReduxStateFromStorage = useCallback(() => {
    console.log('🔄 REDUX RESTORE: Restaurando estado desde localStorage...');
    
    try {
      // Obtener todos los datos del usuario desde localStorage
      const userData = {
        user_id: localStorage.getItem('user_id'),
        user_name: localStorage.getItem('user_name'),
        user_lastname: localStorage.getItem('user_lastname'),
        user_email: localStorage.getItem('user_email'),
        partition_key: localStorage.getItem('partition_key'),
        representative_people_id: localStorage.getItem('representative_people_id'),
        representative_people_full_name: localStorage.getItem('representative_people_full_name'),
        representative_people_first_name: localStorage.getItem('representative_people_first_name'),
        representative_people_last_name: localStorage.getItem('representative_people_last_name'),
        representative_people_email: localStorage.getItem('representative_people_email'),
        representative_people_calling_code: localStorage.getItem('representative_people_calling_code'),
        representative_people_phone_number: localStorage.getItem('representative_people_phone_number'),
        company_business_name: localStorage.getItem('company_business_name'),
        company_business_type: localStorage.getItem('company_business_type'),
        company_calling_code: localStorage.getItem('company_calling_code'),
        company_phone_number: localStorage.getItem('company_phone_number'),
        company_address_line: localStorage.getItem('company_address_line'),
        current_organization_id: localStorage.getItem('current_organization_id'),
        current_organization_name: localStorage.getItem('current_organization_name'),
        organization_details: localStorage.getItem('organization_details')
      };

      // Solo restaurar si tenemos datos básicos del usuario
      if (userData.user_id && userData.user_email) {
        console.log('✅ REDUX RESTORE: Datos encontrados, restaurando contexto de usuario...');
        
        // Disparar la acción de login en Redux para restaurar el estado
        dispatch(loginAction({
          user: {
            email: userData.user_email,
            name: userData.user_name ? `${userData.user_name} ${userData.user_lastname || ''}`.trim() : undefined,
            picture: undefined
          },
          tokens: {
            accessToken: localStorage.getItem('access_token') || '',
            refreshToken: localStorage.getItem('refresh_token') || '',
            idToken: localStorage.getItem('id_token') || ''
          }
        }));

        // También restaurar datos del UserContext si están disponibles
        const availableOrgsString = localStorage.getItem('available_organizations');
        if (availableOrgsString) {
          try {
            const availableOrgs = JSON.parse(availableOrgsString);
            console.log('🏢 ORGANIZATIONS RESTORE: Organizaciones disponibles encontradas, restaurando...');
            
            // Disparar evento inmediato para restaurar organizaciones
            window.dispatchEvent(new CustomEvent('restore_organizations', {
              detail: { organizationData: availableOrgs }
            }));
          } catch (error) {
            console.log('⚠️ ORGANIZATIONS RESTORE: Error parseando organizaciones disponibles:', error);
          }
        }

        // Notificar a otros tabs que se restauró el contexto
        try {
          const channel = new BroadcastChannel('session_sync');
          channel.postMessage({ type: 'CONTEXT_RESTORED', timestamp: Date.now() });
          channel.close();
        } catch (error) {
          console.log('📻 BROADCAST: No se pudo notificar a otros tabs:', error);
        }

        console.log('🎉 CONTEXT RESTORED: Estado de Redux restaurado exitosamente');
      } else {
        console.log('⚠️ REDUX RESTORE: Datos insuficientes para restaurar el contexto');
      }
    } catch (error) {
      console.error('❌ REDUX RESTORE ERROR:', error);
    }
  }, [dispatch]);

  // Función para limpiar la sesión
  const clearSessionData = useCallback(() => {
    if (isValidatingRef.current) return;
    isValidatingRef.current = true;

    console.log('🧹 SESSION CLEANUP: Iniciando limpieza de sesión...');

    try {
      // Limpiar tokens y datos de usuario primero
      const keysToRemove = [
        'jwt', 'id_token', 'refresh_token', 'access_token',
        'user_name', 'user_lastname', 'user_id', 'user_email',
        'partition_key', 'representative_people_id',
        'representative_people_full_name', 'representative_people_first_name',
        'representative_people_last_name', 'representative_people_email',
        'representative_people_calling_code', 'representative_people_phone_number',
        'company_business_name', 'company_business_type',
        'company_calling_code', 'company_phone_number', 'company_address_line',
        // NOTA: NO limpiamos datos de organizaciones para permitir restauración en nuevas pestañas:
        // - 'current_organization_id', 'current_organization_name', 'organization_details' 
        // - 'available_organizations'
        'last_activity', 'login_time'
      ];

      console.log('🗑️ Removiendo datos del localStorage:', keysToRemove);
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Limpiar contextos
      console.log('🔄 Limpiando contextos Redux y usuario...');
      clearSession();
      dispatch(logoutAction());

      if (showExpirationToast) {
        console.log('🔔 Mostrando notificación de sesión expirada');
        toast({
          title: "Sesión expirada",
          description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
      }

      // Redirigir al login
      console.log('🏠 Redirigiendo al login...');
      setLocation('/');
      
      // DESPUÉS de redirigir: Notificar a otros tabs sobre el logout completado
      console.log('📡 Notificando a otros tabs sobre el logout completado...');
      
      // Método 1: Usar BroadcastChannel para comunicación directa entre tabs
      const channel = new BroadcastChannel('session_sync');
      channel.postMessage({ type: 'FORCE_LOGOUT', timestamp: Date.now() });
      channel.close();

      // Método 2: Disparar evento customizado en la misma ventana
      window.dispatchEvent(new CustomEvent('session_force_logout', { 
        detail: { timestamp: Date.now() } 
      }));

      // Método 3: Usar localStorage como fallback
      localStorage.setItem('session_logout', Date.now().toString());
      setTimeout(() => {
        localStorage.removeItem('session_logout');
      }, 100);
      
      console.log('✅ LOGOUT COMPLETE: Limpieza de sesión completada');
    } finally {
      isValidatingRef.current = false;
    }
  }, [dispatch, clearSession, setLocation, toast, showExpirationToast]);

  // Función principal de validación
  const validateSession = useCallback((): boolean => {
    if (isValidatingRef.current) return false;

    console.log('🔐 SESSION VALIDATION: Iniciando validación de sesión...');

    // Verificar si hay tokens válidos
    const tokensValid = validateTokens();
    if (!tokensValid) {
      console.log('❌ VALIDATION FAILED: Tokens inválidos o faltantes');
      clearSessionData();
      return false;
    }

    // Verificar si la sesión ha expirado por tiempo
    const sessionStatus = isSessionExpired();
    if (sessionStatus.expired) {
      console.log(`❌ VALIDATION FAILED: Sesión expirada por ${sessionStatus.reason}`);
      clearSessionData();
      return false;
    }

    // Si llegamos aquí, la sesión es válida - actualizar última actividad
    console.log('✅ VALIDATION SUCCESS: Sesión válida, actualizando actividad...');
    updateLastActivity();
    return true;
  }, [validateTokens, isSessionExpired, clearSessionData, updateLastActivity]);

  // 1. Validación automática al cargar la página
  useEffect(() => {
    if (!validateOnMount) return;

    const initializeSession = () => {
      const hasTokens = localStorage.getItem('access_token');
      
      if (hasTokens && !isAuthenticated) {
        // Hay tokens pero Redux no está autenticado - validar y restaurar
        console.log('🔄 CONTEXT RESTORE: Nueva pestaña detectada, restaurando contexto...');
        if (!validateSession()) {
          return;
        }
        // Restaurar el estado de Redux desde localStorage
        restoreReduxStateFromStorage();
      } else if (!hasTokens && isAuthenticated) {
        // Redux dice que está autenticado pero no hay tokens - limpiar
        clearSessionData();
      } else if (hasTokens && isAuthenticated) {
        // Ambos tienen datos - validar sesión
        validateSession();
      }
    };

    initializeSession();
  }, [validateOnMount, isAuthenticated, validateSession, clearSessionData]);



  // 2. Sincronización entre tabs usando múltiples métodos de eventos
  useEffect(() => {

    // Método 1: BroadcastChannel para comunicación directa entre tabs
    const channel = new BroadcastChannel('session_sync');
    const handleBroadcastMessage = (event: MessageEvent) => {
      console.log('📻 BROADCAST MESSAGE:', event.data);
      if (event.data.type === 'FORCE_LOGOUT') {
        console.log('🔗 SYNC TABS: Logout forzado por BroadcastChannel');
        clearSessionData();
      } else if (event.data.type === 'CONTEXT_RESTORED') {
        console.log('🔗 SYNC TABS: Contexto restaurado en otro tab, sincronizando...');
        // Solo restaurar si esta pestaña no está autenticada pero hay tokens
        if (!isAuthenticated && localStorage.getItem('access_token')) {
          console.log('🔄 SYNC TABS: Restaurando contexto desde evento...');
          restoreReduxStateFromStorage();
        }
      } else if (event.data.type === 'LOGIN_COMPLETED') {
        console.log('🔗 SYNC TABS: Login completado en otro tab, verificando...');
        // Si hay tokens válidos pero no estamos autenticados, restaurar
        if (!isAuthenticated && localStorage.getItem('access_token')) {
          console.log('🔄 SYNC TABS: Restaurando contexto por login en otro tab...');
          restoreReduxStateFromStorage();
        }
      }
    };
    channel.addEventListener('message', handleBroadcastMessage);

    // Método 2: Storage events (fallback)
    const handleStorageChange = (event: StorageEvent) => {
      // Si otro tab removió los tokens, cerrar sesión aquí también
      if (event.key === 'access_token' && !event.newValue && isAuthenticated) {
        console.log('🔗 SYNC TABS: Token removido en otro tab, cerrando sesión aquí...');
        clearSessionData();
        return;
      }

      // Si otro tab removió cualquier token crítico
      if (['jwt', 'id_token', 'refresh_token'].includes(event.key as string) && !event.newValue && isAuthenticated) {
        console.log(`🔗 SYNC TABS: Token crítico ${event.key} removido en otro tab, cerrando sesión aquí...`);
        clearSessionData();
        return;
      }

      // Si se disparó un evento de logout desde otro tab
      if (event.key === 'session_logout' && event.newValue && isAuthenticated) {
        console.log('🔗 SYNC TABS: Logout detectado en otro tab, cerrando sesión aquí...');
        clearSessionData();
        return;
      }

      // Si se actualizó la última actividad en otro tab (sin log)
      if (event.key === 'last_activity' && event.newValue) {
        return;
      }
    };

    // Método 3: Eventos personalizados (para la misma ventana)
    const handleCustomLogout = () => {
      console.log('🔗 SYNC TABS: Logout custom event detectado');
      clearSessionData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('session_force_logout', handleCustomLogout);

    return () => {
      channel.removeEventListener('message', handleBroadcastMessage);
      channel.close();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('session_force_logout', handleCustomLogout);
    };
  }, [isAuthenticated, clearSessionData]);

  // 3. Detección de cambios de visibilidad del tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        // El tab volvió a ser visible - validar sesión
        console.log('👁️ TAB VISIBILITY: Tab visible de nuevo, validando sesión...');
        validateSession();
      } else if (document.hidden && isAuthenticated) {
        console.log('👁️ TAB VISIBILITY: Tab oculto (usuario cambió de pestaña)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, validateSession]);

  // Función expuesta para validar manualmente
  const forceValidateSession = useCallback(() => {
    return validateSession();
  }, [validateSession]);

  // Función expuesta para cerrar sesión manualmente
  const forceLogout = useCallback(() => {
    clearSessionData();
  }, [clearSessionData]);

  return {
    validateSession: forceValidateSession,
    logout: forceLogout,
    updateLastActivity,
    isSessionValid: isAuthenticated && validateTokens() && !isSessionExpired().expired
  };
};