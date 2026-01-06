package com.minipr.backend.websocket;

import com.minipr.backend.meeting.repository.MeetingRepository;
import com.minipr.backend.meeting.service.MeetingService;
import com.minipr.backend.segment.repository.RealtimeSegmentRepository;
import com.minipr.backend.service.FileStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

/**
 * WebSocket 설정 클래스
 * /ws/audio 엔드포인트로 오디오 스트리밍 지원
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    private final WhisperApiClient whisperApiClient;
    private final RealtimeSegmentRepository realtimeSegmentRepository;
    private final MeetingRepository meetingRepository;
    private final FileStorageService fileStorageService;
    private final MeetingService meetingService;
    private final ApplicationEventPublisher eventPublisher;

    public WebSocketConfig(
            WhisperApiClient whisperApiClient,
            RealtimeSegmentRepository realtimeSegmentRepository,
            MeetingRepository meetingRepository,
            FileStorageService fileStorageService,
            MeetingService meetingService,
            ApplicationEventPublisher eventPublisher) {
        this.whisperApiClient = whisperApiClient;
        this.realtimeSegmentRepository = realtimeSegmentRepository;
        this.meetingRepository = meetingRepository;
        this.fileStorageService = fileStorageService;
        this.meetingService = meetingService;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(audioWebSocketHandler(), "/ws/audio")
                .setAllowedOrigins("*");
    }

    @Bean
    public AudioWebSocketHandler audioWebSocketHandler() {
        return new AudioWebSocketHandler(
                whisperApiClient,
                realtimeSegmentRepository,
                meetingRepository,
                fileStorageService,
                meetingService,
                eventPublisher);
    }

    /**
     * WebSocket 메시지 버퍼 크기 설정
     */
    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(512 * 1024); // 512KB
        container.setMaxBinaryMessageBufferSize(512 * 1024); // 512KB
        container.setAsyncSendTimeout(5000L); // 5초
        container.setMaxSessionIdleTimeout(60000L); // 60초
        return container;
    }
}
