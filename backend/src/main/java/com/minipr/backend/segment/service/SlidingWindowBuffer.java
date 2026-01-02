package com.minipr.backend.segment.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Sliding Window (개수 기준) 메모리 버퍼.
 * - capacity만큼만 저장
 * - 가득 차면 가장 오래된 데이터를 자동으로 덮어씀(= 슬라이딩)
 * - drain()으로 FIFO 순서로 꺼내서 DB 저장 등에 사용
 */
public class SlidingWindowBuffer<T> {

    private final Object[] buffer;
    private final int capacity;

    private int head = 0; // 가장 오래된 데이터 위치
    private int tail = 0; // 다음에 쓸 위치
    private int size = 0; // 현재 들어있는 개수

    private final ReentrantLock lock = new ReentrantLock();

    public SlidingWindowBuffer(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("capacity must be > 0");
        this.capacity = capacity;
        this.buffer = new Object[capacity];
    }

    /**
     * 데이터 추가.
     * - 버퍼가 가득 차면 가장 오래된 데이터를 덮어쓰면서 head도 같이 이동(슬라이딩)
     */
    public void add(T item) {
        if (item == null) return;

        lock.lock();
        try {
            buffer[tail] = item;
            tail = (tail + 1) % capacity;

            if (size < capacity) {
                size++;
            } else {
                // full -> overwrite oldest
                head = (head + 1) % capacity;
            }
        } finally {
            lock.unlock();
        }
    }

    /**
     * FIFO 순서로 최대 max개까지 꺼내서 반환하고, 버퍼에서는 제거.
     * - DB 배치 저장할 때 사용하면 좋음
     */
    public List<T> drain(int max) {
        if (max <= 0) return List.of();

        lock.lock();
        try {
            int n = Math.min(max, size);
            if (n == 0) return List.of();

            List<T> out = new ArrayList<>(n);
            for (int i = 0; i < n; i++) {
                @SuppressWarnings("unchecked")
                T item = (T) buffer[head];
                buffer[head] = null; 
                head = (head + 1) % capacity;
                out.add(item);
            }
            size -= n;
            return out;
        } finally {
            lock.unlock();
        }
    }

    /** 현재 버퍼에 쌓인 개수 */
    public int size() {
        lock.lock();
        try {
            return size;
        } finally {
            lock.unlock();
        }
    }

    /** 최대 저장 가능 개수 */
    public int capacity() {
        return capacity;
    }

    /** 비우기 */
    public void clear() {
        lock.lock();
        try {
            for (int i = 0; i < capacity; i++) buffer[i] = null;
            head = tail = size = 0;
        } finally {
            lock.unlock();
        }
    }
}
