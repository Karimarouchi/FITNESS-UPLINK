# syntax=docker/dockerfile:1

# ---- Build stage: compile the jar inside Docker (no Java needed on the host) ----
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -B -DskipTests package

# ---- Runtime stage ----
FROM eclipse-temurin:25-jre-alpine
RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app /data/uploads \
    && chown -R app:app /app /data
WORKDIR /app
COPY --from=build --chown=app:app /build/target/fitness-uplink-api-0.0.1-SNAPSHOT.jar app.jar
USER app
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=8 \
    CMD wget -qO- http://127.0.0.1:8080/api/v1/health >/dev/null || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
