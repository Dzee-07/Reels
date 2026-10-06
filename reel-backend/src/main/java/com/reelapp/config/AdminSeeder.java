package com.reelapp.config;

import com.reelapp.model.User;
import com.reelapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds a single admin account on startup so you have somewhere to log in
 * before building real account-provisioning tooling.
 *
 * SECURITY NOTE: this creates the account with a fixed password on first run
 * only (it never touches an admin that already exists). Treat the default
 * below as temporary:
 *   - override it via the ADMIN_SEED_PASSWORD env var instead of editing this file
 *   - log in once and change the password from Account Settings
 *   - do not leave this seeder wired to a hardcoded password in anything
 *     you deploy or share publicly
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin-seed.email:admin@reel.local}")
    private String seedEmail;

    // Prefer setting ADMIN_SEED_PASSWORD as an environment variable over
    // relying on the default below.
    @Value("${app.admin-seed.password:Password07!}")
    private String seedPassword;

    public AdminSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.existsByEmail(seedEmail)) {
            return; // already seeded - never overwrite an existing account's password here
        }

        User admin = new User();
        admin.setEmail(seedEmail);
        admin.setDisplayName("Admin");
        admin.setPasswordHash(passwordEncoder.encode(seedPassword));
        admin.setProvider(User.AuthProvider.LOCAL);
        admin.setRole(User.Role.ADMIN);
        userRepository.save(admin);

        System.out.println("Seeded temporary admin account: " + seedEmail
                + " — log in and change the password from Account Settings.");
    }
}
