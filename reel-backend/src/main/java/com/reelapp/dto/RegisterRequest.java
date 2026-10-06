package com.reelapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email @NotBlank String email,
        @NotBlank String displayName,
        @Size(min = 8, message = "Password must be at least 8 characters") String password
) {}
