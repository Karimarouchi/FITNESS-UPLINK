package com.fitnessuplink.talent;

import com.fitnessuplink.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class HireAbuseGuard {

    private static final int MESSAGE_LIMIT = 40;
    private static final int CONTACT_LIMIT = 25;
    private static final int REPORT_LIMIT = 8;
    private static final long HOUR = 3600;
    private static final long DAY = 24 * 3600;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public void checkMessage(UUID userId) {
        check("msg:" + userId, MESSAGE_LIMIT, HOUR, "Trop de messages. Réessayez plus tard.");
    }

    public void checkContact(UUID userId) {
        check("contact:" + userId, CONTACT_LIMIT, DAY, "Trop de contacts aujourd’hui. Réessayez demain.");
    }

    public void checkReport(UUID userId) {
        check("report:" + userId, REPORT_LIMIT, DAY, "Trop de signalements aujourd’hui.");
    }

    private void check(String key, int limit, long windowSeconds, String message) {
        Window next = windows.compute(key, (ignored, current) -> {
            long now = Instant.now().getEpochSecond();
            if (current == null || now - current.start >= windowSeconds) {
                return new Window(now, 1);
            }
            return new Window(current.start, current.count + 1);
        });
        if (next.count > limit) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, message);
        }
    }

    private record Window(long start, int count) {
    }
}
