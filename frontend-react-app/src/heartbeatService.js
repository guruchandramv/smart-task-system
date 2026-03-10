// heartbeatService.js
import axios from 'axios';

let heartbeatInterval = null;
let beforeUnloadHandler = null;
const HEARTBEAT_INTERVAL = 1000; // 1 seconds (ultra-fast)
const HEARTBEAT_TIMEOUT = 1200; // 1.2 second timeout for each heartbeat

export const startHeartbeat = (userId) => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    console.log(`🟢 Starting ULTRA-FAST heartbeat for user ${userId} (every 2 seconds)`);
    
    // Send initial heartbeat immediately
    sendHeartbeat(userId);
    
    // Set up interval for regular heartbeats
    heartbeatInterval = setInterval(() => {
        sendHeartbeat(userId);
    }, HEARTBEAT_INTERVAL);
    
    // Set up beforeunload handler
    beforeUnloadHandler = () => {
        // Use synchronous XHR for guaranteed delivery during unload
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `http://localhost:8081/api/activity/logout?userId=${userId}`, false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({}));
            console.log('🔴 Logout sent via sync XHR on browser close');
        } catch (e) {
            // Fallback to sendBeacon
            const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
            navigator.sendBeacon(`http://localhost:8081/api/activity/logout?userId=${userId}`, blob);
        }
    };
    
    window.addEventListener('beforeunload', beforeUnloadHandler);
    window.addEventListener('pagehide', beforeUnloadHandler);
};

export const stopHeartbeat = () => {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    
    if (beforeUnloadHandler) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
        window.removeEventListener('pagehide', beforeUnloadHandler);
        beforeUnloadHandler = null;
    }
};

const sendHeartbeat = async (userId) => {
    try {
        // Set a timeout to fail fast
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT);
        
        const response = await axios.post(
            `http://localhost:8081/api/activity/heartbeat?userId=${userId}`,
            {},
            { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        console.log(`Heartbeat sent at ${new Date().toLocaleTimeString()}`);
        return response.data;
    } catch (error) {
        // If heartbeat fails, user will be marked offline by server within 5 seconds
        console.log(`Heartbeat failed at ${new Date().toLocaleTimeString()} - will be offline soon`);
        // Don't retry - let the server detect the failure
    }
};

export const logoutUser = async (userId) => {
    try {
        await axios.post(`http://localhost:8081/api/activity/logout?userId=${userId}`);
        console.log('✅ User logged out successfully');
    } catch (error) {
        console.error('Logout failed:', error);
        // Fallback to synchronous XHR
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `http://localhost:8081/api/activity/logout?userId=${userId}`, false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({}));
            console.log('✅ Logout completed via sync XHR');
        } catch (xhrError) {
            console.error('❌ All logout attempts failed:', xhrError);
        }
    } finally {
        stopHeartbeat();
    }
};

// For debugging - check current status
export const checkStatus = async (userId) => {
    try {
        const response = await axios.get(`http://localhost:8081/api/activity/user-status/${userId}`);
        console.log('User status:', response.data);
        return response.data;
    } catch (error) {
        console.error('Status check failed:', error);
    }
};