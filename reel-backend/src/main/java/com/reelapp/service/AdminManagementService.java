package com.reelapp.service;

import com.reelapp.dto.CreateAdminRequest;
import com.reelapp.dto.EditAdminRequest;
import com.reelapp.model.ActivityLog;
import com.reelapp.model.User;
import com.reelapp.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * ADMIN-only territory (enforced in AdminUserController + SecurityConfig):
 * creating/editing/deleting other admins and sub-admins, resetting their
 * passwords, and flagging an account to require a password change at next
 * login. A SUB_ADMIN can never reach these methods.
 */
@Service
public class AdminManagementService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;

    public AdminManagementService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                                   ActivityLogService activityLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
    }

    public List<User> listAdminsAndSubAdmins() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.ADMIN || u.getRole() == User.Role.SUB_ADMIN)
                .toList();
    }

    public User create(CreateAdminRequest req, User creator) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = new User();
        user.setEmail(req.email());
        user.setDisplayName(req.displayName());
        user.setPasswordHash(passwordEncoder.encode(req.temporaryPassword()));
        user.setProvider(User.AuthProvider.LOCAL);
        user.setRole(User.Role.valueOf(req.role()));
        user.setMustChangePassword(true); // temporary password - force them to set their own on first login
        User saved = userRepository.save(user);

        activityLogService.log(creator, ActivityLog.Action.ADMIN_CREATE,
                "Created " + req.role().toLowerCase() + " account for " + saved.getEmail());
        return saved;
    }

    public User edit(Long targetId, EditAdminRequest req, User editor) {
        User target = getOrThrow(targetId);
        assertNotSelf(target, editor, "edit");

        if (req.displayName() != null) target.setDisplayName(req.displayName());
        if (req.role() != null) target.setRole(User.Role.valueOf(req.role()));
        User saved = userRepository.save(target);

        activityLogService.log(editor, ActivityLog.Action.ADMIN_EDIT,
                "Edited admin account for " + saved.getEmail());
        return saved;
    }

    public void delete(Long targetId, User editor) {
        User target = getOrThrow(targetId);
        assertNotSelf(target, editor, "delete");

        String email = target.getEmail();
        userRepository.delete(target);

        activityLogService.log(editor, ActivityLog.Action.ADMIN_DELETE, "Deleted admin account for " + email);
    }

    /** Admin sets a specific new password directly for another admin/sub-admin. */
    public void setPassword(Long targetId, String newPassword, User editor) {
        User target = getOrThrow(targetId);
        target.setPasswordHash(passwordEncoder.encode(newPassword));
        target.setMustChangePassword(false);
        userRepository.save(target);

        activityLogService.log(editor, ActivityLog.Action.ADMIN_PASSWORD_RESET,
                "Reset password for " + target.getEmail());
    }

    /** Admin flags another admin/sub-admin's account to require a password change at their next login. */
    public void requestPasswordChange(Long targetId, User editor) {
        User target = getOrThrow(targetId);
        target.setMustChangePassword(true);
        userRepository.save(target);

        activityLogService.log(editor, ActivityLog.Action.ADMIN_PASSWORD_CHANGE_REQUESTED,
                "Requested a password change from " + target.getEmail());
    }

    private User getOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin account not found"));
    }

    private void assertNotSelf(User target, User editor, String action) {
        if (target.getId().equals(editor.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't " + action + " your own account here");
        }
    }
}
