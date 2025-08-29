import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Loader2, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuth();

  // Clear saved credentials from localStorage for security
  useEffect(() => {
    localStorage.removeItem('savedCredentials');
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    await login(data.email, data.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 login-container">
      <Card className="w-full max-w-md shadow-lg relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
              </div>
              <p className="text-gray-600 font-medium">{t('authenticating')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('pleaseWait')}</p>
            </div>
          </div>
        )}
        <CardContent className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 logo-container rounded-xl flex items-center justify-center shadow-lg">
              <Sprout className="text-white text-2xl" size={32} />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('welcomeBack')}
            </h1>
            <p className="text-gray-600 text-sm">
              {t('getStartedSubtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={isLoading} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                {t('emailLabel')}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder={t('emailPlaceholder')}
                  className="pl-4 pr-10 py-3 form-input"
                />
                <Mail className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                {t('passwordLabel')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder={t('passwordPlaceholder')}
                  className="pl-4 pr-10 py-3 form-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>



            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full btn-primary py-3 px-4 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('signingIn')}
                </>
              ) : (
                t('signIn')
              )}
            </Button>
            </fieldset>
          </form>

          {/* App Version */}
          <div className="text-center mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">Version 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
