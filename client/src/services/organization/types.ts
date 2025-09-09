export interface Organization {
  _id: string;
  name: string;
  description?: string;
  type?: string;
  logo?: string;
  initials?: string;
}

export interface OrganizationOption {
  key: string;
  value: string;
  label: string;
  organization: Organization;
}