package com.minipr.backend.controller;

import com.minipr.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public Mono<ChatService.ChatResponse> chat(@RequestBody ChatService.ChatRequest request) {
        return chatService.chat(request);
    }
}
