package com.reelapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reelapp.dto.VideoEditRequest;
import com.reelapp.model.ActivityLog;
import com.reelapp.model.PendingApproval;
import com.reelapp.model.User;
import com.reelapp.model.Video;
import com.reelapp.repository.PendingApprovalRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ApprovalService {

    private final PendingApprovalRepository approvalRepository;
    private final VideoService videoService;
    private final ActivityLogService activityLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ApprovalService(PendingApprovalRepository approvalRepository, VideoService videoService,
                            ActivityLogService activityLogService) {
        this.approvalRepository = approvalRepository;
        this.videoService = videoService;
        this.activityLogService = activityLogService;
    }

    public PendingApproval requestEdit(Video video, VideoEditRequest req, User subAdmin) {
        PendingApproval approval = new PendingApproval();
        approval.setActionType(PendingApproval.ActionType.EDIT_VIDEO);
        approval.setVideo(video);
        approval.setRequestedBy(subAdmin);
        try {
            approval.setPayload(objectMapper.writeValueAsString(req));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Couldn't encode edit request");
        }
        PendingApproval saved = approvalRepository.save(approval);

        activityLogService.log(subAdmin, ActivityLog.Action.APPROVAL_REQUESTED,
                "Requested to edit '" + video.getTitle() + "' - awaiting admin approval");
        return saved;
    }

    public PendingApproval requestDelete(Video video, User subAdmin) {
        PendingApproval approval = new PendingApproval();
        approval.setActionType(PendingApproval.ActionType.DELETE_VIDEO);
        approval.setVideo(video);
        approval.setRequestedBy(subAdmin);
        PendingApproval saved = approvalRepository.save(approval);

        activityLogService.log(subAdmin, ActivityLog.Action.APPROVAL_REQUESTED,
                "Requested to delete '" + video.getTitle() + "' - awaiting admin approval");
        return saved;
    }

    public List<PendingApproval> pending() {
        return approvalRepository.findByStatusOrderByCreatedAtDesc(PendingApproval.Status.PENDING);
    }

    @Transactional
    public void approve(Long approvalId, User admin) {
        PendingApproval approval = getOrThrow(approvalId);
        requirePending(approval);

        try {
            if (approval.getActionType() == PendingApproval.ActionType.EDIT_VIDEO) {
                VideoEditRequest req = objectMapper.readValue(approval.getPayload(), VideoEditRequest.class);
                // executed as the admin approving it, not the sub-admin who requested it -
                // the sub-admin's original request is preserved via the activity log entry below
                videoService.edit(approval.getVideo().getId(), req, admin);
            } else {
                videoService.delete(approval.getVideo().getId(), admin);
            }
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Couldn't apply the approved change", e);
        }

        approval.setStatus(PendingApproval.Status.APPROVED);
        approval.setReviewedBy(admin);
        approval.setReviewedAt(java.time.Instant.now());
        approvalRepository.save(approval);

        activityLogService.log(admin, ActivityLog.Action.APPROVAL_APPROVED,
                "Approved " + approval.getRequestedBy().getDisplayName() + "'s request on '" + approval.getVideo().getTitle() + "'");
    }

    @Transactional
    public void reject(Long approvalId, User admin) {
        PendingApproval approval = getOrThrow(approvalId);
        requirePending(approval);

        approval.setStatus(PendingApproval.Status.REJECTED);
        approval.setReviewedBy(admin);
        approval.setReviewedAt(java.time.Instant.now());
        approvalRepository.save(approval);

        activityLogService.log(admin, ActivityLog.Action.APPROVAL_REJECTED,
                "Rejected " + approval.getRequestedBy().getDisplayName() + "'s request on '" + approval.getVideo().getTitle() + "'");
    }

    private PendingApproval getOrThrow(Long id) {
        return approvalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Approval request not found"));
    }

    private void requirePending(PendingApproval approval) {
        if (approval.getStatus() != PendingApproval.Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This request has already been reviewed");
        }
    }
}
