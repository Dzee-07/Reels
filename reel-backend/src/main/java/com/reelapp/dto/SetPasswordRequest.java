package com.reelapp.dto;

import jakarta.validation.constraints.Size;

public record SetPasswordRequest(
        @Size(min = 8, message = "Password must be at least 8 characters") String newPassword
) {}
