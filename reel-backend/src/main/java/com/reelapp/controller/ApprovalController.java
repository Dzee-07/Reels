package com.reelapp.controller;

import com.reelapp.dto.PendingApprovalDto;
import com.reelapp.model.User;
import com.reelapp.service.ApprovalService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** ADMIN-only (see SecurityConfig) - reviewing sub-admin edit/delete requests. */
@RestController
@RequestMapping("/api/admin/approvals")
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    @GetMapping
    public List<PendingApprovalDto> pending() {
        return approvalService.pending().stream().map(PendingApprovalDto::from).toList();
    }

    @PostMapping("/{id}/approve")
    public void approve(@PathVariable Long id, @AuthenticationPrincipal User admin) {
        approvalService.approve(id, admin);
    }

    @PostMapping("/{id}/reject")
    public void reject(@PathVariable Long id, @AuthenticationPrincipal User admin) {
        approvalService.reject(id, admin);
    }
}
