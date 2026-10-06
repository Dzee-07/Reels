package com.reelapp.dto;

import java.util.List;

// videoIdsInOrder[0] is the new first item, etc.
public record ReorderRequest(List<Long> videoIdsInOrder) {}
