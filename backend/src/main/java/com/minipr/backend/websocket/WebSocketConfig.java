package com.minipr.backend.websocket;

import com.minipr.backend.segment.service.MeetingSegmentBufferService;
import org.springframework.beans.factory.annotation.Value;
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
    private final MeetingSegmentBufferService meetingSegmentBufferService; 

    public WebSocketConfig(
            WhisperApiClient whisperApiClient,
            MeetingSegmentBufferService meetingSegmentBufferService 
    ) {
        this.whisperApiClient = whisperApiClient;
        this.meetingSegmentBufferService = meetingSegmentBufferService;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(audioWebSocketHandler(), "/ws/audio")
                .setAllowedOrigins(allowedOrigins.split(","));
    }

    @Bean
    public AudioWebSocketHandler audioWebSocketHandler() {
        return new AudioWebSocketHandler(whisperApiClient, meetingSegmentBufferService);
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
