package com.minipr.backend.meeting.service;

import com.minipr.backend.common.NotFoundException;
import com.minipr.backend.meeting.dto.CreateMeetingRequest;
import com.minipr.backend.meeting.entity.Meeting;
import com.minipr.backend.meeting.repository.MeetingRepository;
import com.minipr.backend.member.entity.Member;
import com.minipr.backend.member.service.MemberService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MemberService memberService;

    public MeetingService(MeetingRepository meetingRepository, MemberService memberService) {
        this.meetingRepository = meetingRepository;
        this.memberService = memberService;
    }

    public Meeting create(CreateMeetingRequest req) {
        Member member = memberService.get(req.memberId());
        Meeting meeting = new Meeting(member, req.title(), req.fullText());
        return meetingRepository.save(meeting);
    }

    @Transactional(readOnly = true)
    public Meeting get(Integer meetingId) {
        return meetingRepository.findById(meetingId)
                .orElseThrow(() -> new NotFoundException("회의록이 없습니다. meetingId=" + meetingId));
    }

    @Transactional(readOnly = true)
    public List<Meeting> listByMember(Integer memberId) {
        return meetingRepository.findByMember_MemberId(memberId);
    }
}
