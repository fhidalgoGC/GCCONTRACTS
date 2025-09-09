import { useEffect, useCallback } from 'react';
import { useAppSelector } from '@/app/hooks';

interface ActivityTrackerOptions {
  // Eventos que deben considerarse como actividad del usuario
  events?: string[];
  // Throttle time en milisegundos para evitar actualizaciones excesivas
  throttleTime?: number;
}

/**
 * Hook que rastrea la actividad del usuario y actualiza la marca de tiempo
 * Solo funciona si el usuario está autenticado
 */
export const useActivityTracker = (options: ActivityTrackerOptions = {}) => {
  const {
    events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
    throttleTime = 30000 // 30 segundos por defecto
  } = options;

  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Función para actualizar la última actividad
  const updateActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    const lastActivity = localStorage.getItem('last_activity');
    
    // Solo actualizar si ha pasado el tiempo de throttle
    if (!lastActivity || (now - parseInt(lastActivity)) > throttleTime) {
      localStorage.setItem('last_activity', now.toString());
      console.log('🎯 USER ACTIVITY: Actividad detectada, actualizando timestamp:', new Date(now).toLocaleString());
    }
  }, [isAuthenticated, throttleTime]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Agregar listeners para todos los eventos de actividad
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [isAuthenticated, events, updateActivity]);

  return {
    updateActivity
  };
};