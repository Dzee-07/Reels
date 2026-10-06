package com.reelapp.controller;

import com.reelapp.dto.VideoDto;
import com.reelapp.model.Favorite;
import com.reelapp.model.User;
import com.reelapp.model.WatchHistory;
import com.reelapp.service.UserService;
import com.reelapp.service.VideoService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me")
public class UserController {

    private final UserService userService;
    private final VideoService videoService;

    public UserController(UserService userService, VideoService videoService) {
        this.userService = userService;
        this.videoService = videoService;
    }

    @PostMapping("/favorites/{videoId}")
    public void toggleFavorite(@PathVariable Long videoId, @AuthenticationPrincipal User user) {
        userService.toggleFavorite(user, videoService.getOrThrow(videoId));
    }

    @GetMapping("/favorites")
    public List<VideoDto> favorites(@AuthenticationPrincipal User user) {
        return userService.favoritesFor(user).stream()
                .map(Favorite::getVideo)
                .map(VideoDto::from)
                .toList();
    }

    @PostMapping("/watch-history/{videoId}")
    public void recordWatch(@PathVariable Long videoId, @RequestParam(defaultValue = "0") int progressSeconds,
                             @AuthenticationPrincipal User user) {
        userService.recordWatch(user, videoService.getOrThrow(videoId), progressSeconds);
    }

    @GetMapping("/watch-history")
    public List<VideoDto> watchHistory(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size,
                                        @AuthenticationPrincipal User user) {
        return userService.watchHistoryFor(user, page, size).stream()
                .map(WatchHistory::getVideo)
                .map(VideoDto::from)
                .toList();
    }
}
