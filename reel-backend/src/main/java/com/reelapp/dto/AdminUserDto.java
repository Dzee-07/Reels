package com.reelapp.dto;

import com.reelapp.model.User;

import java.time.Instant;

public record AdminUserDto(
        Long id,
        String email,
        String displayName,
        String role,
        Boolean mustChangePassword,
        Instant createdAt
) {
    public static AdminUserDto from(User u) {
        return new AdminUserDto(u.getId(), u.getEmail(), u.getDisplayName(), u.getRole().name(),
                u.getMustChangePassword(), u.getCreatedAt());
    }
}
