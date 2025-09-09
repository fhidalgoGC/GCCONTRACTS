import { authenticatedFetch } from "@/utils/apiInterceptors";
import { environment } from "@/environment/environment";
import { Organization, OrganizationOption } from "./types";

export type { Organization, OrganizationOption };

// Organization service with customer info and partition keys
export const organizationService = {
  async getCustomerInfo(): Promise<any> {
    try {
      const url = `${environment.IDENTITY_BASE_URL}/identity/customers`;
      
      const response = await authenticatedFetch(url, { method: "GET" });

      if (!response.ok) {
        throw new Error(`Failed to fetch customer info: ${response.status}`);
      }

      const data = await response.json();
      console.log('Customer info received:', data);
      
      return data;
    } catch (error) {
      console.error('Error fetching customer info:', error);
      throw error;
    }
  },

  async getPartitionKeys(): Promise<OrganizationOption[]> {
    // Get customer ID from localStorage - use default if not found
    const customerId = localStorage.getItem("customer_id") || "a328b9b8f1996eadd36d375f";

    try {
      const url = `${environment.IDENTITY_BASE_URL}/identity/v2/customers/${customerId}/partition_keys`;

      const response = await authenticatedFetch(url, { method: "GET" });

      if (!response.ok) {
        throw new Error(`Failed to fetch partition keys: ${response.status}`);
      }

      const data = await response.json();

      console.log("Raw partition keys data received:", data);

      // Check if data is an array, if not, handle accordingly
      const itemsArray = Array.isArray(data)
        ? data
        : data.data || data.items || [];

      console.log("Processed items array:", itemsArray);
      console.log("Items array length:", itemsArray.length);

      // Transform the response data to match our interface
      return itemsArray
        .filter((item: any) => item.partitionKey) // Only include items with partitionKey
        .map((item: any) => ({
          key: item.partitionKey || item.id || item.key,
          value: item.partitionKey || item.id || item.value,
          label: item.organization || item.label || `Organization ${item.partitionKey?.slice(-8)}`,
          organization: {
            _id: item.partitionKey || item.id,
            name: item.organization || `Organization ${item.partitionKey?.slice(-8)}`,
            description: item.description,
            type: item.type,
            logo: item.logo,
            initials: item.initials || getInitials(item.organization || `Org ${item.partitionKey?.slice(-4) || 'XX'}`),
          },
        }));
    } catch (error) {
      console.error("Error fetching partition keys:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        customerId: customerId,
        url: `${environment.IDENTITY_BASE_URL}/identity/v2/customers/${customerId}/partition_keys`,
      });
      // Return empty array instead of throwing to prevent breaking the UI
      return [];
    }
  },

  async getOrganizations(partitionKey: string): Promise<Organization[]> {
    try {
      // Build filter object with the partition key
      const filter = {
        "_partitionKey": {
          "$in": [partitionKey]
        }
      };
      
      const encodedFilter = encodeURIComponent(JSON.stringify(filter));
      const url = `${environment.CRM_BASE_URL}/mngm-organizations/organizations?filter=${encodedFilter}`;
      
      const response = await authenticatedFetch(url, { method: "GET" });

      if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Raw organizations data received:', data);
      
      // Check if data is an array, if not, handle accordingly
      const itemsArray = Array.isArray(data) ? data : (data.data || data.items || []);
      
      console.log('Processed organizations array:', itemsArray);
      
      // Transform the response data to match our interface
      return itemsArray.map((item: any) => ({
        _id: item._id || item.id,
        name: item.name || item.organization || 'Unknown Organization',
        description: item.description,
        type: item.type,
        logo: item.logo,
        initials: item.initials || getInitials(item.name || item.organization || '')
      }));
    } catch (error) {
      console.error('Error fetching organizations:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        partitionKey: partitionKey,
        url: `${environment.CRM_BASE_URL}/mngm-organizations/organizations`
      });
      // Return empty array instead of throwing to prevent breaking the UI
      return [];
    }
  },

  async getOrganizationsRaw(partitionKey: string): Promise<any> {
    try {
      // Build filter object with the partition key
      const filter = {
        "_partitionKey": {
          "$in": [partitionKey]
        }
      };
      
      const encodedFilter = encodeURIComponent(JSON.stringify(filter));
      const url = `${environment.CRM_BASE_URL}/mngm-organizations/organizations?filter=${encodedFilter}`;
      
      const response = await authenticatedFetch(url, { method: "GET" });

      if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Raw organizations data received:', data);
      
      // Return the raw data without transformation for auth purposes
      return data;
    } catch (error) {
      console.error('Error fetching organizations raw:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        partitionKey: partitionKey,
        url: `${environment.CRM_BASE_URL}/mngm-organizations/organizations`
      });
      throw error;
    }
  },
};

// Helper function to generate initials from organization name
function getInitials(name: string): string {
  if (!name) return "OR";

  const words = name.split(" ").filter((word) => word.length > 0);

  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase();
  } else if (words.length === 1 && words[0].length === 1) {
    return `${words[0][0]}${words[0][0]}`.toUpperCase();
  }

  return "OR";
}
