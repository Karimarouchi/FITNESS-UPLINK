package com.fitnessuplink.coaching;

import com.fitnessuplink.coaching.dto.CoachSearchQuery;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class CoachSearchRepository {

    private final EntityManager entityManager;

    public Page<UUID> search(CoachSearchQuery query) {
        StringBuilder sql = new StringBuilder("""
                FROM users u
                JOIN roles r ON r.id = u.role_id
                LEFT JOIN countries c ON c.id = u.country_id
                LEFT JOIN (
                    SELECT coach_id, AVG(rating) AS avg_rating
                    FROM coaching_reviews
                    GROUP BY coach_id
                ) rv ON rv.coach_id = u.id
                WHERE r.code = 'CANDIDATE'
                  AND u.enabled = TRUE
                  AND u.onboarding_completed = TRUE
                  AND u.profile_visible = TRUE
                  AND u.professional_intent IN ('COACHING', 'BOTH')
                """);
        List<Object> params = new ArrayList<>();
        appendEquals(sql, params, "u.country_id", query.countryId());
        appendLikeProfile(sql, params, "city", query.city());
        appendLikeProfile(sql, params, "specialties", query.specialty());
        if (query.q() != null) {
            int start = params.size() + 1;
            sql.append(" AND (LOWER(u.display_name) LIKE LOWER(?")
                    .append(start)
                    .append(") OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?")
                    .append(start + 1)
                    .append(") OR EXISTS (SELECT 1 FROM user_profile_values v WHERE v.user_id = u.id AND v.field_key IN ('city', 'professional_title', 'specialties') AND LOWER(v.value) LIKE LOWER(?")
                    .append(start + 2)
                    .append(")))");
            String like = "%" + query.q() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }

        String order = switch (query.sort()) {
            case "rating" -> " ORDER BY rv.avg_rating DESC NULLS LAST, u.created_at DESC";
            case "name" -> " ORDER BY u.display_name ASC";
            default -> " ORDER BY u.created_at DESC";
        };

        Query countQuery = entityManager.createNativeQuery("SELECT COUNT(u.id) " + sql);
        bind(countQuery, params);
        long total = ((Number) countQuery.getSingleResult()).longValue();

        Query listQuery = entityManager.createNativeQuery("SELECT u.id " + sql + order);
        bind(listQuery, params);
        listQuery.setFirstResult(query.page() * query.size());
        listQuery.setMaxResults(query.size());
        @SuppressWarnings("unchecked")
        List<Object> rows = listQuery.getResultList();
        List<UUID> ids = rows.stream().map(this::asUuid).toList();
        return new PageImpl<>(ids, PageRequest.of(query.page(), query.size()), total);
    }

    public List<UUID> topRated(int limit) {
        Query query = entityManager.createNativeQuery("""
                SELECT u.id
                FROM users u
                JOIN roles r ON r.id = u.role_id
                JOIN (
                    SELECT coach_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
                    FROM coaching_reviews
                    GROUP BY coach_id
                    HAVING COUNT(*) >= 1
                ) rv ON rv.coach_id = u.id
                WHERE r.code = 'CANDIDATE'
                  AND u.enabled = TRUE
                  AND u.onboarding_completed = TRUE
                  AND u.profile_visible = TRUE
                  AND u.professional_intent IN ('COACHING', 'BOTH')
                ORDER BY rv.avg_rating DESC, rv.review_count DESC, u.created_at DESC
                """);
        query.setMaxResults(limit);
        @SuppressWarnings("unchecked")
        List<Object> rows = query.getResultList();
        return rows.stream().map(this::asUuid).toList();
    }

    private void appendEquals(StringBuilder sql, List<Object> params, String column, Object value) {
        if (value == null) {
            return;
        }
        int n = params.size() + 1;
        sql.append(" AND ").append(column).append(" = ?").append(n);
        params.add(value);
    }

    private void appendLikeProfile(StringBuilder sql, List<Object> params, String fieldKey, String value) {
        if (value == null) {
            return;
        }
        int n = params.size() + 1;
        sql.append(" AND EXISTS (SELECT 1 FROM user_profile_values v WHERE v.user_id = u.id AND v.field_key = '")
                .append(fieldKey)
                .append("' AND LOWER(v.value) LIKE LOWER(?")
                .append(n)
                .append("))");
        params.add("%" + value + "%");
    }

    private void bind(Query query, List<Object> params) {
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }
    }

    private UUID asUuid(Object value) {
        if (value instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(String.valueOf(value));
    }
}
