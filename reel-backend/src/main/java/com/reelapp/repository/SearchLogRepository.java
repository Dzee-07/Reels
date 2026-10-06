package com.reelapp.repository;

import com.reelapp.model.SearchLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {

    @Query("select s.term from SearchLog s where lower(s.term) like lower(concat(:prefix, '%')) " +
           "group by s.term order by count(s.term) desc")
    List<String> findTopMatchingTerms(String prefix);

    @Query("select s.term from SearchLog s where s.user.id = :userId group by s.term order by count(s.term) desc")
    List<String> findTopTermsForUser(Long userId);
}
