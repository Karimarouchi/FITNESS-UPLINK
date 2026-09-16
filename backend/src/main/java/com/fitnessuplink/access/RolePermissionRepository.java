package com.fitnessuplink.access;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {

    List<RolePermission> findByRoleId(UUID roleId);

    @Modifying
    @Query("delete from RolePermission rp where rp.roleId = :roleId")
    void deleteByRoleId(@Param("roleId") UUID roleId);

    @Query("""
            select case when count(rp) > 0 then true else false end
            from RolePermission rp
            join Permission p on p.id = rp.permissionId
            where rp.roleId = :roleId and p.code = :code
            """)
    boolean existsByRoleIdAndCode(@Param("roleId") UUID roleId, @Param("code") String code);

    @Query("""
            select p.code
            from RolePermission rp
            join Permission p on p.id = rp.permissionId
            where rp.roleId = :roleId
            order by p.sortOrder
            """)
    List<String> findCodesByRoleId(@Param("roleId") UUID roleId);
}
