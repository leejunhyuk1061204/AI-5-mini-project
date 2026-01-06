package com.minipr.backend.controller;

import com.minipr.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class FileController {

    private final FileStorageService fileStorageService;

    @GetMapping("/download/{meetingId}")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long meetingId) {
        log.info("Downloading file for meetingId: {}", meetingId);
        try {
            Path filePath = fileStorageService.getFilePath(meetingId);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType("audio/webm"))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"meeting_" + meetingId + ".webm\"")
                        .body(resource);
            } else {
                throw new RuntimeException("Could not read the file!");
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error: " + e.getMessage());
        }
    }
}
