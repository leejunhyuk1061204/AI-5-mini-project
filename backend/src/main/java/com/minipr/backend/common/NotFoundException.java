package com.minipr.backend.common;

/**
 * 리소스(회원/회의록 등)를 찾지 못했을 때 던지는 예외
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
