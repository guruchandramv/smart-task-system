# Use a reliable Maven image
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# Copy the backend folder contents correctly
COPY backend/pom.xml .
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Use a stable JRE image for runtime
FROM eclipse-temurin:17-jre-alpine
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]