import { useAppSelector } from '../../../app/hooks';
import LoginForm from './LoginForm';

export default function LoginScreen() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Si ya está autenticado, no mostrar el formulario de login
  // La redirección se maneja en useAuth.ts después del login exitoso
  if (isAuthenticated) {
    return null;
  }

  return <LoginForm />;
}
