import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizationService, OrganizationOption, Organization } from '@/services/organization/organization.service';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { organizationLoadingStore } from '@/store/organizationLoadingStore';
import { useUser } from '@/contexts/UserContext';

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

export function useOrganizations() {
  const { loadOrganizationData } = useAuth();
  const { 
    availableOrganizations, 
    setAvailableOrganizations, 
    currentOrganization: currentOrgContext, 
    setCurrentOrganization: setCurrentOrgContext,
    isLoadingOrganizations,
    setIsLoadingOrganizations
  } = useUser();
  const [organizationDetails, setOrganizationDetails] = useState<Organization[]>([]);

  // Only fetch from API if context is completely empty
  const shouldFetchFromAPI = availableOrganizations.length === 0 && !isLoadingOrganizations;
  
  const {
    data: organizationsData = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      console.log('Fetching organizations from API as fallback...');
      return organizationService.getPartitionKeys();
    },
    enabled: shouldFetchFromAPI, // Only run if we don't have organizations in context
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Update available organizations when data changes (only if context is empty)
  useEffect(() => {
    if (organizationsData && Array.isArray(organizationsData) && availableOrganizations.length === 0) {
      setAvailableOrganizations(organizationsData);
    }
  }, [organizationsData]);

  // Transform API data into options
  const organizations = useMemo(() => {
    if (!availableOrganizations || !Array.isArray(availableOrganizations)) return [];
    
    // Check if data is already transformed from API service
    if (availableOrganizations.length > 0 && availableOrganizations[0].key) {
      return availableOrganizations;
    }
    
    // If not transformed, transform raw data
    const filtered = availableOrganizations.filter((item: any) => item && item.partitionKey);
    
    const transformed = filtered.map((item: any) => {
      const orgName = item.organization || (item.type === 'Personal' ? 'Personal' : `Organización ${item.id}`);
      return {
        key: item.partitionKey,
        value: item.partitionKey,
        label: orgName,
        organization: {
          id: item.id,
          name: orgName,
          partitionKey: item.partitionKey,
          type: item.type,
          initials: getOrganizationInitials(orgName)
        }
      };
    });
    
    console.log('Final transformed organizations:', transformed.length, 'items');
    return transformed;
  }, [availableOrganizations]);

  // Initialize current organization from available organizations
  useEffect(() => {
    if (organizations.length > 0 && !currentOrgContext) {
      // Use the first organization available for the current user
      const firstOrg = organizations[0];
      // Find the raw organization data from availableOrganizations
      let orgData = null;
      
      // Check if the organizations are already transformed (have 'key' property)
      if (firstOrg.key && availableOrganizations.length > 0 && availableOrganizations[0].key) {
        // Data is already transformed, create a raw organization object
        orgData = {
          role: '',
          partitionKey: firstOrg.value,
          organization: firstOrg.label,
          registered: '',
          id: firstOrg.organization.id,
          externals: [],
          type: firstOrg.organization.type,
          idCustomer: ''
        };
      } else {
        // Data is raw, find by partitionKey
        orgData = availableOrganizations.find(org => org.partitionKey === firstOrg.value);
      }
      
      if (orgData) {
        console.log('Setting initial organization from context:', orgData);
        setCurrentOrgContext(orgData);
        localStorage.setItem('partition_key', firstOrg.value);
      }
    }
  }, [organizations.length, currentOrgContext, availableOrganizations]);

  // Get current organization as OrganizationOption format
  const currentOrganization = useMemo(() => {
    if (!currentOrgContext) return null;
    
    const orgName = currentOrgContext.organization || (currentOrgContext.type === 'Personal' ? 'Personal' : `Organización ${currentOrgContext.id}`);
    
    return {
      key: currentOrgContext.partitionKey,
      value: currentOrgContext.partitionKey,
      label: orgName,
      organization: {
        id: currentOrgContext.id,
        name: orgName,
        partitionKey: currentOrgContext.partitionKey,
        type: currentOrgContext.type,
        initials: getOrganizationInitials(orgName)
      }
    };
  }, [currentOrgContext]);

  const changeOrganization = async (organizationId: string) => {
    // Find the organization in the transformed list
    const selectedOrg = organizations.find((org) => org.value === organizationId);
    
    // Create or find the raw organization data
    let selectedOrgData = null;
    
    if (selectedOrg && availableOrganizations.length > 0 && availableOrganizations[0].key) {
      // Data is already transformed, create a raw organization object
      selectedOrgData = {
        role: '',
        partitionKey: selectedOrg.value,
        organization: selectedOrg.label,
        registered: '',
        id: selectedOrg.organization.id,
        externals: [],
        type: selectedOrg.organization.type,
        idCustomer: ''
      };
    } else {
      // Data is raw, find by partitionKey
      selectedOrgData = availableOrganizations.find((org) => org.partitionKey === organizationId);
    }
    
    if (selectedOrgData) {
      console.log('Starting organization change, setting loading to true');
      organizationLoadingStore.setState(true);
      const startTime = Date.now();
      
      setCurrentOrgContext(selectedOrgData);
      
      // Update localStorage with new partition key (keep only the partition key)
      localStorage.setItem('partition_key', selectedOrgData.partitionKey);
      
      try {
        // Use the new loadOrganizationData method instead of individual calls
        await loadOrganizationData(selectedOrgData.partitionKey);
        
        // Fetch organization details with the new partition key
        const orgDetails = await organizationService.getOrganizations(selectedOrgData.partitionKey);
        setOrganizationDetails(orgDetails);
        
        // Store organization details in localStorage
        localStorage.setItem('organization_details', JSON.stringify(orgDetails));
        
        console.log('Organization switched successfully to:', selectedOrgData.organization);
      } catch (error) {
        console.error('Error switching organization:', error);
        setOrganizationDetails([]);
        localStorage.removeItem('organization_details');
      } finally {
        // Ensure minimum loading time of 300ms
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 300 - elapsedTime);
        
        setTimeout(() => {
          console.log('Finishing organization change, setting loading to false');
          organizationLoadingStore.setState(false);
        }, remainingTime);
      }
    }
  };

  // Load organization details from localStorage on init
  useEffect(() => {
    const storedOrgDetails = localStorage.getItem('organization_details');
    if (storedOrgDetails) {
      try {
        const parsedDetails = JSON.parse(storedOrgDetails);
        setOrganizationDetails(parsedDetails);
      } catch (error) {
        console.error('Error parsing stored organization details:', error);
        localStorage.removeItem('organization_details');
      }
    }
  }, []);

  return {
    organizations,
    currentOrganization,
    organizationDetails,
    changeOrganization,
    isLoading,
    error,
    refetch
  };
}