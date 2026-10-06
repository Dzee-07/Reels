package com.reelapp.dto;

public record AuthResponse(String token, String displayName, String email, String role, String plan, Boolean mustChangePassword) {}
