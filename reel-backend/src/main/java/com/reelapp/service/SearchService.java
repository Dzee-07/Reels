package com.reelapp.service;

import com.reelapp.model.SearchLog;
import com.reelapp.model.User;
import com.reelapp.model.Video;
import com.reelapp.repository.SearchLogRepository;
import com.reelapp.repository.VideoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SearchService {

    private final SearchLogRepository searchLogRepository;
    private final VideoRepository videoRepository;

    public SearchService(SearchLogRepository searchLogRepository, VideoRepository videoRepository) {
        this.searchLogRepository = searchLogRepository;
        this.videoRepository = videoRepository;
    }

    /** Called every time a user types/submits a search - powers both autocomplete and recommendations. */
    public void logSearch(String term, User user) {
        if (term == null || term.isBlank()) return;
        SearchLog log = new SearchLog();
        log.setTerm(term.trim().toLowerCase());
        log.setUser(user);
        searchLogRepository.save(log);
    }

    /** Typeahead: "nar" -> "naruto", "narnia", ranked by how often that exact term was searched. */
    public List<String> suggest(String prefix) {
        if (prefix == null || prefix.isBlank()) return List.of();
        return searchLogRepository.findTopMatchingTerms(prefix.trim().toLowerCase())
                .stream()
                .distinct()
                .limit(8)
                .collect(Collectors.toList());
    }

    /** Recommended videos based on the user's own most-searched terms. */
    public List<Video> recommendationsFor(User user) {
        List<String> topTerms = searchLogRepository.findTopTermsForUser(user.getId());
        if (topTerms.isEmpty()) return List.of();

        String primaryTerm = topTerms.get(0);
        return videoRepository.search(primaryTerm, PageRequest.of(0, 12)).getContent();
    }
}
