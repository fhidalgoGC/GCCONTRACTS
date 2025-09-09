export interface CrmPerson {
  _id: string;
  _partitionKey: string;
  active: boolean;
  created_at: string;
  created_by: string;
  emails: Array<{
    _id: string;
    type: string;
    value: string;
    verified: boolean;
    created_at: string;
    updated_at: string;
  }>;
  first_name?: string;
  last_name?: string;
  full_name: string;
  organization_name?: string;
  person_type: "juridical_person" | "natural_person";
  phones: Array<{
    _id: string;
    calling_code: string;
    phone_number: string;
    type: string;
    verified: boolean;
    created_at: string;
    updated_at: string;
  }>;
  roles: Array<{
    slug: string;
    platforms: string[];
  }>;
  [key: string]: any;
}

export interface CrmPeopleResponse {
  data: CrmPerson[];
  _meta: {
    page_size: number;
    page_number: number;
    total_elements: number;
    total_pages: number;
    // Legacy fields for compatibility
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  _links: {
    first: string;
    last: string;
    prev?: string;
    next?: string;
  };
}

export interface GetPeopleFilters {
  roles?: string[]; // e.g., ['buyer', 'seller']
  search?: string;
  person_type?: "juridical_person" | "natural_person";
  active?: boolean;
}

export interface GetPeopleOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, "1" | "-1">;
  search?: string;
}