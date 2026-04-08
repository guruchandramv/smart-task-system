import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL||'http://localhost:8080';

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // THIS IS CRITICAL
  headers: {
    'Content-Type': 'application/json',
  }
});

export default axiosInstance;