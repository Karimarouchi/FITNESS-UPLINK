package com.fitnessuplink.talent;

import com.fitnessuplink.talent.dto.CandidateSearchQuery;
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
public class CandidateSearchRepository {

    private final EntityManager entityManager;

    public Page<UUID> search(CandidateSearchQuery query) {
        StringBuilder sql = new StringBuilder("""
                FROM users u
                JOIN roles r ON r.id = u.role_id
                LEFT JOIN countries c ON c.id = u.country_id
                WHERE r.code = 'CANDIDATE'
                  AND u.enabled = TRUE
                  AND u.onboarding_completed = TRUE
                  AND u.profile_visible = TRUE
                  AND u.verification_status = 'verified'
                  AND (u.professional_intent IS NULL OR u.professional_intent IN ('JOB', 'BOTH'))
                """);
        List<Object> params = new ArrayList<>();
        appendEquals(sql, params, "u.country_id", query.countryId());
        appendLikeProfile(sql, params, "city", query.city());
        appendLikeProfile(sql, params, "professional_title", query.title());
        appendLikeProfile(sql, params, "specialties", query.specialty());
        appendLikeProfile(sql, params, "availability", query.availability());
        appendLikeProfile(sql, params, "contract_types", query.contractType());
        appendLikeProfile(sql, params, "spoken_languages", query.language());
        if (Boolean.TRUE.equals(query.relocate())) {
            sql.append(" AND EXISTS (SELECT 1 FROM user_profile_values v WHERE v.user_id = u.id AND v.field_key = 'willing_to_relocate' AND LOWER(v.value) LIKE '%yes%')");
        }
        if (Boolean.TRUE.equals(query.hasDiploma())) {
            sql.append(" AND EXISTS (SELECT 1 FROM user_profile_values v WHERE v.user_id = u.id AND v.field_key = 'diplomas' AND LENGTH(TRIM(v.value)) > 2)");
        }
        if (Boolean.TRUE.equals(query.hasCertification())) {
            sql.append(" AND EXISTS (SELECT 1 FROM user_profile_values v WHERE v.user_id = u.id AND v.field_key = 'certifications' AND LENGTH(TRIM(v.value)) > 2)");
        }
        if (query.q() != null) {
            int start = params.size() + 1;
            sql.append(" AND (LOWER(u.display_name) LIKE LOWER(?")
                    .append(start)
                    .append(") OR LOWER(u.first_name) LIKE LOWER(?")
                    .append(start + 1)
                    .append(") OR LOWER(u.last_name) LIKE LOWER(?")
                    .append(start + 2)
                    .append(") OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?")
                    .append(start + 3)
                    .append(") OR EXISTS (SELECT 1 FROM user_profile_values v WHERE v.user_id = u.id AND v.field_key IN ('city', 'professional_title', 'specialties') AND LOWER(v.value) LIKE LOWER(?")
                    .append(start + 4)
                    .append(")))");
            String like = "%" + query.q() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
            params.add(like);
        }

        String order = " ORDER BY u.created_at DESC";
        List<Object> listParams = new ArrayList<>(params);
        if ("relevance".equals(query.sort()) && query.q() != null) {
            int n = listParams.size() + 1;
            order = " ORDER BY CASE WHEN LOWER(u.display_name) LIKE LOWER(?" + n + ") THEN 0 ELSE 1 END, u.created_at DESC";
            listParams.add(query.q() + "%");
        }

        Query countQuery = entityManager.createNativeQuery("SELECT COUNT(u.id) " + sql);
        bind(countQuery, params);
        long total = ((Number) countQuery.getSingleResult()).longValue();

        Query listQuery = entityManager.createNativeQuery("SELECT u.id " + sql + order);
        bind(listQuery, listParams);
        listQuery.setFirstResult(query.page() * query.size());
        listQuery.setMaxResults(query.size());
        @SuppressWarnings("unchecked")
        List<Object> rows = listQuery.getResultList();
        List<UUID> ids = rows.stream().map(this::asUuid).toList();
        return new PageImpl<>(ids, PageRequest.of(query.page(), query.size()), total);
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
