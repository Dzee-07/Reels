package com.reelapp.controller;

import com.reelapp.dto.*;
import com.reelapp.model.ActivityLog;
import com.reelapp.model.User;
import com.reelapp.repository.UserRepository;
import com.reelapp.security.JwtService;
import com.reelapp.service.ActivityLogService;
import com.reelapp.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserService userService;
    private final ActivityLogService activityLogService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           JwtService jwtService, UserService userService,
                           ActivityLogService activityLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userService = userService;
        this.activityLogService = activityLogService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = new User();
        user.setEmail(req.email());
        user.setDisplayName(req.displayName());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setProvider(User.AuthProvider.LOCAL);
        userRepository.save(user);
        activityLogService.log(user, ActivityLog.Action.REGISTER, "Created an account");

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getDisplayName(), user.getEmail(), user.getRole().name(), user.getPlan().name(), user.getMustChangePassword());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        activityLogService.log(user, ActivityLog.Action.LOGIN, "Logged in");

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(token, user.getDisplayName(), user.getEmail(), user.getRole().name(), user.getPlan().name(), user.getMustChangePassword());
    }

    @PutMapping("/profile")
    public AuthResponse updateProfile(@AuthenticationPrincipal User user, @RequestBody UpdateProfileRequest req) {
        User updated = userService.updateDisplayName(user, req.displayName());
        String token = jwtService.generateToken(updated.getEmail(), updated.getRole().name());
        return new AuthResponse(token, updated.getDisplayName(), updated.getEmail(), updated.getRole().name(), updated.getPlan().name(), updated.getMustChangePassword());
    }

    @PutMapping("/password")
    public void changePassword(@AuthenticationPrincipal User user, @Valid @RequestBody ChangePasswordRequest req) {
        userService.changePassword(user, req.currentPassword(), req.newPassword());
    }
}
