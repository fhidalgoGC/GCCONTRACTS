import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useNavigationHandler } from '@/hooks/usePageState';
import { 
  FileText, 
  ScrollText,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MenuItem } from './types';
import "./styles.css";

const logoPath = '/assets/LogoGrainchain_1752610987841.png';

const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    icon: Home,
    path: '/home'
  },
  {
    key: 'purchaseContracts',
    icon: FileText,
    path: '/purchase-contracts'
  },
  {
    key: 'saleContracts',
    icon: ScrollText,
    path: '/sale-contracts'
  }
];

export default function Sidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { handleNavigateToPage } = useNavigationHandler();

  return (
    <div className="sidebar">
      <div className="sidebar__container">
        <div className="sidebar__logo-container">
          <img 
            src={logoPath} 
            alt="GrainChain Logo" 
            className="sidebar__logo"
          />
        </div>
        
        {/* Navigation section header */}
        <div className="sidebar__nav-header">
          <h2 className="sidebar__nav-title">
            {t('navigation')}
          </h2>
        </div>
        
        <nav className="sidebar__nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Check if current path matches exactly or is a sub-route
            const isActive = location === item.path || location.startsWith(item.path + '/');
            
            return (
              <Link key={item.key} href={item.path}>
                <div 
                  className={`sidebar__menu-item ${isActive ? 'sidebar__menu-item--active' : 'sidebar__menu-item--inactive'}`}
                  onClick={(e) => {
                    console.log(`🔄 SIDEBAR CLICK: Navegando de ${location} a ${item.path} (${item.key})`);
                    
                    // Ejecutar navegación jerárquica inmediatamente
                    handleNavigateToPage(item.key);
                  }}
                >
                  {/* Microsoft-style active indicator */}
                  {isActive && (
                    <div className="sidebar__active-indicator"></div>
                  )}
                  
                  {/* Icon container with proper sizing */}
                  <div className={`sidebar__menu-icon ${isActive ? 'sidebar__menu-icon--active' : 'sidebar__menu-icon--inactive'}`}>
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  
                  {/* Label with Microsoft typography */}
                  <span className={`sidebar__menu-label ${isActive ? 'sidebar__menu-label--active' : 'sidebar__menu-label--inactive'}`}>
                    {t(item.key)}
                  </span>
                  
                  {/* Fluent UI selection indicator */}
                  {isActive && (
                    <div className="sidebar__selection-indicator"></div>
                  )}
                  
                  {/* Subtle interaction feedback */}
                  <div className={`sidebar__interaction-feedback ${isActive ? 'sidebar__interaction-feedback--active' : 'sidebar__interaction-feedback--inactive'}`}></div>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}