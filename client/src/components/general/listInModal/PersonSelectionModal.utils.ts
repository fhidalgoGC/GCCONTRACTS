import { type CrmPerson, getSellers, getBuyers, getContactVendors, getTraders } from '@/services/crm-people/crm-people.service';
import { PersonType, PersonTexts } from './PersonSelectionModal.types';

export const getServiceFunction = (personType: PersonType) => {
  switch (personType) {
    case 'sellers':
      return getSellers;
    case 'buyers':
      return getBuyers;
    case 'contactVendors':
      return getContactVendors;
    case 'traders':
      return getTraders;
    default:
      return getSellers;
  }
};

export const getDefaultTexts = (personType: PersonType, contractType: "purchase" | "sale" = "purchase", t: any): PersonTexts => {
  switch (personType) {
    case 'sellers':
      return {
        triggerText: contractType === "sale" ? t('selectBuyer') : t('selectSeller'),
        modalTitle: contractType === "sale" ? t('selectBuyer') : t('selectSeller'),
        searchPlaceholder: contractType === "sale" ? t('searchBuyers') : t('searchSellers'),
        noDataMessage: contractType === "sale" ? t('noBuyersFound') : t('noSellersFound'),
        loadingMessage: contractType === "sale" ? t('loadingBuyers') : t('loadingSellers'),
        searchingMessage: contractType === "sale" ? t('searchingBuyers') : t('searchingSellers'),
      };
    case 'buyers':
      return {
        triggerText: t('selectBuyer'),
        modalTitle: t('selectBuyer'),
        searchPlaceholder: t('searchBuyers'),
        noDataMessage: t('noBuyersFound'),
        loadingMessage: t('loadingBuyers'),
        searchingMessage: t('searchingBuyers'),
      };
    case 'contactVendors':
      return {
        triggerText: t('selectContactVendor'),
        modalTitle: t('selectContactVendor'),
        searchPlaceholder: t('searchContactVendors'),
        noDataMessage: t('noContactVendorsFound'),
        loadingMessage: t('loadingContactVendors'),
        searchingMessage: t('searchingContactVendors'),
      };
    case 'traders':
      return {
        triggerText: t('selectTrader'),
        modalTitle: t('selectTrader'),
        searchPlaceholder: t('searchTraders'),
        noDataMessage: t('noTradersFound'),
        loadingMessage: t('loadingTraders'),
        searchingMessage: t('searchingTraders'),
      };
    default:
      return {
        triggerText: t('selectSeller'),
        modalTitle: t('selectSeller'),
        searchPlaceholder: t('searchSellers'),
        noDataMessage: t('noSellersFound'),
        loadingMessage: t('loadingSellers'),
        searchingMessage: t('searchingSellers'),
      };
  }
};

export const getDisplayName = (person: CrmPerson, t: any) => {
  return person.full_name || person.name || t('noName');
};

export const getOrganizationName = (person: CrmPerson) => {
  return person.organization_name || person.company_name || '';
};

export const getPrimaryEmail = (person: CrmPerson) => {
  if (person.emails?.length) {
    const principalEmail = person.emails.find(e => e.type === 'principal');
    return principalEmail?.value || person.emails[0].value;
  }
  return person.email || '';
};

export const getPersonType = (person: CrmPerson) => {
  return person.person_type || 'natural_person';
};