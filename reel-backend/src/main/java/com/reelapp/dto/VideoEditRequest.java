package com.reelapp.dto;

public record VideoEditRequest(
        String title,
        String description,
        String tags,
        Boolean isPremium
) {}
