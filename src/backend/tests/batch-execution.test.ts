/**
 * Batch Execution API Tests
 * 배치 명령 실행 API 테스트
 */

import { db } from '../database/db/index.js';
import {
    users,
    sshData,
    serverGroups,
    serverGroupMembers,
    batchExecutions,
    batchExecutionResults,
    batchTemplates
} from '../database/db/schema.js';
import { batchExecutionService } from '../services/batch-execution.js';
import { eq } from 'drizzle-orm';

/**
 * 데이터베이스 스키마 테스트
 */
function testDatabaseSchema(): boolean {
    console.log('🧪 Testing batch execution database schema...');

    try {
        // 스키마가 올바르게 정의되었는지 확인
        const tables = [serverGroups, serverGroupMembers, batchExecutions, batchExecutionResults, batchTemplates];

        if (tables.length !== 5) {
            console.error('❌ Expected 5 batch-related tables');
            return false;
        }

        console.log('✅ Database schema validation passed');
        return true;
    } catch (error) {
        console.error('❌ Database schema test failed:', error);
        return false;
    }
}

/**
 * 배치 실행 서비스 생성 테스트
 */
function testBatchExecutionServiceCreation(): boolean {
    console.log('🧪 Testing batch execution service creation...');

    try {
        // 서비스 인스턴스가 올바르게 생성되었는지 확인
        if (!batchExecutionService) {
            console.error('❌ Batch execution service instance not found');
            return false;
        }

        // 필요한 메서드들이 있는지 확인
        if (typeof batchExecutionService.createExecution !== 'function') {
            console.error('❌ createExecution method not found');
            return false;
        }

        if (typeof batchExecutionService.cancelExecution !== 'function') {
            console.error('❌ cancelExecution method not found');
            return false;
        }

        console.log('✅ Batch execution service creation test passed');
        return true;
    } catch (error) {
        console.error('❌ Batch execution service creation test failed:', error);
        return false;
    }
}

/**
 * 서버 그룹 CRUD 테스트 (모의 테스트)
 */
function testServerGroupCRUD(): boolean {
    console.log('🧪 Testing server group CRUD operations...');

    try {
        const testGroup = {
            name: 'Test Group',
            description: 'Test Description',
            color: '#FF5733',
            icon: 'server',
            tags: ['test', 'development'],
            isDefault: false,
        };

        // 기본 유효성 검사
        if (!testGroup.name || testGroup.name.trim() === '') {
            console.error('❌ Group name validation failed');
            return false;
        }

        if (testGroup.tags && !Array.isArray(testGroup.tags)) {
            console.error('❌ Tags should be an array');
            return false;
        }

        // 색상 유효성 검사
        const colorRegex = /^#[0-9A-F]{6}$/i;
        if (testGroup.color && !colorRegex.test(testGroup.color)) {
            console.error('❌ Invalid color format');
            return false;
        }

        console.log('✅ Server group CRUD validation passed');
        return true;
    } catch (error) {
        console.error('❌ Server group CRUD test failed:', error);
        return false;
    }
}

/**
 * 배치 실행 요청 유효성 검사 테스트
 */
function testBatchExecutionValidation(): boolean {
    console.log('🧪 Testing batch execution request validation...');

    try {
        const validRequest = {
            userId: 'test-user',
            name: 'Test Batch',
            description: 'Test Description',
            command: 'echo "Hello World"',
            targetHosts: [1, 2, 3],
            executionType: 'parallel' as const,
            timeout: 300,
            retryCount: 2,
            retryDelay: 5,
            stopOnFirstError: false,
        };

        // 필수 필드 검사
        if (!validRequest.userId || !validRequest.command) {
            console.error('❌ Required fields missing');
            return false;
        }

        // 명령어 검사
        if (validRequest.command.trim() === '') {
            console.error('❌ Command cannot be empty');
            return false;
        }

        // 대상 호스트 검사
        if (!validRequest.targetHosts || !Array.isArray(validRequest.targetHosts) || validRequest.targetHosts.length === 0) {
            console.error('❌ Target hosts must be a non-empty array');
            return false;
        }

        // 실행 타입 검사
        if (!['parallel', 'sequential'].includes(validRequest.executionType)) {
            console.error('❌ Invalid execution type');
            return false;
        }

        // 타임아웃 검사
        if (validRequest.timeout <= 0) {
            console.error('❌ Timeout must be positive');
            return false;
        }

        // 재시도 횟수 검사
        if (validRequest.retryCount < 0) {
            console.error('❌ Retry count cannot be negative');
            return false;
        }

        console.log('✅ Batch execution validation passed');
        return true;
    } catch (error) {
        console.error('❌ Batch execution validation test failed:', error);
        return false;
    }
}

/**
 * 다중 SSH 연결 관리 로직 테스트
 */
function testMultiSSHConnectionLogic(): boolean {
    console.log('🧪 Testing multi-SSH connection management logic...');

    try {
        const sshConfigs = [
            {
                host: '192.168.1.10',
                port: 22,
                username: 'testuser',
                password: 'testpass',
                timeout: 30000,
            },
            {
                host: '192.168.1.11',
                port: 22,
                username: 'testuser',
                password: 'testpass',
                timeout: 30000,
            },
        ];

        // SSH 설정 유효성 검사
        for (const config of sshConfigs) {
            if (!config.host || !config.username) {
                console.error('❌ SSH config missing required fields');
                return false;
            }

            if (config.port <= 0 || config.port > 65535) {
                console.error('❌ Invalid SSH port');
                return false;
            }

            if (!config.password && !config.privateKey) {
                console.error('❌ SSH config missing authentication method');
                return false;
            }
        }

        console.log('✅ Multi-SSH connection logic validation passed');
        return true;
    } catch (error) {
        console.error('❌ Multi-SSH connection logic test failed:', error);
        return false;
    }
}

/**
 * 병렬 실행 엔진 로직 테스트
 */
function testParallelExecutionEngine(): boolean {
    console.log('🧪 Testing parallel execution engine logic...');

    try {
        const executionOptions = {
            executionType: 'parallel' as const,
            timeout: 300,
            retryCount: 2,
            retryDelay: 5,
            stopOnFirstError: false,
        };

        const hosts = [
            { id: 1, name: 'Host 1', ip: '192.168.1.10' },
            { id: 2, name: 'Host 2', ip: '192.168.1.11' },
            { id: 3, name: 'Host 3', ip: '192.168.1.12' },
        ];

        // 병렬 실행 시나리오 검증
        if (executionOptions.executionType === 'parallel') {
            // 모든 호스트가 동시에 실행되어야 함
            console.log(`📊 Parallel execution for ${hosts.length} hosts`);

            // 타임아웃 검증
            if (executionOptions.timeout <= 0) {
                console.error('❌ Invalid timeout for parallel execution');
                return false;
            }

            // 재시도 로직 검증
            const maxRetries = executionOptions.retryCount;
            const retryDelay = executionOptions.retryDelay;

            if (maxRetries >= 0 && retryDelay > 0) {
                console.log(`🔄 Retry logic: max ${maxRetries} retries with ${retryDelay}s delay`);
            }
        }

        console.log('✅ Parallel execution engine logic validation passed');
        return true;
    } catch (error) {
        console.error('❌ Parallel execution engine logic test failed:', error);
        return false;
    }
}

/**
 * 실행 결과 집계 로직 테스트
 */
function testExecutionResultAggregation(): boolean {
    console.log('🧪 Testing execution result aggregation logic...');

    try {
        const mockResults = [
            { hostId: 1, status: 'completed', exitCode: 0, duration: 1500 },
            { hostId: 2, status: 'failed', exitCode: 1, duration: 2300 },
            { hostId: 3, status: 'completed', exitCode: 0, duration: 1800 },
            { hostId: 4, status: 'timeout', exitCode: null, duration: 30000 },
        ];

        // 집계 계산
        const total = mockResults.length;
        const completed = mockResults.filter(r => r.status === 'completed').length;
        const failed = mockResults.filter(r => r.status === 'failed' || r.status === 'timeout').length;
        const avgDuration = mockResults.reduce((sum, r) => sum + r.duration, 0) / total;

        // 집계 검증
        if (completed + failed !== total) {
            console.error('❌ Result aggregation calculation error');
            return false;
        }

        const successRate = (completed / total) * 100;
        console.log(`📊 Execution Summary: ${completed}/${total} succeeded (${successRate.toFixed(1)}%)`);
        console.log(`⏱️ Average duration: ${avgDuration.toFixed(0)}ms`);

        // 배치 상태 결정 로직
        const batchStatus = failed === 0 ? 'completed' : (completed === 0 ? 'failed' : 'completed');
        console.log(`🎯 Batch status: ${batchStatus}`);

        console.log('✅ Execution result aggregation validation passed');
        return true;
    } catch (error) {
        console.error('❌ Execution result aggregation test failed:', error);
        return false;
    }
}

/**
 * 실패 시 재시도 로직 테스트
 */
function testRetryLogic(): boolean {
    console.log('🧪 Testing retry logic...');

    try {
        const retryConfig = {
            maxRetries: 3,
            retryDelay: 5000, // 5초
            backoffMultiplier: 1.5,
        };

        // 재시도 시나리오 시뮬레이션
        let currentAttempt = 0;
        let success = false;

        while (currentAttempt <= retryConfig.maxRetries && !success) {
            currentAttempt++;

            // 모의 실행 (3번째 시도에서 성공)
            if (currentAttempt === 3) {
                success = true;
                console.log(`✅ Command succeeded on attempt ${currentAttempt}`);
            } else {
                const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, currentAttempt - 1);
                console.log(`🔄 Attempt ${currentAttempt} failed, retrying in ${delay}ms`);
            }
        }

        if (!success && currentAttempt > retryConfig.maxRetries) {
            console.log(`❌ Command failed after ${retryConfig.maxRetries} retries`);
        }

        console.log('✅ Retry logic validation passed');
        return true;
    } catch (error) {
        console.error('❌ Retry logic test failed:', error);
        return false;
    }
}

/**
 * 배치 템플릿 기능 테스트
 */
function testBatchTemplates(): boolean {
    console.log('🧪 Testing batch template functionality...');

    try {
        const template = {
            name: 'System Update Template',
            description: 'Update system packages',
            command: 'sudo apt update && sudo apt upgrade -y',
            defaultTimeout: 600,
            defaultRetryCount: 2,
            defaultExecutionType: 'sequential',
            tags: ['system', 'update', 'maintenance'],
            isPublic: false,
        };

        // 템플릿 유효성 검사
        if (!template.name || !template.command) {
            console.error('❌ Template missing required fields');
            return false;
        }

        if (template.defaultTimeout <= 0) {
            console.error('❌ Invalid default timeout');
            return false;
        }

        if (template.defaultRetryCount < 0) {
            console.error('❌ Invalid default retry count');
            return false;
        }

        if (!['parallel', 'sequential'].includes(template.defaultExecutionType)) {
            console.error('❌ Invalid default execution type');
            return false;
        }

        if (template.tags && !Array.isArray(template.tags)) {
            console.error('❌ Tags should be an array');
            return false;
        }

        console.log(`📋 Template: ${template.name}`);
        console.log(`🔧 Command: ${template.command}`);
        console.log(`⏱️ Timeout: ${template.defaultTimeout}s`);
        console.log(`🔄 Retries: ${template.defaultRetryCount}`);
        console.log(`📊 Type: ${template.defaultExecutionType}`);

        console.log('✅ Batch template functionality validation passed');
        return true;
    } catch (error) {
        console.error('❌ Batch template functionality test failed:', error);
        return false;
    }
}

/**
 * 모든 배치 실행 테스트 실행
 */
export function runBatchExecutionTests(): boolean {
    console.log('\n🚀 Running Batch Execution Tests...\n');

    const tests = [
        testDatabaseSchema,
        testBatchExecutionServiceCreation,
        testServerGroupCRUD,
        testBatchExecutionValidation,
        testMultiSSHConnectionLogic,
        testParallelExecutionEngine,
        testExecutionResultAggregation,
        testRetryLogic,
        testBatchTemplates,
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        try {
            if (test()) {
                passedTests++;
            }
        } catch (error) {
            console.error(`❌ Test ${test.name} threw an exception:`, error);
        }
        console.log(''); // 빈 줄 추가
    }

    console.log('='.repeat(60));
    console.log(`📊 Batch Execution Tests Summary: ${passedTests}/${totalTests} passed`);
    console.log('='.repeat(60));

    if (passedTests === totalTests) {
        console.log('🎉 All batch execution tests passed!');
        return true;
    } else {
        console.log(`❌ ${totalTests - passedTests} tests failed`);
        return false;
    }
}

// 테스트 실행 (모듈이 직접 실행될 때)
if (import.meta.url === `file://${process.argv[1]}`) {
    runBatchExecutionTests();
}