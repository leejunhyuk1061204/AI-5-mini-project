package com.minipr.backend.member.controller;

import com.minipr.backend.common.ApiResponse;
import com.minipr.backend.member.dto.CreateMemberRequest;
import com.minipr.backend.member.dto.MemberResponse;
import com.minipr.backend.member.entity.Member;
import com.minipr.backend.member.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping
    public ApiResponse<MemberResponse> create(@Valid @RequestBody CreateMemberRequest req) {
        Member saved = memberService.create(req);
        return ApiResponse.ok(MemberResponse.from(saved));
    }

    @GetMapping("/{memberId}")
    public ApiResponse<MemberResponse> get(@PathVariable Integer memberId) {
        return ApiResponse.ok(MemberResponse.from(memberService.get(memberId)));
    }

    @GetMapping
    public ApiResponse<List<MemberResponse>> list() {
        List<MemberResponse> result = memberService.list().stream()
                .map(MemberResponse::from)
                .toList();
        return ApiResponse.ok(result);
    }

    @PostMapping("/login")
    public ApiResponse<MemberResponse> login(@Valid @RequestBody com.minipr.backend.member.dto.LoginRequest req) {
        Member member = memberService.login(req);
        return ApiResponse.ok(MemberResponse.from(member));
    }
}
