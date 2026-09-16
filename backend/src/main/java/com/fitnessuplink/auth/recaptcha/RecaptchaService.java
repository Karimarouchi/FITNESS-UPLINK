package com.fitnessuplink.auth.recaptcha;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitnessuplink.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecaptchaService {

    private static final String VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
    static final String REJECTED = "reCAPTCHA verification failed";

    private final RecaptchaProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public void verify(String token, String expectedAction) {
        if (!properties.enabled()) {
            return;
        }
        if (token == null || token.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, REJECTED);
        }
        try {
            String body = "secret=" + URLEncoder.encode(properties.secret().trim(), StandardCharsets.UTF_8)
                    + "&response=" + URLEncoder.encode(token.trim(), StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create(VERIFY_URL))
                    .timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());
            accept(json, expectedAction);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("reCAPTCHA verify request failed", ex);
            throw new ApiException(HttpStatus.BAD_REQUEST, REJECTED);
        }
    }

    void accept(JsonNode json, String expectedAction) {
        boolean success = json.path("success").asBoolean(false);
        double score = json.path("score").asDouble(0);
        String action = json.path("action").asText("");
        if (!success || score < properties.minScore() || !expectedAction.equals(action)) {
            log.warn("reCAPTCHA rejected success={} score={} action={}", success, score, action);
            throw new ApiException(HttpStatus.BAD_REQUEST, REJECTED);
        }
    }
}
