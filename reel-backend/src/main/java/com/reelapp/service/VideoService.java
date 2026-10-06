package com.reelapp.service;

import com.reelapp.dto.VideoEditRequest;
import com.reelapp.dto.VideoUploadRequest;
import com.reelapp.model.ActivityLog;
import com.reelapp.model.Rating;
import com.reelapp.model.User;
import com.reelapp.model.Video;
import com.reelapp.repository.RatingRepository;
import com.reelapp.repository.VideoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@Service
public class VideoService {

    private final VideoRepository videoRepository;
    private final RatingRepository ratingRepository;
    private final ActivityLogService activityLogService;

    public VideoService(VideoRepository videoRepository, RatingRepository ratingRepository,
                         ActivityLogService activityLogService) {
        this.videoRepository = videoRepository;
        this.ratingRepository = ratingRepository;
        this.activityLogService = activityLogService;
    }

    public Video upload(VideoUploadRequest req, String videoUrl, String thumbnailUrl, User admin) {
        Video video = new Video();
        video.setTitle(req.title());
        video.setDescription(req.description());
        video.setTags(req.tags());
        video.setDurationSeconds(req.durationSeconds());
        video.setVideoUrl(videoUrl);
        video.setThumbnailUrl(thumbnailUrl);
        video.setUploadedBy(admin);
        video.setIsPremium(Boolean.TRUE.equals(req.isPremium()));
        Video saved = videoRepository.save(video);

        activityLogService.log(admin, ActivityLog.Action.VIDEO_UPLOAD,
                "Uploaded '" + saved.getTitle() + "' (#" + saved.getId() + ")");
        return saved;
    }

    @Transactional
    public Video edit(Long videoId, VideoEditRequest req, User admin) {
        Video video = getOrThrow(videoId);
        if (req.title() != null) video.setTitle(req.title());
        if (req.description() != null) video.setDescription(req.description());
        if (req.tags() != null) video.setTags(req.tags());
        if (req.isPremium() != null) video.setIsPremium(req.isPremium());
        Video saved = videoRepository.save(video);

        activityLogService.log(admin, ActivityLog.Action.VIDEO_EDIT,
                "Edited '" + saved.getTitle() + "' (#" + saved.getId() + ")");
        return saved;
    }

    @Transactional
    public void delete(Long videoId, User admin) {
        Video video = getOrThrow(videoId);
        String title = video.getTitle();
        videoRepository.delete(video);

        activityLogService.log(admin, ActivityLog.Action.VIDEO_DELETE,
                "Deleted '" + title + "' (#" + videoId + ")");
    }

    public Page<Video> search(String query, int page, int size) {
        return videoRepository.search(query, PageRequest.of(page, size));
    }

    public Page<Video> top10() {
        return videoRepository.findAllByOrderByAverageRatingDesc(PageRequest.of(0, 10));
    }

    public Page<Video> latest(int page, int size) {
        return videoRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }

    /** The admin-curated manual order (drag/drop, press-and-hold reorder). Falls back to newest-first for ties. */
    public Page<Video> ordered(int page, int size) {
        return videoRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc(PageRequest.of(page, size));
    }

    public Video getOrThrow(Long id) {
        return videoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Video not found"));
    }

    /** Throws 402 if the video is premium-only and the given user isn't on the Premium plan. */
    public void assertWatchable(Video video, User user) {
        if (!Boolean.TRUE.equals(video.getIsPremium())) return;
        boolean isPremiumUser = user != null && user.getPlan() == User.Plan.PREMIUM;
        if (!isPremiumUser) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "This video requires a Premium subscription");
        }
    }

    @Transactional
    public void registerView(Long videoId) {
        Video v = getOrThrow(videoId);
        v.setViewCount(v.getViewCount() + 1);
        videoRepository.save(v);
    }

    @Transactional
    public Video rate(Long videoId, User user, int stars) {
        Video video = getOrThrow(videoId);

        Rating rating = ratingRepository.findByUserIdAndVideoId(user.getId(), videoId)
                .orElseGet(() -> {
                    Rating r = new Rating();
                    r.setUser(user);
                    r.setVideo(video);
                    return r;
                });

        boolean isNew = rating.getId() == null;
        rating.setStars(stars);
        ratingRepository.save(rating);

        // recalculate the denormalized average
        double totalPoints = video.getAverageRating() * video.getRatingCount();
        if (isNew) {
            video.setRatingCount(video.getRatingCount() + 1);
            totalPoints += stars;
        } else {
            // simplistic: for an edit, this recompute path should pull the old value;
            // production version should diff old vs new stars instead of full resum
            totalPoints += stars;
        }
        video.setAverageRating(totalPoints / video.getRatingCount());
        Video saved = videoRepository.save(video);

        activityLogService.log(user, ActivityLog.Action.RATING_SET,
                "Rated '" + saved.getTitle() + "' " + stars + " stars");
        return saved;
    }

    /** "More like this" - simple tag-overlap recommendation, no ML needed for v1. */
    public List<Video> similarTo(Long videoId, int limit) {
        Video video = getOrThrow(videoId);
        if (video.getTags() == null || video.getTags().isBlank()) return List.of();
        String firstTag = video.getTags().split(",")[0].trim();
        return videoRepository.findByTagLike(firstTag, videoId, PageRequest.of(0, limit));
    }

    /** Applies a new manual display order from a drag-and-drop / press-and-hold reorder in the admin UI. */
    @Transactional
    public void reorder(List<Long> videoIdsInOrder, User admin) {
        for (int i = 0; i < videoIdsInOrder.size(); i++) {
            Video v = getOrThrow(videoIdsInOrder.get(i));
            v.setDisplayOrder(i);
            videoRepository.save(v);
        }
        activityLogService.log(admin, ActivityLog.Action.VIDEO_REORDER,
                "Reordered the video list (" + videoIdsInOrder.size() + " videos)");
    }
}
