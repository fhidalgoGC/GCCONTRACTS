import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { LogOut, Languages, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/hooks/useAuth';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { useNavigationHandler } from '@/hooks/usePageState';
import { useUser } from '@/contexts/UserContext';
import { Link } from 'wouter';
import { NavBarProps, Breadcrumb, Language } from './types';
import "./styles.css";

export default function NavBar({ title }: NavBarProps) {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const [location] = useLocation();
  const { handleNavigateToPage } = useNavigationHandler();
  const { availableOrganizations, currentOrganization, setCurrentOrganization, isLoadingOrganizations, setIsLoadingOrganizations } = useUser();
  const { loadOrganizationData } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem('language') || 'es'
  );

  // Función para generar breadcrumbs basados en la URL actual
  const generateBreadcrumbs = (): Breadcrumb[] => {
    const pathSegments = location.split('/').filter(segment => segment !== '');
    const breadcrumbs: Breadcrumb[] = [];

    // Siempre incluir "Dashboard" como primera migaja
    if (pathSegments.length > 0) {
      breadcrumbs.push({
        label: t('breadcrumbs.dashboard'),
        path: '/home',
        isActive: false
      });
    }

    // Mapear segmentos de URL a breadcrumbs
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      let label = segment;
      let path = currentPath;
      let isActive = index === pathSegments.length - 1;

      // Mapear rutas específicas a labels traducidos
      switch (segment) {
        case 'buyers':
          label = t('buyers');
          break;
        case 'sellers':
          label = t('sellers');
          break;
        case 'purchase-contracts':
          label = t('purchaseContracts');
          break;
        case 'sale-contracts':
          label = t('saleContracts');
          break;
        case 'create':
          if (pathSegments[index - 1] === 'purchase-contracts') {
            label = t('breadcrumbs.newContract');
          } else if (pathSegments[index - 1] === 'sub-contracts') {
            label = t('breadcrumbs.newSubContract');
          } else {
            label = 'Crear';
          }
          break;
        case 'edit':
          if (pathSegments[index - 2] === 'sub-contracts') {
            label = t('breadcrumbs.editSubContract');
            // Para edición de sub-contratos, el path debe ir al detalle del contrato padre
            const contractId = pathSegments[1]; // purchase-contracts/[contractId]/sub-contracts/[subContractId]/edit
            path = `/purchase-contracts/${contractId}`;
          } else if (pathSegments[index - 1] === 'purchase-contracts') {
            label = t('breadcrumbs.editContract');
          } else {
            label = 'Editar';
          }
          break;
        case 'view':
          if (pathSegments[index - 2] === 'sub-contracts') {
            label = t('breadcrumbs.viewSubContract');
            // Para visualización de sub-contratos, el path debe ir al detalle del contrato padre
            const contractId = pathSegments[1]; // purchase-contracts/[contractId]/sub-contracts/[subContractId]/view
            path = `/purchase-contracts/${contractId}`;
          } else {
            label = 'Ver';
          }
          break;
        case 'sub-contracts':
          label = t('breadcrumbs.subContracts');
          // Skip sub-contracts si el siguiente es edit/create/view porque representan el mismo nivel conceptual
          if (index < pathSegments.length - 1 && 
              (pathSegments[index + 1] === 'create' || pathSegments[index + 2] === 'edit' || pathSegments[index + 2] === 'view')) {
            return;
          }
          break;
        default:
          // Si es un ID (contiene guiones o números), usar el título de la página
          if (/^[a-f0-9-]+$/i.test(segment) || /^\d+$/.test(segment)) {
            if (pathSegments.includes('purchase-contracts')) {
              label = t('breadcrumbs.contractDetail');
              // Si estamos en una ruta de sub-contrato, el contractDetail debe navegar al contrato padre
              if (pathSegments.includes('sub-contracts')) {
                const contractId = pathSegments[1]; // purchase-contracts/[contractId]
                path = `/purchase-contracts/${contractId}`;
              }
            } else {
              label = 'Detalle';
            }
            
            // Skip el ID del sub-contrato en breadcrumbs para evitar duplicación
            if (pathSegments[index - 1] === 'sub-contracts') {
              return;
            }
          }
          break;
      }

      // Para sub-contratos, ajustar el path de retorno para create
      if (segment === 'create' && pathSegments[index - 1] === 'sub-contracts') {
        // El path debería ir al detalle del contrato padre
        const contractId = pathSegments[1];
        path = `/purchase-contracts/${contractId}`;
      }

      breadcrumbs.push({
        label,
        path,
        isActive
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Get user name from localStorage
  const getUserName = () => {
    const userName = localStorage.getItem('user_name');
    if (userName && userName.trim().length > 0) {
      return userName.trim();
    }
    
    return 'Usuario';
  };

  // Get user initials
  const getUserInitials = () => {
    const name = getUserName();
    
    if (name === 'Usuario') {
      return 'US';
    }
    
    const names = name.split(' ').filter(n => n.length > 0);
    
    if (names.length >= 2) {
      // Take first letter of first name and first letter of last name
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    } else if (names.length === 1 && names[0].length >= 2) {
      // If only one name, take first two letters
      return names[0].substring(0, 2).toUpperCase();
    } else if (names.length === 1 && names[0].length === 1) {
      // If only one letter, duplicate it
      return `${names[0][0]}${names[0][0]}`.toUpperCase();
    }
    
    return 'US';
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    setCurrentLanguage(lang);
  };

  const languages: Language[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  // Helper function to get organization initials
  const getOrganizationInitials = (name: string | null | undefined): string => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) return 'ORG';
    
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length >= 2) {
      return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      return words[0].substring(0, 2).toUpperCase();
    } else if (words.length === 1 && words[0].length === 1) {
      return `${words[0][0]}${words[0][0]}`.toUpperCase();
    }
    
    return 'ORG';
  };

  // Handle organization change
  const handleOrganizationChange = async (partitionKey: string) => {
    const selectedOrg = availableOrganizations.find(org => org.partitionKey === partitionKey);
    if (selectedOrg) {
      console.log('Starting organization change, setting loading to true');
      setIsLoadingOrganizations(true);
      const startTime = Date.now();
      
      setCurrentOrganization(selectedOrg);
      localStorage.setItem('partition_key', partitionKey);
      
      try {
        await loadOrganizationData(partitionKey);
        console.log('Organization switched successfully to:', selectedOrg.organization);
      } catch (error) {
        console.error('Error switching organization:', error);
      } finally {
        // Ensure minimum loading time of 300ms
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 300 - elapsedTime);
        
        setTimeout(() => {
          console.log('Finishing organization change, setting loading to false');
          setIsLoadingOrganizations(false);
        }, remainingTime);
      }
    }
  };

  return (
    <nav className="navbar">
      {/* Left side - Breadcrumbs */}
      <div className="navbar__left">
        {breadcrumbs.length > 0 ? (
          <div className="navbar__breadcrumbs">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={index} className="navbar__breadcrumb-item">
                {breadcrumb.isActive ? (
                  <span className="navbar__breadcrumb-active">
                    {breadcrumb.label}
                  </span>
                ) : (
                  <Link href={breadcrumb.path}>
                    <span 
                      className="navbar__breadcrumb-link"
                      onClick={() => {
                        // Notificar navegación jerárquica según la ruta
                        if (breadcrumb.path === '/purchase-contracts') {
                          handleNavigateToPage('purchaseContracts');
                        } else if (breadcrumb.path === '/buyers') {
                          handleNavigateToPage('buyers');
                        } else if (breadcrumb.path === '/sellers') {
                          handleNavigateToPage('sellers');
                        } else if (breadcrumb.path === '/home') {
                          handleNavigateToPage('dashboard');
                        }
                      }}
                    >
                      {breadcrumb.label}
                    </span>
                  </Link>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="navbar__chevron-icon" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <h1 className="navbar__title">
            {title}
          </h1>
        )}
      </div>

      {/* Right side - Theme toggle, Organization selector, Language selector and User menu */}
      <div className="navbar__right">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* Organization Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-8 h-8 rounded-sm p-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all duration-100 border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50"
              disabled={isLoadingOrganizations}
            >
              {isLoadingOrganizations ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              ) : currentOrganization ? (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {getOrganizationInitials(currentOrganization.organization || '')}
                </span>
              ) : (
                <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
            {availableOrganizations.map((org) => (
              <DropdownMenuItem
                key={org.partitionKey}
                onClick={() => handleOrganizationChange(org.partitionKey)}
                className="flex items-center space-x-3 cursor-pointer px-3 py-2 text-sm hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all duration-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {getOrganizationInitials(org.organization || '')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {org.organization || 'Organization'}
                  </div>
                </div>
                {currentOrganization?.partitionKey === org.partitionKey && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-8 h-8 rounded-sm p-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all duration-100 border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50"
            >
              <span className="text-sm">{currentLang?.flag}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className="flex items-center space-x-2 cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all duration-100"
              >
                <span className="text-sm">{lang.flag}</span>
                <span className="font-normal">{lang.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2 h-8 px-2 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all duration-100 border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 rounded-sm"
            >
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-normal text-gray-700 dark:text-gray-300 max-w-36 truncate">
                {getUserName()}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-500 transition-transform duration-100 group-data-[state=open]:rotate-180" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 border-gray-200/50 dark:border-gray-700/50 shadow-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-md">
            <DropdownMenuItem 
              onClick={logout} 
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-red-50/60 dark:hover:bg-red-900/20 transition-all duration-100 text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}