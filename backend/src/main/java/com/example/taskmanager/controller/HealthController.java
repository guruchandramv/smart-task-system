package com.example.taskmanager.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {
    
    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("timestamp", String.valueOf(System.currentTimeMillis()));
        return status;
    }
    
    @GetMapping("/debug-env")
    public Map<String, String> debugEnv() {
        Map<String, String> env = new HashMap<>();
        env.put("DB_URL", System.getenv("DB_URL"));
        env.put("DB_USERNAME", System.getenv("DB_USERNAME"));
        env.put("DB_PASSWORD_SET", System.getenv("DB_PASSWORD") != null ? "YES" : "NO");
        env.put("PORT", System.getenv("PORT"));
        env.put("WORKING_DIR", System.getProperty("user.dir"));
        return env;
    }
    
    @GetMapping("/test-db-simple")
    public String testDbSimple() {
        try {
            Class.forName("org.postgresql.Driver");
            String url = System.getenv("DB_URL");
            String user = System.getenv("DB_USERNAME");
            String pass = System.getenv("DB_PASSWORD");
            
            // Log the URL (without password) for debugging
            System.out.println("Attempting to connect to: " + url);
            System.out.println("Username: " + user);
            
            Connection conn = DriverManager.getConnection(url, user, pass);
            conn.close();
            return "✅ Connected successfully! URL: " + url;
        } catch (Exception e) {
            e.printStackTrace();
            return "❌ Failed: " + e.getMessage() + " - URL: " + System.getenv("DB_URL");
        }
    }
}