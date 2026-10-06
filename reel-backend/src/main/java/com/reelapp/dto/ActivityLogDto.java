package com.reelapp.dto;

import com.reelapp.model.ActivityLog;

import java.time.Instant;

public record ActivityLogDto(
        Long id,
        String userDisplayName,
        String action,
        String description,
        Instant createdAt
) {
    public static ActivityLogDto from(ActivityLog log) {
        return new ActivityLogDto(
                log.getId(),
                log.getUser() != null ? log.getUser().getDisplayName() : "System",
                log.getAction().name(),
                log.getDescription(),
                log.getCreatedAt()
        );
    }
}
