package com.reelapp.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "videos", indexes = {
        @Index(name = "idx_video_title", columnList = "title")
})
@Getter
@Setter
@NoArgsConstructor
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    // comma-separated tags, e.g. "anime,naruto,action" - used for search + recommendations
    @Column(length = 500)
    private String tags;

    @Column(nullable = false)
    private String videoUrl;

    @Column(nullable = false)
    private String thumbnailUrl;

    @Column(nullable = false)
    private Integer durationSeconds;

    @Column(nullable = false)
    private Long viewCount = 0L;

    // denormalized average, recalculated when a new rating comes in
    @Column(nullable = false)
    private Double averageRating = 0.0;

    @Column(nullable = false)
    private Long ratingCount = 0L;

    // gates this video behind an active Premium plan
    @Column(nullable = false)
    private Boolean isPremium = false;

    // manual position in the admin-managed video list (lower = earlier). Top 10 stays rating-driven and ignores this.
    @Column(nullable = false)
    private Integer displayOrder = 0;

    @ManyToOne(optional = false)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
