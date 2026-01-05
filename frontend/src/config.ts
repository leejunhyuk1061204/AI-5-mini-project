export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://unmouldable-postcerebellar-karleen.ngrok-free.dev';
export const API_URL = `${API_BASE_URL}/api`;
export const JAVA_WS_URL = API_BASE_URL.replace(/^http/, 'ws');
