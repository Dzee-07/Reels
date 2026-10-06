package com.reelapp.controller;

import com.reelapp.dto.SubscriptionResponse;
import com.reelapp.model.User;
import com.reelapp.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Plan/paywall logic only for now - no real payment processor wired in.
 * Swap the bodies of subscribe()/unsubscribe() for a real checkout flow
 * (e.g. Stripe Checkout + webhook confirmation) when you're ready; the
 * plan field and premium-video gating in VideoService already work off
 * whatever this sets.
 */
@RestController
@RequestMapping("/api/me/subscription")
public class SubscriptionController {

    private final UserService userService;

    public SubscriptionController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public SubscriptionResponse current(@AuthenticationPrincipal User user) {
        return new SubscriptionResponse(user.getPlan().name());
    }

    @PostMapping("/subscribe")
    public SubscriptionResponse subscribe(@AuthenticationPrincipal User user) {
        User updated = userService.subscribe(user);
        return new SubscriptionResponse(updated.getPlan().name());
    }

    @PostMapping("/unsubscribe")
    public SubscriptionResponse unsubscribe(@AuthenticationPrincipal User user) {
        User updated = userService.unsubscribe(user);
        return new SubscriptionResponse(updated.getPlan().name());
    }
}
