package com.reelapp.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "pending_approvals")
@Getter
@Setter
@NoArgsConstructor
public class PendingApproval {

    public enum ActionType { EDIT_VIDEO, DELETE_VIDEO }
    public enum Status { PENDING, APPROVED, REJECTED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActionType actionType;

    @ManyToOne(optional = false)
    @JoinColumn(name = "video_id")
    private Video video;

    // JSON-encoded VideoEditRequest for EDIT_VIDEO, unused for DELETE_VIDEO
    @Column(length = 2000)
    private String payload;

    @ManyToOne(optional = false)
    @JoinColumn(name = "requested_by")
    private User requestedBy;

    @ManyToOne
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant reviewedAt;
}
