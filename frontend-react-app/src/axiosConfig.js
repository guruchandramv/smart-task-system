import axios from 'axios';

export const API_URL = "https://smart-task-system-wz0k.onrender.com";
// export const API_URL = "http://localhost:8080";

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default axiosInstance;