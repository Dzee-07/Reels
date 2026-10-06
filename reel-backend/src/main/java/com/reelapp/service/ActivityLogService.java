package com.reelapp.service;

import com.reelapp.model.ActivityLog;
import com.reelapp.model.User;
import com.reelapp.repository.ActivityLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    public ActivityLogService(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    public void log(User user, ActivityLog.Action action, String description) {
        ActivityLog entry = new ActivityLog();
        entry.setUser(user);
        entry.setAction(action);
        entry.setDescription(description);
        activityLogRepository.save(entry);
    }

    public Page<ActivityLog> recent(Pageable pageable) {
        return activityLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<ActivityLog> forUser(Long userId, Pageable pageable) {
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
}
