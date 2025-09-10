/**
 * ProcessMonitor Component
 * 프로세스 모니터링 메인 페이지 컴포넌트
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ProcessInfo, 
  ProcessListResponse,
  ProcessSortField, 
  ProcessFilter,
  ProcessState,
  ProcessSignal,
  HostInfo,
  RealtimeSettings
} from '@/types/process-monitoring';
import { 
  getProcessList, 
  getMonitoringHosts,
  terminateProcess,
  changeProcessPriority
} from '@/ui/main-axios';
import { ProcessTable } from './ProcessTable';
import { ProcessFilter as ProcessFilterComponent } from './ProcessFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Settings,
  Filter,
  Server,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ProcessMonitorProps {
  isTopbarOpen?: boolean;
}

const DEFAULT_REFRESH_INTERVALS = [
  { value: 1000, label: '1초' },
  { value: 2000, label: '2초' },
  { value: 5000, label: '5초' },
  { value: 10000, label: '10초' },
  { value: 30000, label: '30초' }
];

export function ProcessMonitor({ isTopbarOpen = true }: ProcessMonitorProps) {
  // 상태 관리
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [processData, setProcessData] = useState<ProcessListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 정렬 및 필터링
  const [sortBy, setSortBy] = useState<ProcessSortField>(ProcessSortField.CPU);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<ProcessFilter>({});
  const [showFilter, setShowFilter] = useState(false);
  
  // 실시간 업데이트
  const [realtimeSettings, setRealtimeSettings] = useState<RealtimeSettings>({
    enabled: false,
    interval: 5000,
    autoStart: false
  });
  
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // 호스트 목록 로드
  useEffect(() => {
    const loadHosts = async () => {
      try {
        const hostList = await getMonitoringHosts();
        setHosts(hostList);
        if (hostList.length > 0 && !selectedHostId) {
          setSelectedHostId(hostList[0].id.toString());
        }
      } catch (error) {
        console.error('Failed to load hosts:', error);
        toast.error('호스트 목록 로드 실패');
      }
    };

    loadHosts();
  }, [selectedHostId]);

  // 프로세스 데이터 로드
  const loadProcessData = useCallback(async () => {
    if (!selectedHostId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getProcessList(selectedHostId, {
        sortBy,
        sortOrder,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: 100 // 기본 100개 제한
      });
      
      setProcessData(data);
    } catch (error) {
      console.error('Failed to load process data:', error);
      setError('프로세스 데이터 로드 실패');
      toast.error('프로세스 데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [selectedHostId, sortBy, sortOrder, filter]);

  // 초기 데이터 로드
  useEffect(() => {
    if (selectedHostId) {
      loadProcessData();
    }
  }, [selectedHostId, loadProcessData]);

  // 실시간 업데이트 관리
  useEffect(() => {
    if (realtimeSettings.enabled && selectedHostId) {
      const interval = setInterval(loadProcessData, realtimeSettings.interval);
      setRefreshInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [realtimeSettings.enabled, realtimeSettings.interval, selectedHostId, loadProcessData, refreshInterval]);

  // 정렬 핸들러
  const handleSort = (field: ProcessSortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 프로세스 종료 핸들러
  const handleTerminateProcess = async (pid: number, signal: ProcessSignal = 'TERM') => {
    if (!selectedHostId) return;

    try {
      await terminateProcess(selectedHostId, pid, signal);
      toast.success(`프로세스 ${pid} 종료됨`);
      await loadProcessData(); // 데이터 새로고침
    } catch (error) {
      console.error('Failed to terminate process:', error);
      toast.error(`프로세스 종료 실패: ${error}`);
      throw error;
    }
  };

  // 우선순위 변경 핸들러
  const handleChangePriority = async (pid: number, priority: number) => {
    if (!selectedHostId) return;

    try {
      await changeProcessPriority(selectedHostId, pid, priority);
      toast.success(`프로세스 ${pid} 우선순위 변경됨`);
      await loadProcessData(); // 데이터 새로고침
    } catch (error) {
      console.error('Failed to change priority:', error);
      toast.error(`우선순위 변경 실패: ${error}`);
      throw error;
    }
  };

  // 실시간 업데이트 토글
  const toggleRealtime = () => {
    setRealtimeSettings(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  // 선택된 호스트 정보
  const selectedHost = useMemo(() => {
    return hosts.find(host => host.id.toString() === selectedHostId);
  }, [hosts, selectedHostId]);

  // 연결 상태
  const connectionStatus = useMemo(() => {
    if (!selectedHostId) return 'disconnected';
    if (error) return 'error';
    if (processData) return 'connected';
    return 'connecting';
  }, [selectedHostId, error, processData]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '연결됨';
      case 'connecting':
        return '연결 중...';
      case 'error':
        return '연결 오류';
      default:
        return '연결 안됨';
    }
  };

  return (
    <div 
      className="h-screen overflow-auto bg-background"
      style={{
        paddingTop: isTopbarOpen ? '70px' : '20px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px'
      }}
    >
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">프로세스 모니터링</h1>
            <p className="text-muted-foreground">
              서버의 실행 중인 프로세스를 모니터링하고 관리합니다.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 연결 상태 */}
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm">{getStatusText()}</span>
            </div>
            
            {/* 실시간 업데이트 토글 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="realtime"
                checked={realtimeSettings.enabled}
                onCheckedChange={toggleRealtime}
                disabled={!selectedHostId || connectionStatus !== 'connected'}
              />
              <Label htmlFor="realtime" className="text-sm">
                실시간 업데이트
              </Label>
            </div>
          </div>
        </div>

        {/* 컨트롤 패널 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>서버 선택 및 설정</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 호스트 선택 */}
              <div className="space-y-2">
                <Label>서버 호스트</Label>
                <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                  <SelectTrigger>
                    <SelectValue placeholder="호스트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {hosts.map((host) => (
                      <SelectItem key={host.id} value={host.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <span>{host.host}:{host.port}</span>
                          <Badge variant="secondary">{host.username}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedHost && (
                  <div className="text-xs text-muted-foreground">
                    {selectedHost.host}:{selectedHost.port} ({selectedHost.username})
                  </div>
                )}
              </div>

              {/* 새로고침 간격 */}
              <div className="space-y-2">
                <Label>새로고침 간격</Label>
                <Select 
                  value={realtimeSettings.interval.toString()} 
                  onValueChange={(value) => setRealtimeSettings(prev => ({
                    ...prev,
                    interval: parseInt(value, 10)
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_REFRESH_INTERVALS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 필터 토글 */}
              <div className="space-y-2">
                <Label>필터 옵션</Label>
                <Button
                  variant={showFilter ? "default" : "outline"}
                  onClick={() => setShowFilter(!showFilter)}
                  className="w-full"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {showFilter ? '필터 숨기기' : '필터 표시'}
                </Button>
              </div>

              {/* 수동 새로고침 */}
              <div className="space-y-2">
                <Label>수동 새로고침</Label>
                <Button
                  onClick={loadProcessData}
                  disabled={loading || !selectedHostId}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 필터 컴포넌트 */}
        {showFilter && (
          <ProcessFilterComponent
            filter={filter}
            onFilterChange={setFilter}
            onClearFilter={() => setFilter({})}
          />
        )}

        {/* 에러 표시 */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-700">
                <XCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 프로세스 테이블 */}
        {processData && (
          <ProcessTable
            processes={processData.processes}
            systemInfo={processData.systemInfo}
            loading={loading}
            onTerminateProcess={handleTerminateProcess}
            onChangePriority={handleChangePriority}
            onRefresh={loadProcessData}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}

        {/* 빈 상태 */}
        {!selectedHostId && hosts.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Server className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">호스트가 없습니다</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  SSH 호스트를 먼저 추가해주세요.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}