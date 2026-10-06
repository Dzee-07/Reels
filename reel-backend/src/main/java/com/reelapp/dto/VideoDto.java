package com.reelapp.dto;

import com.reelapp.model.Video;

public record VideoDto(
        Long id,
        String title,
        String description,
        String tags,
        String thumbnailUrl,
        String videoUrl,
        Integer durationSeconds,
        Long viewCount,
        Double averageRating,
        Long ratingCount,
        String uploaderName,
        Boolean isPremium
) {
    public static VideoDto from(Video v) {
        return new VideoDto(
                v.getId(),
                v.getTitle(),
                v.getDescription(),
                v.getTags(),
                v.getThumbnailUrl(),
                v.getVideoUrl(),
                v.getDurationSeconds(),
                v.getViewCount(),
                v.getAverageRating(),
                v.getRatingCount(),
                v.getUploadedBy() != null ? v.getUploadedBy().getDisplayName() : null,
                v.getIsPremium()
        );
    }
}
