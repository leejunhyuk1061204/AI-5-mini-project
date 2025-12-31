package com.minipr.backend.member.dto;

import com.minipr.backend.member.entity.Member;

import java.time.LocalDateTime;

public record MemberResponse(
        Integer memberId,
        String name,
        String email,
        LocalDateTime joinDate
) {
    public static MemberResponse from(Member m) {
        return new MemberResponse(m.getMemberId(), m.getName(), m.getEmail(), m.getJoinDate());
    }
}
