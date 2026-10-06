package com.reelapp.repository;

import com.reelapp.model.PendingApproval;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PendingApprovalRepository extends JpaRepository<PendingApproval, Long> {
    List<PendingApproval> findByStatusOrderByCreatedAtDesc(PendingApproval.Status status);
}
