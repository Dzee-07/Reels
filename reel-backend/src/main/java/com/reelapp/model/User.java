package com.reelapp.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    public enum Role { ADMIN, SUB_ADMIN, USER }
    public enum AuthProvider { LOCAL, GOOGLE, FACEBOOK }
    public enum Plan { FREE, PREMIUM }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String displayName;

    // null when the account was created via Google/Facebook
    @Column
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider = AuthProvider.LOCAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Plan plan = Plan.FREE;

    // forces a password change on next login - set when an admin resets/flags another admin's account
    @Column(nullable = false)
    private Boolean mustChangePassword = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
