export interface SessionValidatorProps {
  children?: React.ReactNode;
}

export interface SessionValidatorConfig {
  showExpirationToast?: boolean;
  validateOnMount?: boolean;
  throttleTime?: number;
}