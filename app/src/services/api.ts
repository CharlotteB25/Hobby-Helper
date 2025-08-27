import axios from "axios";
import { getToken } from "./tokenManager";
import Constants from "expo-constants";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_CONNECTION_STRING;

const api = axios.create({
  baseURL: BACKEND_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
// This file sets up an Axios instance with a base URL and an interceptor to add the JWT token to each request.
// This allows you to make authenticated requests to your backend API without having to manually add the token each time.
