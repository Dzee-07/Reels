package com.reelapp.repository;

import com.reelapp.model.Rating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    Optional<Rating> findByUserIdAndVideoId(Long userId, Long videoId);
}
