package com.reelapp.dto;

import jakarta.validation.constraints.Pattern;

public record EditAdminRequest(
        String displayName,
        @Pattern(regexp = "ADMIN|SUB_ADMIN") String role
) {}
