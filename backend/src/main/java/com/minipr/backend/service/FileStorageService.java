package com.minipr.backend.service;

import org.springframework.stereotype.Service;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

@Service
public class FileStorageService {
    // 임시 또는 영구 저장을 위한 베이스 경로
    private final Path rootLocation = Paths.get("uploads/meetings");

    public FileStorageService() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage location", e);
        }
    }

    // 실시간으로 오디오 청크를 파일 뒤에 붙임 (Append)
    public void appendAudio(Long meetingId, byte[] data) {
        Path filePath = rootLocation.resolve("meeting_" + meetingId + ".webm");
        try {
            if (!Files.exists(filePath)) {
                Files.createFile(filePath);
            }
            Files.write(filePath, data, StandardOpenOption.APPEND);
        } catch (IOException e) {
            throw new RuntimeException("Could not store audio chunk", e);
        }
    }

    public Path getFilePath(Long meetingId) {
        return rootLocation.resolve("meeting_" + meetingId + ".webm");
    }

    public void deleteAudio(Long meetingId) {
        Path filePath = rootLocation.resolve("meeting_" + meetingId + ".webm");
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Could not delete audio file", e);
        }
    }
}
