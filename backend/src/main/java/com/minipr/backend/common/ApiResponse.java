package com.minipr.backend.common;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * API 공통 응답 포맷
 *
 * 성공:
 * {
 *   "success": true,
 *   "data": {...}
 * }
 *
 * 실패:
 * {
 *   "success": false,
 *   "error": "에러 메시지"
 * }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final String error;

    private ApiResponse(boolean success, T data, String error) {
        this.success = success;
        this.data = data;
        this.error = error;
    }

    /** 성공 응답 */
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    /** 실패 응답 */
    public static <T> ApiResponse<T> fail(String errorMessage) {
        return new ApiResponse<>(false, null, errorMessage);
    }

    public boolean isSuccess() {
        return success;
    }

    public T getData() {
        return data;
    }

    public String getError() {
        return error;
    }
}
