import axios from 'axios';

const API_URL = "https://smart-task-system-production-8b1e.up.railway.app";

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default axiosInstance;