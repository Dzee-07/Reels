package com.reelapp.security;

import com.reelapp.model.User;
import com.reelapp.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * After Google/Facebook confirm the user's identity, find-or-create the local
 * User row and redirect back to the frontend with our own JWT in the query
 * string so the SPA can store it like any other login.
 */
@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private static final String FRONTEND_CALLBACK = "http://localhost:3000/oauth/callback";

    public OAuth2SuccessHandler(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws IOException {
        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String provider = oauthToken.getAuthorizedClientRegistrationId(); // "google" or "facebook"

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User();
            u.setEmail(email);
            u.setDisplayName(name != null ? name : email);
            u.setProvider("google".equals(provider) ? User.AuthProvider.GOOGLE : User.AuthProvider.FACEBOOK);
            return userRepository.save(u);
        });

        String jwt = jwtService.generateToken(user.getEmail(), user.getRole().name());
        response.sendRedirect(FRONTEND_CALLBACK + "?token=" + jwt);
    }
}
