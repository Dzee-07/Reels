package com.reelapp.controller;

import com.reelapp.dto.RatingRequest;
import com.reelapp.dto.VideoDto;
import com.reelapp.model.User;
import com.reelapp.model.Video;
import com.reelapp.service.SearchService;
import com.reelapp.service.VideoService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/videos")
public class VideoController {

    private final VideoService videoService;
    private final SearchService searchService;

    public VideoController(VideoService videoService, SearchService searchService) {
        this.videoService = videoService;
        this.searchService = searchService;
    }

    @GetMapping("/search")
    public List<VideoDto> search(@RequestParam String q,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  @AuthenticationPrincipal User user) {
        searchService.logSearch(q, user); // logged even for guests (user may be null)
        return videoService.search(q, page, size).map(VideoDto::from).getContent();
    }

    @GetMapping("/top10")
    public List<VideoDto> top10() {
        return videoService.top10().map(VideoDto::from).getContent();
    }

    @GetMapping("/latest")
    public List<VideoDto> latest(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return videoService.latest(page, size).map(VideoDto::from).getContent();
    }

    /** The admin-curated manual order - what the homepage grid uses once an admin has reordered anything. */
    @GetMapping("/ordered")
    public List<VideoDto> ordered(@RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        return videoService.ordered(page, size).map(VideoDto::from).getContent();
    }

    @GetMapping("/{id}")
    public VideoDto get(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Video video = videoService.getOrThrow(id);
        videoService.assertWatchable(video, user);
        videoService.registerView(id);
        return VideoDto.from(video);
    }

    @GetMapping("/{id}/similar")
    public List<VideoDto> similar(@PathVariable Long id) {
        return videoService.similarTo(id, 8).stream().map(VideoDto::from).toList();
    }

    @PostMapping("/{id}/rating")
    public VideoDto rate(@PathVariable Long id, @RequestBody RatingRequest req,
                          @AuthenticationPrincipal User user) {
        Video video = videoService.rate(id, user, req.stars());
        return VideoDto.from(video);
    }

    @GetMapping("/recommended")
    public List<VideoDto> recommended(@AuthenticationPrincipal User user) {
        return searchService.recommendationsFor(user).stream().map(VideoDto::from).toList();
    }
}
