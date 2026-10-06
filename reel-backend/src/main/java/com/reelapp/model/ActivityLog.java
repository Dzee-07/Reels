package com.reelapp.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "activity_logs", indexes = {
        @Index(name = "idx_activity_created_at", columnList = "createdAt")
})
@Getter
@Setter
@NoArgsConstructor
public class ActivityLog {

    public enum Action {
        LOGIN, REGISTER,
        VIDEO_UPLOAD, VIDEO_EDIT, VIDEO_DELETE, VIDEO_REORDER,
        FAVORITE_ADD, FAVORITE_REMOVE,
        RATING_SET,
        SUBSCRIBE, UNSUBSCRIBE,
        PROFILE_UPDATE, PASSWORD_CHANGE,
        ADMIN_CREATE, ADMIN_EDIT, ADMIN_DELETE, ADMIN_PASSWORD_RESET, ADMIN_PASSWORD_CHANGE_REQUESTED,
        APPROVAL_REQUESTED, APPROVAL_APPROVED, APPROVAL_REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // who did it - null only for rare system-level events
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Action action;

    // human-readable detail, e.g. "Rated 'Ocean Documentary' 5 stars" or "Deleted video #42"
    @Column(length = 500)
    private String description;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
