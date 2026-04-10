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
        env.put("SPRING_DATASOURCE_URL", System.getenv("SPRING_DATASOURCE_URL"));
        env.put("SPRING_DATASOURCE_USERNAME", System.getenv("SPRING_DATASOURCE_USERNAME"));
        env.put("SPRING_DATASOURCE_PASSWORD", System.getenv("SPRING_DATASOURCE_PASSWORD") != null ? "YES" : "NO");
        env.put("PORT", System.getenv("PORT"));
        // env.put("WORKING_DIR", System.getProperty("user.dir"));
        return env;
    }

    @GetMapping("/test-db-simple")
    public String testDbSimple() {
        try {
            Class.forName("org.postgresql.Driver");
            String url = System.getenv("SPRING_DATASOURCE_URL");
            String user = System.getenv("SPRING_DATASOURCE_USERNAME");
            String pass = System.getenv("SPRING_DATASOURCE_PASSWORD");
            System.out.println("Attempting to connect to: " + url);
            Connection conn = DriverManager.getConnection(url, user, pass);
            conn.close();
            return "✅ Connected successfully! URL: " + url;
        } catch (Exception e) {
            e.printStackTrace();
            return "❌ Failed: " + e.getMessage() + " - URL: " + System.getenv("DB_URL");
        }
    }
}