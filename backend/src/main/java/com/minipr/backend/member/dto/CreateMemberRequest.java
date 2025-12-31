package com.minipr.backend.member.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateMemberRequest(
        @NotBlank String name,
        @Email @NotBlank String email,
        @NotBlank String password
) {}
