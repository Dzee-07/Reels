package com.reelapp.controller;

import com.reelapp.dto.*;
import com.reelapp.model.User;
import com.reelapp.service.AdminManagementService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ADMIN-only (enforced in SecurityConfig - a SUB_ADMIN token gets 403 here).
 * Managing other admin/sub-admin accounts: create, edit, delete, and
 * password administration. This is deliberately separate from
 * AdminController so the two authorization levels stay easy to reason about.
 */
@RestController
@RequestMapping("/api/admin/admins")
public class AdminUserController {

    private final AdminManagementService adminManagementService;

    public AdminUserController(AdminManagementService adminManagementService) {
        this.adminManagementService = adminManagementService;
    }

    @GetMapping
    public List<AdminUserDto> list() {
        return adminManagementService.listAdminsAndSubAdmins().stream().map(AdminUserDto::from).toList();
    }

    @PostMapping
    public AdminUserDto create(@Valid @RequestBody CreateAdminRequest req, @AuthenticationPrincipal User admin) {
        return AdminUserDto.from(adminManagementService.create(req, admin));
    }

    @PutMapping("/{id}")
    public AdminUserDto edit(@PathVariable Long id, @RequestBody EditAdminRequest req,
                              @AuthenticationPrincipal User admin) {
        return AdminUserDto.from(adminManagementService.edit(id, req, admin));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, @AuthenticationPrincipal User admin) {
        adminManagementService.delete(id, admin);
    }

    @PutMapping("/{id}/password")
    public void setPassword(@PathVariable Long id, @Valid @RequestBody SetPasswordRequest req,
                             @AuthenticationPrincipal User admin) {
        adminManagementService.setPassword(id, req.newPassword(), admin);
    }

    @PostMapping("/{id}/request-password-change")
    public void requestPasswordChange(@PathVariable Long id, @AuthenticationPrincipal User admin) {
        adminManagementService.requestPasswordChange(id, admin);
    }
}
