/**
 * WebSocket 실시간 통신 테스트 스크립트
 * Node.js 환경에서 WebSocket 연결을 테스트합니다.
 */

const WebSocket = require('ws');

// 설정
const WS_URL = 'ws://localhost:8086';
const TEST_HOST_ID = '1'; // 테스트할 호스트 ID
const TEST_DURATION = 30000; // 30초 테스트

// 통계
let stats = {
  messagesReceived: 0,
  messagesSent: 0,
  errors: 0,
  connectionAttempts: 0,
  lastMessageTime: null,
  startTime: Date.now()
};

// 로깅 함수
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// 메시지 전송 함수
function sendMessage(ws, message) {
  try {
    ws.send(JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    }));
    stats.messagesSent++;
    log(`Sent: ${message.type}`);
  } catch (error) {
    log(`Failed to send message: ${error.message}`, 'ERROR');
    stats.errors++;
  }
}

// WebSocket 연결 테스트
function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    let isResolved = false;
    stats.connectionAttempts++;
    
    log('Starting WebSocket connection test...');
    
    const ws = new WebSocket(WS_URL);
    
    // 연결 타임아웃
    const connectionTimeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        ws.close();
        reject(new Error('Connection timeout'));
      }
    }, 10000);
    
    ws.on('open', () => {
      log('WebSocket connected successfully');
      clearTimeout(connectionTimeout);
      
      // 하트비트 전송
      sendMessage(ws, { type: 'heartbeat' });
      
      // 프로세스 모니터링 구독
      sendMessage(ws, { 
        type: 'subscribe', 
        hostId: TEST_HOST_ID, 
        event: 'processes' 
      });
      
      // 즉시 업데이트 요청
      setTimeout(() => {
        sendMessage(ws, { 
          type: 'request_update', 
          hostId: TEST_HOST_ID 
        });
      }, 1000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        stats.messagesReceived++;
        stats.lastMessageTime = Date.now();
        
        log(`Received: ${message.type} ${message.hostId ? `(host: ${message.hostId})` : ''}`);
        
        // 메시지 타입별 처리
        switch (message.type) {
          case 'process_update':
            if (message.data && message.data.processes) {
              log(`Process data received: ${message.data.processes.length} processes`);
            }
            break;
          case 'heartbeat':
            log('Heartbeat received');
            break;
          case 'subscribed':
            log(`Successfully subscribed to ${message.hostId}`);
            break;
          case 'error':
            log(`Server error: ${message.error}`, 'ERROR');
            stats.errors++;
            break;
        }
      } catch (error) {
        log(`Failed to parse message: ${error.message}`, 'ERROR');
        stats.errors++;
      }
    });
    
    ws.on('close', (code, reason) => {
      log(`WebSocket closed: ${code} ${reason}`);
      if (!isResolved) {
        isResolved = true;
        clearTimeout(connectionTimeout);
        resolve(ws);
      }
    });
    
    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, 'ERROR');
      stats.errors++;
      if (!isResolved) {
        isResolved = true;
        clearTimeout(connectionTimeout);
        reject(error);
      }
    });
    
    // 테스트 종료 타이머
    setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        log('Test duration completed, closing connection...');
        sendMessage(ws, { 
          type: 'unsubscribe', 
          hostId: TEST_HOST_ID, 
          event: 'processes' 
        });
        setTimeout(() => ws.close(), 1000);
        clearTimeout(connectionTimeout);
        resolve(ws);
      }
    }, TEST_DURATION);
  });
}

// 재연결 테스트
function testReconnection() {
  return new Promise((resolve, reject) => {
    log('Starting reconnection test...');
    
    const ws = new WebSocket(WS_URL);
    let reconnected = false;
    
    ws.on('open', () => {
      log('Connected for reconnection test');
      
      // 구독 설정
      sendMessage(ws, { 
        type: 'subscribe', 
        hostId: TEST_HOST_ID, 
        event: 'processes' 
      });
      
      // 3초 후 연결 강제 종료
      setTimeout(() => {
        log('Forcibly closing connection to test reconnection...');
        ws.close();
      }, 3000);
    });
    
    ws.on('close', () => {
      if (!reconnected) {
        reconnected = true;
        log('Connection closed, attempting reconnection...');
        
        // 재연결 시도
        setTimeout(() => {
          const newWs = new WebSocket(WS_URL);
          
          newWs.on('open', () => {
            log('Reconnection successful');
            sendMessage(newWs, { type: 'heartbeat' });
            setTimeout(() => {
              newWs.close();
              resolve();
            }, 2000);
          });
          
          newWs.on('error', (error) => {
            log(`Reconnection failed: ${error.message}`, 'ERROR');
            reject(error);
          });
        }, 2000);
      }
    });
    
    ws.on('error', (error) => {
      log(`Reconnection test error: ${error.message}`, 'ERROR');
      reject(error);
    });
  });
}

// 부하 테스트
function testLoad() {
  return new Promise((resolve, reject) => {
    log('Starting load test with multiple connections...');
    
    const connections = [];
    const numConnections = 5;
    let completedConnections = 0;
    
    for (let i = 0; i < numConnections; i++) {
      const ws = new WebSocket(WS_URL);
      connections.push(ws);
      
      ws.on('open', () => {
        log(`Connection ${i + 1} opened`);
        sendMessage(ws, { 
          type: 'subscribe', 
          hostId: TEST_HOST_ID, 
          event: 'processes' 
        });
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'process_update') {
            log(`Connection ${i + 1} received process update`);
          }
        } catch (error) {
          // 무시
        }
      });
      
      ws.on('close', () => {
        completedConnections++;
        if (completedConnections === numConnections) {
          log('All connections closed');
          resolve();
        }
      });
      
      ws.on('error', (error) => {
        log(`Connection ${i + 1} error: ${error.message}`, 'ERROR');
        stats.errors++;
      });
    }
    
    // 10초 후 모든 연결 종료
    setTimeout(() => {
      log('Closing all load test connections...');
      connections.forEach((ws, index) => {
        if (ws.readyState === WebSocket.OPEN) {
          sendMessage(ws, { 
            type: 'unsubscribe', 
            hostId: TEST_HOST_ID, 
            event: 'processes' 
          });
          setTimeout(() => ws.close(), 500);
        }
      });
    }, 10000);
  });
}

// 통계 출력
function printStats() {
  const duration = (Date.now() - stats.startTime) / 1000;
  const avgMessagesPerSecond = stats.messagesReceived / duration;
  
  log('='.repeat(50));
  log('TEST STATISTICS');
  log('='.repeat(50));
  log(`Duration: ${duration.toFixed(2)} seconds`);
  log(`Connection attempts: ${stats.connectionAttempts}`);
  log(`Messages sent: ${stats.messagesSent}`);
  log(`Messages received: ${stats.messagesReceived}`);
  log(`Average messages/second: ${avgMessagesPerSecond.toFixed(2)}`);
  log(`Errors: ${stats.errors}`);
  
  if (stats.lastMessageTime) {
    const timeSinceLastMessage = (Date.now() - stats.lastMessageTime) / 1000;
    log(`Time since last message: ${timeSinceLastMessage.toFixed(2)} seconds`);
  }
  
  log('='.repeat(50));
}

// 메인 테스트 실행
async function runTests() {
  try {
    log('Starting WebSocket tests...');
    log(`Target: ${WS_URL}`);
    log(`Test host ID: ${TEST_HOST_ID}`);
    log(`Test duration: ${TEST_DURATION / 1000} seconds`);
    log('');
    
    // 1. 기본 연결 테스트
    log('1. Basic connection test');
    await testWebSocketConnection();
    
    // 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. 재연결 테스트
    log('2. Reconnection test');
    await testReconnection();
    
    // 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 부하 테스트
    log('3. Load test');
    await testLoad();
    
    log('All tests completed successfully!');
    
  } catch (error) {
    log(`Test failed: ${error.message}`, 'ERROR');
    stats.errors++;
  } finally {
    printStats();
    process.exit(stats.errors > 0 ? 1 : 0);
  }
}

// 테스트 실행
if (require.main === module) {
  runTests();
}

module.exports = {
  testWebSocketConnection,
  testReconnection,
  testLoad,
  stats
};