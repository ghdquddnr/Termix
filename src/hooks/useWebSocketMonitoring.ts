/**
 * WebSocket Monitoring Hook
 * 프로세스 모니터링 실시간 통신을 위한 WebSocket 클라이언트 훅
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ProcessListResponse } from '@/types/process-monitoring';
import { toast } from 'sonner';

// WebSocket 메시지 타입 정의
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'request_update' | 'heartbeat';
  hostId?: string;
  event?: string;
  data?: any;
  timestamp?: string;
}

interface WebSocketResponse {
  type: 'process_update' | 'system_update' | 'error' | 'heartbeat' | 'subscribed' | 'unsubscribed';
  hostId?: string;
  data?: any;
  timestamp: string;
  error?: string;
}

// 연결 상태 타입
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// WebSocket 설정 타입
interface WebSocketOptions {
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  enableLogging?: boolean;
}

// 훅 반환 타입
interface UseWebSocketMonitoringReturn {
  // 연결 상태
  connectionState: ConnectionState;
  isConnected: boolean;
  
  // 데이터
  processData: ProcessListResponse | null;
  lastUpdate: Date | null;
  
  // 제어 함수
  connect: () => void;
  disconnect: () => void;
  subscribe: (hostId: string, event: string) => void;
  unsubscribe: (hostId: string, event: string) => void;
  requestUpdate: (hostId: string) => void;
  
  // 통계
  stats: {
    reconnectAttempts: number;
    messagesReceived: number;
    messagesSent: number;
    lastHeartbeat: Date | null;
  };
}

const DEFAULT_OPTIONS: Required<WebSocketOptions> = {
  url: 'ws://localhost:8086',
  reconnectAttempts: 3,
  reconnectDelay: 5000,
  heartbeatInterval: 30000,
  enableLogging: process.env.NODE_ENV === 'development'
};

export function useWebSocketMonitoring(options: WebSocketOptions = {}): UseWebSocketMonitoringReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // 상태 관리
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [processData, setProcessData] = useState<ProcessListResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // WebSocket 및 설정 참조
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const lastConnectAttemptRef = useRef<number>(0);
  
  // 통계
  const [stats, setStats] = useState({
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
    lastHeartbeat: null as Date | null
  });

  // 로깅 함수
  const log = useCallback((message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    if (config.enableLogging) {
      console[level](`[WebSocket Monitor] ${message}`);
    }
  }, [config.enableLogging]);

  // 메시지 전송 함수
  const sendMessage = useCallback((message: WebSocketMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(messageWithTimestamp));
        
        setStats(prev => ({
          ...prev,
          messagesSent: prev.messagesSent + 1
        }));
        
        log(`Sent message: ${message.type}`, 'info');
      } catch (error) {
        log(`Failed to send message: ${error}`, 'error');
      }
    } else {
      log('Cannot send message: WebSocket not connected', 'warn');
    }
  }, [log]);

  // 하트비트 시작
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      sendMessage({ type: 'heartbeat' });
    }, config.heartbeatInterval);
  }, [sendMessage, config.heartbeatInterval]);

  // 하트비트 중지
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // 재연결 시도
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= config.reconnectAttempts) {
      log('Maximum reconnect attempts reached', 'error');
      setConnectionState('error');
      toast.error('WebSocket 연결 재시도 횟수를 초과했습니다.');
      return;
    }

    setConnectionState('reconnecting');
    reconnectAttemptsRef.current += 1;
    
    setStats(prev => ({
      ...prev,
      reconnectAttempts: reconnectAttemptsRef.current
    }));

    const delay = config.reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // 지수 백오프
    log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${config.reconnectAttempts})`, 'info');

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [config.reconnectAttempts, config.reconnectDelay, log]);

  // WebSocket 연결 함수
  const connect = useCallback(() => {
    // 이미 연결 중이거나 연결된 상태면 무시
    if (connectionState === 'connecting' || connectionState === 'connected') {
      log('Already connecting or connected, ignoring connect request', 'warn');
      return;
    }

    // 디바운싱: 마지막 연결 시도로부터 1초 미만이면 무시
    const now = Date.now();
    if (now - lastConnectAttemptRef.current < 1000) {
      log('Connect attempt too soon, ignoring (debounce)', 'warn');
      return;
    }
    lastConnectAttemptRef.current = now;

    // 기존 연결이 있으면 종료
    if (wsRef.current) {
      wsRef.current.close();
    }

    // 재연결 타이머 정리
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState('connecting');
    log(`Connecting to ${config.url}`, 'info');

    try {
      const ws = new WebSocket(config.url);
      wsRef.current = ws;

      ws.onopen = () => {
        log('WebSocket connected', 'info');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0; // 성공 시 재연결 시도 횟수 초기화
        startHeartbeat();

        // 기존 구독 복구
        subscriptionsRef.current.forEach(subscription => {
          const [hostId, event] = subscription.split(':');
          sendMessage({ type: 'subscribe', hostId, event });
        });

        toast.success('실시간 모니터링이 연결되었습니다.');
      };

      ws.onmessage = (event) => {
        try {
          const response: WebSocketResponse = JSON.parse(event.data);
          
          setStats(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1
          }));

          log(`Received message: ${response.type}`, 'info');

          switch (response.type) {
            case 'process_update':
              if (response.data) {
                setProcessData(response.data);
                setLastUpdate(new Date());
              }
              break;

            case 'heartbeat':
              setStats(prev => ({
                ...prev,
                lastHeartbeat: new Date()
              }));
              break;

            case 'error':
              log(`Server error: ${response.error}`, 'error');
              toast.error(`서버 오류: ${response.error}`);
              break;

            case 'subscribed':
              log(`Successfully subscribed to ${response.hostId}`, 'info');
              break;

            case 'unsubscribed':
              log(`Successfully unsubscribed from ${response.hostId}`, 'info');
              break;

            default:
              log(`Unknown message type: ${response.type}`, 'warn');
          }
        } catch (error) {
          log(`Failed to parse message: ${error}`, 'error');
        }
      };

      ws.onclose = (event) => {
        log(`WebSocket closed: ${event.code} ${event.reason}`, 'info');
        stopHeartbeat();
        
        if (connectionState === 'connected' || connectionState === 'reconnecting') {
          // 예상치 못한 연결 종료인 경우 재연결 시도
          attemptReconnect();
        } else {
          setConnectionState('disconnected');
        }
      };

      ws.onerror = (error) => {
        log(`WebSocket error: ${error}`, 'error');
        setConnectionState('error');
      };

    } catch (error) {
      log(`Failed to create WebSocket: ${error}`, 'error');
      setConnectionState('error');
      toast.error('WebSocket 연결을 생성할 수 없습니다.');
    }
  }, [config.url, log, startHeartbeat, stopHeartbeat, attemptReconnect, connectionState, sendMessage]);

  // WebSocket 연결 해제 함수
  const disconnect = useCallback(() => {
    log('Disconnecting WebSocket', 'info');
    
    // 재연결 시도 중지
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 하트비트 중지
    stopHeartbeat();

    // WebSocket 연결 종료
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // 구독 정리
    subscriptionsRef.current.clear();

    setConnectionState('disconnected');
    setProcessData(null);
    setLastUpdate(null);
  }, [log, stopHeartbeat]);

  // 이벤트 구독 함수
  const subscribe = useCallback((hostId: string, event: string) => {
    if (!hostId || hostId.trim() === '') {
      log('Cannot subscribe: hostId is empty', 'warn');
      return;
    }
    
    const subscriptionKey = `${hostId}:${event}`;
    subscriptionsRef.current.add(subscriptionKey);
    
    if (connectionState === 'connected') {
      sendMessage({ type: 'subscribe', hostId, event });
      log(`Subscribing to ${subscriptionKey}`, 'info');
    } else {
      log(`Queued subscription to ${subscriptionKey} (not connected)`, 'info');
    }
  }, [connectionState, sendMessage, log]);

  // 이벤트 구독 해제 함수
  const unsubscribe = useCallback((hostId: string, event: string) => {
    if (!hostId || hostId.trim() === '') {
      log('Cannot unsubscribe: hostId is empty', 'warn');
      return;
    }
    
    const subscriptionKey = `${hostId}:${event}`;
    subscriptionsRef.current.delete(subscriptionKey);
    
    if (connectionState === 'connected') {
      sendMessage({ type: 'unsubscribe', hostId, event });
      log(`Unsubscribing from ${subscriptionKey}`, 'info');
    }
  }, [connectionState, sendMessage, log]);

  // 업데이트 요청 함수
  const requestUpdate = useCallback((hostId: string) => {
    if (!hostId || hostId.trim() === '') {
      log('Cannot request update: hostId is empty', 'warn');
      return;
    }
    
    if (connectionState === 'connected') {
      sendMessage({ type: 'request_update', hostId });
      log(`Requesting update for host ${hostId}`, 'info');
    }
  }, [connectionState, sendMessage, log]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // 연결 상태 계산
  const isConnected = connectionState === 'connected';

  return {
    connectionState,
    isConnected,
    processData,
    lastUpdate,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    requestUpdate,
    stats
  };
}