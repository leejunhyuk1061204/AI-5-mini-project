package com.minipr.backend.member.service;

import com.minipr.backend.common.NotFoundException;
import com.minipr.backend.member.dto.CreateMemberRequest;
import com.minipr.backend.member.entity.Member;
import com.minipr.backend.member.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class MemberService {

    private final MemberRepository memberRepository;

    public MemberService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public Member create(CreateMemberRequest req) {
        // MVP: 중복 이메일 막기 (DB UNIQUE도 있지만 서비스에서 메시지 주기)
        memberRepository.findByEmail(req.email()).ifPresent(m -> {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        });

        Member member = new Member(req.name(), req.email(), req.password());
        return memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public Member get(Integer memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new NotFoundException("회원이 없습니다. memberId=" + memberId));
    }

    @Transactional(readOnly = true)
    public List<Member> list() {
        return memberRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Member login(com.minipr.backend.member.dto.LoginRequest req) {
        Member member = memberRepository.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 일치하지 않습니다."));

        if (!member.getPassword().equals(req.password())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 일치하지 않습니다.");
        }

        return member;
    }
}
