export const environment = {
  // API Config
  API_LIMIT: Number(import.meta.env.VITE_API_LIMIT) || 100,

  // Base URLs
  CRM_BASE_URL:
    import.meta.env.VITE_URL_CRM ||
    "https://crm-develop.grainchain.io/api/v1",

  TRM_BASE_URL:
    import.meta.env.VITE_TRM_BASE_URL ||
    "https://trm-develop.grainchain.io/api/v1",

  IDENTITY_BASE_URL:
    import.meta.env.VITE_URL_IDENTITY ||
    "https://un4grlwfx2.execute-api.us-west-2.amazonaws.com/dev",

  UNIT_CONVERSIONS_ENDPOINT: "/unit-conversions/units",

  CRAFTMYPDF_BASE_URL:
    import.meta.env.VITE_CRAFTMYPDF_BASE_URL || "https://api.craftmypdf.com/v1",

  SSM_BASE_URL:
    import.meta.env.VITE_SSM_BASE_URL ||
    "https://ssm-develop.grainchain.io/silosys-service/api/v1",

  // Origins for CORS
  CONTRACTS_ORIGIN:
    import.meta.env.VITE_CONTRACTS_ORIGIN ||
    "https://contracts-develop.grainchain.io",

  // Auth0 Config
  AUTH0_URL:
    import.meta.env.VITE_AUTH0_URL ||
    "https://grainchaindev.auth0.com/oauth/token",

  AUTH0_AUDIENCE:
    import.meta.env.VITE_AUTH0_AUDIENCE ||
    "https://grainchaindev.auth0.com/userinfo",

  AUTH0_GRANT_TYPE:
    import.meta.env.VITE_AUTH0_GRANT_TYPE ||
    "http://auth0.com/oauth/grant-type/password-realm",

  AUTH0_REALM:
    import.meta.env.VITE_AUTH0_REALM || "Username-Password-Authentication",

  AUTH0_CLIENT_ID:
    import.meta.env.VITE_AUTH0_CLIENT_ID || "f9jw9xsL2Sje2LwHsEZSxnpMupH0QiNJ",

  AUTH0_SCOPE: import.meta.env.VITE_AUTH0_SCOPE || "openid offline_access",

  // Currency
  DEFAULT_CURRENCY: import.meta.env.VITE_DEFAULT_CURRENCY || "usd",

  // CraftMyPDF Config
  TEMPLATE_ID: import.meta.env.VITE_TEMPLATE_ID || "5e177b2393797a28",

  CRAFTMYPDF_API_KEY:
    import.meta.env.VITE_CRAFTMYPDF_API_KEY ||
    "3364MTI3MTk6MTI3NzI6TDMwNjZMaG9odGhNMFg1bA=",

  // Number Formatting
  NUMBER_FORMAT_PATTERN:
    import.meta.env.VITE_NUMBER_FORMAT_PATTERN || ("0,000.00" as const),

  NUMBER_ROUND_MODE:
    import.meta.env.VITE_NUMBER_ROUND_MODE || ("truncate" as const),

  NUMBER_LOCATE: import.meta.env.VITE_NUMBER_LOCATE || "en-US",

  NUMBER_MIN_DECIMALS: Number(import.meta.env.VITE_NUMBER_MIN_DECIMALS) || 2,

  NUMBER_MAX_DECIMALS: Number(import.meta.env.VITE_NUMBER_MAX_DECIMALS) || 4,

  // Price Thresholds
  PRICE_THRESHOLD_MIN: Number(import.meta.env.VITE_PRICE_THRESHOLD_MIN) || 0,

  PRICE_THRESHOLD_MAX: Number(import.meta.env.VITE_PRICE_THRESHOLD_MAX) || 0,

  SHOW_THRESHOLDS: import.meta.env.VITE_SHOW_THRESHOLDS === "true" || false,
};

export const APP_CONFIG = environment;

// Number format configuration
export const NUMBER_FORMAT_CONFIG = {
  locale: "en-US",
  formatPattern: "0,000.00" as const,
  roundMode: "truncate" as const,
  minDecimals: 2,
  maxDecimals: 4,
};

// Currency options
export const CURRENCY_OPTIONS = [
  { key: "usd", value: "USD", label: "USD" },
  { key: "mxn", value: "MXN", label: "MXN" },
];

// Pricing type options
export const PRICING_TYPE_OPTIONS = [
  { key: "fixed", value: "fixed", label: "Fixed" },
  { key: "basis", value: "basis", label: "Basis" },
];
