package com.reelapp.service;

import com.reelapp.model.ActivityLog;
import com.reelapp.model.Favorite;
import com.reelapp.model.User;
import com.reelapp.model.Video;
import com.reelapp.model.WatchHistory;
import com.reelapp.repository.FavoriteRepository;
import com.reelapp.repository.UserRepository;
import com.reelapp.repository.WatchHistoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final FavoriteRepository favoriteRepository;
    private final WatchHistoryRepository watchHistoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;

    public UserService(UserRepository userRepository,
                        FavoriteRepository favoriteRepository,
                        WatchHistoryRepository watchHistoryRepository,
                        PasswordEncoder passwordEncoder,
                        ActivityLogService activityLogService) {
        this.userRepository = userRepository;
        this.favoriteRepository = favoriteRepository;
        this.watchHistoryRepository = watchHistoryRepository;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
    }

    public User updateDisplayName(User user, String newName) {
        user.setDisplayName(newName);
        User saved = userRepository.save(user);
        activityLogService.log(saved, ActivityLog.Action.PROFILE_UPDATE, "Changed display name to '" + newName + "'");
        return saved;
    }

    public void changePassword(User user, String currentPassword, String newPassword) {
        if (user.getPasswordHash() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This account signed in with Google/Facebook and has no password to change");
        }
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        activityLogService.log(user, ActivityLog.Action.PASSWORD_CHANGE, "Changed password");
    }

    @Transactional
    public void toggleFavorite(User user, Video video) {
        boolean wasFavorited = favoriteRepository.existsByUserIdAndVideoId(user.getId(), video.getId());
        if (wasFavorited) {
            favoriteRepository.deleteByUserIdAndVideoId(user.getId(), video.getId());
            activityLogService.log(user, ActivityLog.Action.FAVORITE_REMOVE,
                    "Removed '" + video.getTitle() + "' from favorites");
        } else {
            Favorite fav = new Favorite();
            fav.setUser(user);
            fav.setVideo(video);
            favoriteRepository.save(fav);
            activityLogService.log(user, ActivityLog.Action.FAVORITE_ADD,
                    "Added '" + video.getTitle() + "' to favorites");
        }
    }

    public List<Favorite> favoritesFor(User user) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    @Transactional
    public void recordWatch(User user, Video video, int progressSeconds) {
        WatchHistory history = new WatchHistory();
        history.setUser(user);
        history.setVideo(video);
        history.setProgressSeconds(progressSeconds);
        watchHistoryRepository.save(history);
    }

    public Page<WatchHistory> watchHistoryFor(User user, int page, int size) {
        return watchHistoryRepository.findByUserIdOrderByWatchedAtDesc(user.getId(), PageRequest.of(page, size));
    }

    /** Admin/sub-admin lookup of any user's watch history by id. */
    public List<WatchHistory> watchHistoryForUserId(Long userId, int page, int size) {
        return watchHistoryRepository.findByUserIdOrderByWatchedAtDesc(userId, PageRequest.of(page, size)).getContent();
    }

    /** Mock subscribe: no payment processing yet, just flips the plan and logs it. */
    @Transactional
    public User subscribe(User user) {
        user.setPlan(User.Plan.PREMIUM);
        User saved = userRepository.save(user);
        activityLogService.log(saved, ActivityLog.Action.SUBSCRIBE, "Subscribed to Premium");
        return saved;
    }

    @Transactional
    public User unsubscribe(User user) {
        user.setPlan(User.Plan.FREE);
        User saved = userRepository.save(user);
        activityLogService.log(saved, ActivityLog.Action.UNSUBSCRIBE, "Cancelled Premium subscription");
        return saved;
    }
}
