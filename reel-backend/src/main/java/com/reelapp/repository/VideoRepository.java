package com.reelapp.repository;

import com.reelapp.model.Video;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VideoRepository extends JpaRepository<Video, Long> {

    @Query("select v from Video v where lower(v.title) like lower(concat('%', :q, '%')) " +
           "or lower(v.tags) like lower(concat('%', :q, '%'))")
    Page<Video> search(@Param("q") String query, Pageable pageable);

    Page<Video> findAllByOrderByAverageRatingDesc(Pageable pageable);

    Page<Video> findAllByOrderByViewCountDesc(Pageable pageable);

    Page<Video> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Video> findAllByOrderByDisplayOrderAscCreatedAtDesc(Pageable pageable);

    @Query("select v from Video v where lower(v.tags) like lower(concat('%', :tag, '%')) and v.id <> :excludeId")
    List<Video> findByTagLike(@Param("tag") String tag, @Param("excludeId") Long excludeId, Pageable pageable);
}
