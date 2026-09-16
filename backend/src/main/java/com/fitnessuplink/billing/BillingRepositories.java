package com.fitnessuplink.billing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface BillingFamilyRepository extends JpaRepository<BillingFamily, UUID> {
}

interface BillingFamilyRoleRepository extends JpaRepository<BillingFamilyRole, BillingFamilyRole.Id> {
    @Query("select r from BillingFamilyRole r where r.id.roleCode = :roleCode")
    Optional<BillingFamilyRole> findFirstByIdRoleCode(@Param("roleCode") String roleCode);
}

interface BillingEntitlementRepository extends JpaRepository<BillingEntitlement, String> {
    List<BillingEntitlement> findAllByOrderBySortOrderAsc();
}

interface BillingPlanRepository extends JpaRepository<BillingPlan, UUID> {
    List<BillingPlan> findByFamilyIdAndActiveTrueOrderBySortOrderAsc(UUID familyId);

    List<BillingPlan> findAllByOrderBySortOrderAsc();
}

interface BillingPlanPriceRepository extends JpaRepository<BillingPlanPrice, UUID> {
    List<BillingPlanPrice> findByPlanId(UUID planId);

    Optional<BillingPlanPrice> findByPlanIdAndCurrencyAndInterval(UUID planId, String currency, String interval);
}

interface BillingPlanEntitlementRepository extends JpaRepository<BillingPlanEntitlement, BillingPlanEntitlement.Id> {
    @Query("select e from BillingPlanEntitlement e where e.id.planId = :planId")
    List<BillingPlanEntitlement> findByIdPlanId(@Param("planId") UUID planId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from BillingPlanEntitlement e where e.id.planId = :planId")
    void deleteByIdPlanId(@Param("planId") UUID planId);
}

interface BillingCountryVatRepository extends JpaRepository<BillingCountryVat, String> {
}

interface BillingTestCardRepository extends JpaRepository<BillingTestCard, UUID> {
    Optional<BillingTestCard> findByPanAndEnabledTrue(String pan);

    Optional<BillingTestCard> findByPan(String pan);

    List<BillingTestCard> findAllByOrderByLabelAsc();
}

interface BillingGrantRepository extends JpaRepository<BillingGrant, BillingGrant.Id> {
    @Query("select (count(g) > 0) from BillingGrant g where g.id.userId = :userId and g.id.entitlementCode = :code")
    boolean existsByIdUserIdAndIdEntitlementCode(@Param("userId") UUID userId, @Param("code") String entitlementCode);

    @Query("select g from BillingGrant g where g.id.userId = :userId")
    List<BillingGrant> findByIdUserId(@Param("userId") UUID userId);
}

interface BillingSubscriptionRepository extends JpaRepository<BillingSubscription, UUID> {
    Optional<BillingSubscription> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    List<BillingSubscription> findAllByOrderByCreatedAtDesc();

    List<BillingSubscription> findByStatusAndTrialEndsAtBefore(SubscriptionStatus status, Instant when);

    List<BillingSubscription> findByStatusAndCurrentPeriodEndBefore(SubscriptionStatus status, Instant when);
}

interface BillingPaymentRepository extends JpaRepository<BillingPayment, UUID> {
    List<BillingPayment> findBySubscriptionIdOrderByCreatedAtDesc(UUID subscriptionId);

    List<BillingPayment> findByStatusOrderByCreatedAtDesc(String status);
}

interface BillingInvoiceRepository extends JpaRepository<BillingInvoice, UUID> {
    List<BillingInvoice> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<BillingInvoice> findByIdAndUserId(UUID id, UUID userId);

    @Query("select count(i) from BillingInvoice i")
    long countAll();
}

interface BillingTransactionLogRepository extends JpaRepository<BillingTransactionLog, UUID> {
    List<BillingTransactionLog> findTop100ByOrderByCreatedAtDesc();
}

interface BillingWebhookEventRepository extends JpaRepository<BillingWebhookEvent, UUID> {
    boolean existsByProviderAndExternalId(String provider, String externalId);
}
