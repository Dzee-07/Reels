package com.reelapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record VideoUploadRequest(
        @NotBlank String title,
        String description,
        String tags,
        @NotNull Integer durationSeconds,
        Boolean isPremium
) {}
