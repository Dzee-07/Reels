package com.reelapp.controller;

import com.reelapp.dto.*;
import com.reelapp.model.PendingApproval;
import com.reelapp.model.User;
import com.reelapp.model.Video;
import com.reelapp.service.ActivityLogService;
import com.reelapp.service.ApprovalService;
import com.reelapp.service.UserService;
import com.reelapp.service.VideoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

/**
 * Reachable by ROLE_ADMIN and ROLE_SUB_ADMIN (see SecurityConfig). Upload and
 * viewing endpoints work the same for both. Edit/delete behave differently by
 * role: an ADMIN's edit/delete applies immediately; a SUB_ADMIN's goes into
 * the approval queue instead (see ApprovalController) and only applies once
 * an ADMIN approves it.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final VideoService videoService;
    private final ActivityLogService activityLogService;
    private final ApprovalService approvalService;
    private final UserService userService;

    @Value("${app.storage.video-dir}")
    private String videoDir;

    @Value("${app.storage.thumbnail-dir}")
    private String thumbnailDir;

    public AdminController(VideoService videoService, ActivityLogService activityLogService,
                            ApprovalService approvalService, UserService userService) {
        this.videoService = videoService;
        this.activityLogService = activityLogService;
        this.approvalService = approvalService;
        this.userService = userService;
    }

    @PostMapping(value = "/videos", consumes = "multipart/form-data")
    public VideoDto upload(@RequestPart("video") MultipartFile videoFile,
                            @RequestPart("thumbnail") MultipartFile thumbnailFile,
                            @RequestPart("metadata") VideoUploadRequest metadata,
                            @AuthenticationPrincipal User admin) {
        try {
            String videoUrl = store(videoFile, videoDir);
            String thumbnailUrl = store(thumbnailFile, thumbnailDir);
            Video video = videoService.upload(metadata, videoUrl, thumbnailUrl, admin);
            return VideoDto.from(video);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store upload", e);
        }
    }

    /**
     * ADMIN: applies immediately, returns the updated video.
     * SUB_ADMIN: queued for approval, returns 202 Accepted with the pending request instead.
     */
    @PutMapping("/videos/{id}")
    public ResponseEntityWrapper edit(@PathVariable Long id, @RequestBody VideoEditRequest req,
                                       @AuthenticationPrincipal User user) {
        Video video = videoService.getOrThrow(id);
        if (user.getRole() == User.Role.SUB_ADMIN) {
            PendingApproval approval = approvalService.requestEdit(video, req, user);
            return ResponseEntityWrapper.pending(PendingApprovalDto.from(approval));
        }
        return ResponseEntityWrapper.applied(VideoDto.from(videoService.edit(id, req, user)));
    }

    @DeleteMapping("/videos/{id}")
    public ResponseEntityWrapper delete(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Video video = videoService.getOrThrow(id);
        if (user.getRole() == User.Role.SUB_ADMIN) {
            PendingApproval approval = approvalService.requestDelete(video, user);
            return ResponseEntityWrapper.pending(PendingApprovalDto.from(approval));
        }
        videoService.delete(id, user);
        return ResponseEntityWrapper.applied(null);
    }

    /** Drag-and-drop / press-and-hold reorder from the admin video list - both roles can do this directly. */
    @PutMapping("/videos/reorder")
    public void reorder(@RequestBody ReorderRequest req, @AuthenticationPrincipal User user) {
        videoService.reorder(req.videoIdsInOrder(), user);
    }

    /** Combined admin + user activity feed, newest first. */
    @GetMapping("/activity-log")
    public List<ActivityLogDto> activityLog(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "50") int size) {
        return activityLogService.recent(PageRequest.of(page, size))
                .map(ActivityLogDto::from)
                .getContent();
    }

    /** Both ADMIN and SUB_ADMIN can look up any user's watch history. */
    @GetMapping("/users/{userId}/watch-history")
    public List<VideoDto> userWatchHistory(@PathVariable Long userId,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "30") int size) {
        return userService.watchHistoryForUserId(userId, page, size).stream()
                .map(h -> VideoDto.from(h.getVideo()))
                .toList();
    }

    private String store(MultipartFile file, String dir) throws IOException {
        Files.createDirectories(Path.of(dir));
        String filename = UUID.randomUUID() + "-" + file.getOriginalFilename();
        Path target = Path.of(dir, filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return "/media/" + Path.of(dir).getFileName() + "/" + filename;
    }

    /** Small tagged-union so the frontend can tell "applied now" apart from "queued for approval" without a second call. */
    public record ResponseEntityWrapper(String status, Object result) {
        static ResponseEntityWrapper applied(Object result) {
            return new ResponseEntityWrapper("APPLIED", result);
        }
        static ResponseEntityWrapper pending(Object result) {
            return new ResponseEntityWrapper("PENDING_APPROVAL", result);
        }
    }
}
