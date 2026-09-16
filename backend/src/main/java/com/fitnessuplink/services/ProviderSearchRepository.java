package com.fitnessuplink.services;

import com.fitnessuplink.services.dto.ProviderSearchQuery;
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
public class ProviderSearchRepository {

    private final EntityManager entityManager;

    public Page<UUID> search(ProviderSearchQuery query) {
        StringBuilder sql = new StringBuilder("""
                FROM users u
                JOIN roles r ON r.id = u.role_id
                LEFT JOIN countries c ON c.id = u.country_id
                WHERE r.code = 'SERVICE_PROVIDER'
                  AND u.enabled = TRUE
                  AND u.onboarding_completed = TRUE
                  AND u.profile_visible = TRUE
                """);
        List<Object> params = new ArrayList<>();
        if (query.countryId() != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM user_profile_values v WHERE v.user_id = u.id AND v.field_key = 'org_country' AND v.value = ?")
                    .append(params.size() + 1).append(")");
            params.add(query.countryId().toString());
        }
        if (query.categoryId() != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM provider_services ps WHERE ps.provider_id = u.id AND ps.active = TRUE AND ps.category_id = ?")
                    .append(params.size() + 1).append(")");
            params.add(query.categoryId());
        }
        if (query.q() != null) {
            int start = params.size() + 1;
            sql.append(" AND (LOWER(u.display_name) LIKE LOWER(?").append(start)
                    .append(") OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?").append(start + 1)
                    .append(") OR EXISTS (SELECT 1 FROM user_profile_values v WHERE v.user_id = u.id AND v.field_key IN ('trade_name', 'legal_name', 'organization_description', 'org_city') AND LOWER(v.value) LIKE LOWER(?").append(start + 2)
                    .append(")))");
            String like = "%" + query.q() + "%";
            params.add(like);
            params.add(like);
            params.add(like);
        }

        Query countQuery = entityManager.createNativeQuery("SELECT COUNT(DISTINCT u.id) " + sql);
        bind(countQuery, params);
        long total = ((Number) countQuery.getSingleResult()).longValue();

        Query listQuery = entityManager.createNativeQuery("SELECT DISTINCT u.id, u.created_at " + sql + " ORDER BY u.created_at DESC");
        bind(listQuery, params);
        listQuery.setFirstResult(query.page() * query.size());
        listQuery.setMaxResults(query.size());
        @SuppressWarnings("unchecked")
        List<Object[]> rows = listQuery.getResultList();
        List<UUID> ids = rows.stream().map(row -> asUuid(row[0])).toList();
        return new PageImpl<>(ids, PageRequest.of(query.page(), query.size()), total);
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
