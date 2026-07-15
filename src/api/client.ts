import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_TIMEOUT = 30_000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Future: attach access token from storage
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Future: handle token refresh
      }

      if (status === 403) {
        // Future: handle forbidden
      }
    }

    if (error.code === "ECONNABORTED") {
      // Request timeout
    }

    return Promise.reject(error);
  },
);
