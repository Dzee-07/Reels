package com.reelapp.controller;

import com.reelapp.service.SearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    /** Typeahead endpoint: GET /api/search/suggest?prefix=nar -> ["naruto", "narnia", ...] */
    @GetMapping("/suggest")
    public List<String> suggest(@RequestParam String prefix) {
        return searchService.suggest(prefix);
    }
}
