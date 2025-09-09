/**
 * API Interceptors para manejo centralizado de autenticación
 */

export interface InterceptorOptions {
  excludeAuth?: boolean; // Si true, no agregar headers de autenticación
  customHeaders?: Record<string, string>; // Headers adicionales personalizados
}

/**
 * Función standalone para logout automático (sin hooks)
 * Se ejecuta cuando se recibe un 401 desde el interceptor
 * Emite un evento personalizado para que los componentes de React manejen la redirección
 */
export const performAutoLogout = () => {
  console.log(
    "🔐 AUTO-LOGOUT: Sesión expirada (401), realizando logout automático...",
  );

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

  // Notificar a otras pestañas sobre el logout
  try {
    const channel = new BroadcastChannel("session_sync");
    channel.postMessage({ type: "AUTO_LOGOUT", timestamp: Date.now() });
    channel.close();
    console.log("📡 AUTO-LOGOUT: Logout notificado a otras pestañas");
  } catch (error) {
    console.log("📻 AUTO-LOGOUT: No se pudo notificar a otros tabs:", error);
  }

  // Emitir evento personalizado para que los componentes React manejen la redirección con Wouter
  const autoLogoutEvent = new CustomEvent("autoLogout", {
    detail: { reason: "unauthorized", timestamp: Date.now() },
  });
  window.dispatchEvent(autoLogoutEvent);
  console.log("🔄 AUTO-LOGOUT: Evento emitido para redirección con Wouter");
};

/**
 * Interceptor que agrega JWT token y partition key automáticamente
 * a las peticiones HTTP, excepto para endpoints específicos que no los necesitan
 */

export const addJwtPk = (
  url: string,
  options: RequestInit & InterceptorOptions = {},
): RequestInit => {
  const { excludeAuth = false, customHeaders = {}, ...fetchOptions } = options;

  // Lista de endpoints que NO deben usar autenticación JWT
  const excludedEndpoints = [
    "/oauth/token", // Auth0 token endpoint
  ];

  // Verificar si el URL debe ser excluido de autenticación
  const shouldExcludeAuth =
    excludeAuth || excludedEndpoints.some((endpoint) => url.includes(endpoint));

  // Preparar headers base
  const headers = new Headers(fetchOptions.headers);

  // Agregar headers personalizados
  Object.entries(customHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Solo agregar autenticación si no está excluida
  if (!shouldExcludeAuth) {
    // Obtener tokens del localStorage
    const jwt = localStorage.getItem("jwt") || localStorage.getItem("id_token");
    const partitionKey = localStorage.getItem("partition_key");

    // Agregar JWT token si está disponible
    if (jwt) {
      headers.set("authorization", `Bearer ${jwt}`);
    }

    // Agregar partition key si está disponible
    if (partitionKey) {
      headers.set("_partitionkey", partitionKey);
      headers.set("bt-organization", partitionKey);
      headers.set("bt-uid", partitionKey);
      headers.set("organization_id", partitionKey);
      headers.set("pk-organization", partitionKey);
      headers.set("Content-Type", "application/json");
    }
  }

  return {
    ...fetchOptions,
    headers,
  };
};

/**
 * Wrapper de fetch que aplica automáticamente el interceptor addJwtPk,
 * agrega created_by_id y created_by_name para métodos PUT y POST,
 * y maneja automáticamente errores 401 (Unauthorized)
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit & InterceptorOptions = {},
): Promise<Response> => {
  const { excludeAuth = false, ...fetchOptions } = options;

  // Lista de endpoints que NO deben usar autenticación JWT (excluidos)
  const excludedEndpoints = [
    "/oauth/token", // Auth0 token endpoint
  ];

  // Verificar si el URL debe ser excluido
  const shouldExcludeAuth =
    excludeAuth || excludedEndpoints.some((endpoint) => url.includes(endpoint));

  let modifiedOptions = addJwtPk(url, options);

  // Solo agregar created_by para métodos PUT/POST en endpoints no excluidos
  if (
    !shouldExcludeAuth &&
    (fetchOptions.method === "PUT" || fetchOptions.method === "POST")
  ) {
    try {
      // Obtener datos del usuario del localStorage
      const createdById = localStorage.getItem("user_id") || "";
      const createdByName = localStorage.getItem("user_name") || "";

      // Si hay un body existente, parsearlo y agregar los campos
      if (modifiedOptions.body) {
        let bodyData: any = {};

        // Intentar parsear el body si es string
        if (typeof modifiedOptions.body === "string") {
          try {
            bodyData = JSON.parse(modifiedOptions.body);
          } catch (e) {
            // Si no se puede parsear, crear objeto nuevo
            bodyData = {};
          }
        }

        // Agregar created_by_id y created_by_name al body
        bodyData.created_by_id = createdById;
        bodyData.created_by_name = createdByName;

        // Agregar registered_by_id y registered_by_name al body
        bodyData.registered_by_id = createdById;
        bodyData.registered_by_name = createdByName;

        // Convertir de vuelta a string
        modifiedOptions.body = JSON.stringify(bodyData);

        // Asegurar Content-Type para JSON
        const headers = new Headers(modifiedOptions.headers);
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
        modifiedOptions.headers = headers;
      }
    } catch (error) {
      console.warn("⚠️ Error adding created_by fields:", error);
    }
  }

  // Realizar la petición
  const response = await fetch(url, modifiedOptions);

  // Interceptar respuestas 401 (Unauthorized) para logout automático
  if (response.status === 401 && !shouldExcludeAuth) {
    console.error("🚫 UNAUTHORIZED: Recibido 401 desde", url);

    // Ejecutar logout automático de forma async para no bloquear
    setTimeout(() => {
      performAutoLogout();
    }, 100);

    // Retornar la respuesta original para que el código cliente pueda manejarla
    return response;
  }

  return response;
};

/**
 * Fetch sin autenticación para endpoints públicos
 */
export const publicFetch = (
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  return fetch(url, { excludeAuth: true, ...options } as RequestInit &
    InterceptorOptions);
};


export default {
  addJwtPk,
  authenticatedFetch,
  publicFetch,
};
