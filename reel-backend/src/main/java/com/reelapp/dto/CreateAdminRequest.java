package com.reelapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateAdminRequest(
        @Email @NotBlank String email,
        @NotBlank String displayName,
        @Size(min = 8, message = "Password must be at least 8 characters") String temporaryPassword,
        // "ADMIN" or "SUB_ADMIN" - creating another ADMIN is intentionally allowed only
        // by an existing ADMIN, enforced in the controller/service, not by this DTO
        @Pattern(regexp = "ADMIN|SUB_ADMIN") String role
) {}
