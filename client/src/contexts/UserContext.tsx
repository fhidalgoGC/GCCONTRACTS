import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export interface UserData {
  userName: string;
  userId: string;
  // Add other user fields as needed
}

export interface OrganizationData {
  role: string;
  partitionKey: string;
  organization?: string;
  registered: string;
  id: string;
  externals: any[];
  type: string;
  idCustomer: string;
}

export interface UserContextType {
  // User data
  userData: UserData | null;
  setUserData: (data: UserData | null) => void;
  
  // Available organizations for the current user
  availableOrganizations: OrganizationData[];
  setAvailableOrganizations: (orgs: OrganizationData[]) => void;
  
  // Current selected organization
  currentOrganization: OrganizationData | null;
  setCurrentOrganization: (org: OrganizationData | null) => void;
  
  // Loading states
  isLoadingOrganizations: boolean;
  setIsLoadingOrganizations: (loading: boolean) => void;
  
  // Clear all session data
  clearSession: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<OrganizationData[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationData | null>(null);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);

  // Load user data from localStorage on mount
  useEffect(() => {
    const storedUserName = localStorage.getItem('user_name');
    const storedUserId = localStorage.getItem('user_id');
    
    if (storedUserName && storedUserId) {
      setUserData({
        userName: storedUserName,
        userId: storedUserId
      });
    }
  }, []);

  // Listen for organization restoration events
  useEffect(() => {
    const handleOrganizationRestore = (event: CustomEvent) => {
      console.log('🏢 USER CONTEXT: Restaurando organizaciones desde evento...');
      const { organizationData } = event.detail;
      
      if (organizationData && Array.isArray(organizationData)) {
        setAvailableOrganizations(organizationData);
        console.log('✅ USER CONTEXT: Organizaciones restauradas:', organizationData.length, 'items');
        
        // También restaurar la organización actual si está guardada
        const currentOrgId = localStorage.getItem('current_organization_id');
        if (currentOrgId) {
          // Buscar por id o partitionKey para mayor compatibilidad
          const currentOrg = organizationData.find((org: OrganizationData) => 
            org.id === currentOrgId || org.partitionKey === currentOrgId
          );
          if (currentOrg) {
            setCurrentOrganization(currentOrg);
            console.log('🎯 USER CONTEXT: Organización actual restaurada desde evento:', currentOrg.organization);
          } else {
            console.log('⚠️ USER CONTEXT: No se encontró la organización con ID en evento:', currentOrgId);
            console.log('📋 Organizaciones en evento:', organizationData.map(org => ({ id: org.id, partitionKey: org.partitionKey, name: org.organization })));
          }
        }
      }
    };

    window.addEventListener('restore_organizations', handleOrganizationRestore as EventListener);
    
    return () => {
      window.removeEventListener('restore_organizations', handleOrganizationRestore as EventListener);
    };
  }, []);

  // Save available organizations to localStorage whenever they change
  useEffect(() => {
    if (availableOrganizations.length > 0) {
      localStorage.setItem('available_organizations', JSON.stringify(availableOrganizations));
      console.log('💾 USER CONTEXT: Organizaciones disponibles guardadas en localStorage:', availableOrganizations.length);
    }
  }, [availableOrganizations]);

  // Save current organization to localStorage whenever it changes
  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('current_organization_id', currentOrganization.id);
      localStorage.setItem('current_organization_name', currentOrganization.organization || '');
      console.log('💾 USER CONTEXT: Organización actual guardada:', currentOrganization.organization);
    }
  }, [currentOrganization]);

  // Load available organizations from localStorage on mount
  useEffect(() => {
    const storedAvailableOrgs = localStorage.getItem('available_organizations');
    if (storedAvailableOrgs && availableOrganizations.length === 0) {
      try {
        const parsedOrgs = JSON.parse(storedAvailableOrgs);
        setAvailableOrganizations(parsedOrgs);
        console.log('🔄 USER CONTEXT: Organizaciones disponibles cargadas desde localStorage:', parsedOrgs.length);
        
        // También restaurar la organización actual si está guardada
        const currentOrgId = localStorage.getItem('current_organization_id');
        if (currentOrgId && !currentOrganization) {
          // Buscar por id o partitionKey para mayor compatibilidad
          const currentOrg = parsedOrgs.find((org: OrganizationData) => 
            org.id === currentOrgId || org.partitionKey === currentOrgId
          );
          if (currentOrg) {
            setCurrentOrganization(currentOrg);
            console.log('🎯 USER CONTEXT: Organización actual restaurada desde localStorage:', currentOrg.organization);
          } else {
            console.log('⚠️ USER CONTEXT: No se encontró la organización con ID:', currentOrgId);
            console.log('📋 Organizaciones disponibles:', parsedOrgs.map(org => ({ id: org.id, partitionKey: org.partitionKey, name: org.organization })));
          }
        }
      } catch (error) {
        console.error('Error loading available organizations from localStorage:', error);
        localStorage.removeItem('available_organizations');
      }
    }
  }, [currentOrganization]);

  // Clear all session data
  const clearSession = () => {
    setUserData(null);
    setAvailableOrganizations([]);
    setCurrentOrganization(null);
    setIsLoadingOrganizations(false);
  };

  const value: UserContextType = {
    userData,
    setUserData,
    availableOrganizations,
    setAvailableOrganizations,
    currentOrganization,
    setCurrentOrganization,
    isLoadingOrganizations,
    setIsLoadingOrganizations,
    clearSession
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}