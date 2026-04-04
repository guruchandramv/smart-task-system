package com.example.taskmanager.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // Use BCrypt for password encoding
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()  // Disable CSRF for simplicity during development
            .cors().and()      // Ensure CORS is enabled
            .authorizeRequests()
            .antMatchers("/api/auth/**").permitAll()  // Allow access to auth endpoints
            .antMatchers("/api/home-tasks").permitAll()  // Allow access to /api/home-tasks
            .antMatchers("/api/home-users").permitAll()  // Allow access to /api/home-users
            .anyRequest().permitAll()  // Allow all other requests without authentication
            .and()
            .formLogin().disable()  // Disable form login for simplicity
            .httpBasic().disable();  // Disable basic HTTP authentication for simplicity

        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration =
                new org.springframework.web.cors.CorsConfiguration();

        configuration.setAllowedOrigins(java.util.Arrays.asList("http://localhost:3000","https://smart-task-system-frontend.netlify.app" ));  // Frontend domain
        
        configuration.setAllowedMethods(java.util.Arrays.asList("GET", "POST", "PUT", "DELETE"));  // Allowed methods
        configuration.setAllowedHeaders(java.util.Arrays.asList("*"));  // Allow all headers
        configuration.setAllowCredentials(true);  // Allow credentials (cookies)

        org.springframework.web.cors.UrlBasedCorsConfigurationSource source =
                new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        
        source.registerCorsConfiguration("/**", configuration);  // Apply CORS to all routes

        return source;
    }
}