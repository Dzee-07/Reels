package com.reelapp.dto;

import com.reelapp.model.PendingApproval;

import java.time.Instant;

public record PendingApprovalDto(
        Long id,
        String actionType,
        Long videoId,
        String videoTitle,
        String payload,
        String requestedByName,
        String status,
        Instant createdAt
) {
    public static PendingApprovalDto from(PendingApproval p) {
        return new PendingApprovalDto(
                p.getId(),
                p.getActionType().name(),
                p.getVideo().getId(),
                p.getVideo().getTitle(),
                p.getPayload(),
                p.getRequestedBy().getDisplayName(),
                p.getStatus().name(),
                p.getCreatedAt()
        );
    }
}
