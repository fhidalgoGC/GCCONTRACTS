import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import {
  login as loginAction,
  logout as logoutAction,
} from "../slices/authSlice";
import { useLoginMutation, useGetIdentityQuery } from "../services/authApi";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { getTabId } from "@/utils/tabId";

export const useAuth = () => {
  const [, setLocation] = useLocation();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [loginMutation] = useLoginMutation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setUserData, setAvailableOrganizations, setCurrentOrganization, clearSession } = useUser();

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      const result = await loginMutation({ email, password }).unwrap();

      // Store tokens in localStorage
      localStorage.setItem("jwt", result.id_token);
      localStorage.setItem("id_token", result.id_token); // Also store as id_token for characteristics endpoint
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("access_token", result.access_token);
      // Set initial login time and last activity time
      const loginTime = Date.now().toString();
      localStorage.setItem("login_time", loginTime);
      localStorage.setItem("last_activity", loginTime);
      console.log('🚀 LOGIN: Sesión iniciada - timestamps guardados:', new Date(parseInt(loginTime)).toLocaleString());

      // After successful login, fetch user identity using organization service
      const { organizationService } = await import(
        "@/services/organization/organization.service"
      );
      const identityData = await (organizationService as any).getCustomerInfo();

      // Store user data in localStorage and context
      localStorage.setItem("user_name", identityData.data.firstName);
      localStorage.setItem("user_lastname", identityData.data.lastName);
      localStorage.setItem("user_id", identityData.data.id);
      localStorage.setItem("customer_id", identityData.data.id); // Store customer_id for organization service
      localStorage.setItem("user_email", identityData.data.email);
      
      // Update user context
      setUserData({
        userName: identityData.data.firstName,
        userId: identityData.data.id
      });

      // Get partition keys using organization service
      const partitionKeysData = await organizationService.getPartitionKeys();

      // Store organizations in context and set initial partition key
      let partitionKey = "";
      if (partitionKeysData && partitionKeysData.length > 0) {
        // Convert OrganizationOption[] to OrganizationData[]
        const organizationDataArray = partitionKeysData.map(org => ({
          role: '',
          partitionKey: org.value,
          organization: org.label,
          registered: '',
          id: org.organization._id || org.value,
          externals: [],
          type: org.organization.type || 'Organizational',
          idCustomer: ''
        }));
        
        // Set organizations in context
        setAvailableOrganizations(organizationDataArray);
        
        const firstOrg = partitionKeysData[0];
        partitionKey = firstOrg.value;
        localStorage.setItem("partition_key", partitionKey);
        
        // Set current organization in context
        setCurrentOrganization(organizationDataArray[0]);

        console.log("Partition keys from service:", partitionKeysData);
      }

      // Load organization-specific data for the selected partition key
      await loadOrganizationData(partitionKey);

      // Update Redux state
      dispatch(
        loginAction({
          user: {
            email: identityData.data.email,
            name: `${identityData.data.firstName} ${identityData.data.lastName}`,
          },
          tokens: {
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            idToken: result.id_token,
          },
        }),
      );

      toast({
        title: t("loginSuccess"),
        description: t("loginSuccessMessage"),
      });

      // Navegar al home inmediatamente
      setLocation("/home");
      
      // Notificar a otras pestañas que se completó el login
      try {
        const channel = new BroadcastChannel('session_sync');
        const tabId = getTabId();
        const loginMessage = { 
          type: 'LOGIN_COMPLETED', 
          timestamp: Date.now(),
          tabId: tabId 
        };
        console.log('📻 SENDING LOGIN: Enviando evento desde tabId:', tabId, loginMessage);
        channel.postMessage(loginMessage);
        channel.close();
        console.log('📡 LOGIN: Login completado - notificando a otras pestañas');
      } catch (error) {
        console.log('📻 LOGIN: No se pudo notificar a otros tabs:', error);
      }

      return true;
    } catch (err: any) {
      const errorMessage =
        err?.data?.error_description || err?.message || t("loginError");
      setError(errorMessage);
      toast({
        title: t("loginErrorTitle"),
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // New method to load organization-specific data
  const loadOrganizationData = async (partitionKey: string) => {
    try {
      // Get organization information using organization service
      const { organizationService } = await import(
        "@/services/organization/organization.service"
      );
      const organizationResponse =
        await organizationService.getOrganizationsRaw(partitionKey);

      console.log("organization_owner", organizationResponse);
      // Extract representative_people_id from the first organization's extras
      let representativePeopleId = "";

      if (organizationResponse.data && organizationResponse.data.length > 0) {
        const firstOrg = organizationResponse.data[0];
        if (firstOrg.extras && Array.isArray(firstOrg.extras)) {
          const representativeExtra = firstOrg.extras.find(
            (extra: any) => extra.key === "organization_owner",
          );
          if (
            representativeExtra &&
            representativeExtra.values &&
            representativeExtra.values.length > 0
          ) {
            representativePeopleId = representativeExtra.values[0].value;
            localStorage.setItem(
              "representative_people_id",
              representativePeopleId,
            );
          }
        }

        // Store organization information in localStorage with company_ prefix
        if (firstOrg.business_name) {
          localStorage.setItem("company_business_name", firstOrg.business_name);
        }
        if (firstOrg.business_type) {
          localStorage.setItem("company_business_type", firstOrg.business_type);
        }
        if (firstOrg.phones && firstOrg.phones.length > 0) {
          if (firstOrg.phones[0].calling_code) {
            localStorage.setItem(
              "company_calling_code",
              firstOrg.phones[0].calling_code,
            );
          }
          if (firstOrg.phones[0].phone_number) {
            localStorage.setItem(
              "company_phone_number",
              firstOrg.phones[0].phone_number,
            );
          }
        }
        if (
          firstOrg.addresses &&
          firstOrg.addresses.length > 0 &&
          firstOrg.addresses[0].line
        ) {
          localStorage.setItem(
            "company_address_line",
            firstOrg.addresses[0].line,
          );
        }
      }

      // Get representative people information using crm-people service
      const { getPersonById } = await import("@/services/crm-people/crm-people.service");
      try {
        const peopleData = await getPersonById(representativePeopleId);

        // Store representative people information in localStorage
        if (peopleData) {
          localStorage.setItem(
            "representative_people_full_name",
            peopleData.full_name,
          );
          if (peopleData.first_name) {
            localStorage.setItem(
              "representative_people_first_name",
              peopleData.first_name,
            );
          }
          if (peopleData.last_name) {
            localStorage.setItem(
              "representative_people_last_name",
              peopleData.last_name,
            );
          }

          // Store email from first email object
          if (peopleData.emails && peopleData.emails.length > 0) {
            localStorage.setItem(
              "representative_people_email",
              peopleData.emails[0].value,
            );
          }

          // Store phone information from first phone object
          if (peopleData.phones && peopleData.phones.length > 0) {
            localStorage.setItem(
              "representative_people_calling_code",
              peopleData.phones[0].calling_code,
            );
            localStorage.setItem(
              "representative_people_phone_number",
              peopleData.phones[0].phone_number,
            );
          }
        }
      } catch (error) {
        console.error("Error fetching representative people:", error);
      }

      // Update partition key in localStorage
      localStorage.setItem("partition_key", partitionKey);

      // Organization context is already updated during login, no need to do anything here

      console.log("Organization data loaded for partition key:", partitionKey);
    } catch (error) {
      console.error("Error loading organization data:", error);
      throw error;
    }
  };

  const logout = () => {
    // Clear tokens from localStorage
    localStorage.removeItem("jwt");
    localStorage.removeItem("id_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("access_token");

    // Clear user data from localStorage
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_lastname");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    localStorage.removeItem("partition_key");
    localStorage.removeItem("representative_people_id");
    localStorage.removeItem("representative_people_full_name");
    localStorage.removeItem("representative_people_first_name");
    localStorage.removeItem("representative_people_last_name");
    localStorage.removeItem("representative_people_email");
    localStorage.removeItem("representative_people_calling_code");
    localStorage.removeItem("representative_people_phone_number");
    

    // Clear company data from localStorage
    localStorage.removeItem("company_business_name");
    localStorage.removeItem("company_business_type");
    localStorage.removeItem("company_calling_code");
    localStorage.removeItem("company_phone_number");
    localStorage.removeItem("company_address_line");
    
    // Clear organization data from localStorage
    localStorage.removeItem("current_organization_id");
    localStorage.removeItem("current_organization_name");
    localStorage.removeItem("organization_details");
    localStorage.removeItem("last_activity");
    localStorage.removeItem("login_time");

    // Clear session context
    clearSession();

    // Update Redux state
    dispatch(logoutAction());

    toast({
      title: t("logoutSuccess"),
      description: t("logoutSuccessMessage"),
    });

    setLocation("/");
  };

  return {
    login,
    logout,
    loadOrganizationData,
    isLoading,
    error,
    isAuthenticated,
    user,
  };
};
