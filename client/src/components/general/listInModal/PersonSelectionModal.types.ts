export type PersonType = 'sellers' | 'buyers' | 'contactVendors' | 'traders';

export interface PersonSelectionModalProps {
  onSelect: (person: { id: string; name: string; [key: string]: any }) => void;
  selectedPersonId?: string;
  selectedPersonName?: string;
  personType: PersonType;
  error?: boolean;
  triggerButtonText?: string;
  modalTitle?: string;
  searchPlaceholder?: string;
  noDataMessage?: string;
  contractType?: "purchase" | "sale";
}

export interface PersonTexts {
  triggerText: string;
  modalTitle: string;
  searchPlaceholder: string;
  noDataMessage: string;
  loadingMessage: string;
  searchingMessage: string;
}