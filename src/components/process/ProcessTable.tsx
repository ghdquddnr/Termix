/**
 * ProcessTable Component
 * 프로세스 목록을 테이블 형태로 표시하는 컴포넌트
 */

import React, { useState, useMemo } from 'react';
import { 
  ProcessInfo, 
  ProcessSortField, 
  ProcessState, 
  ProcessStateLabels,
  ProcessSignal,
  ProcessSignalLabels,
  SystemInfo
} from '@/types/process-monitoring';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Play,
  Square,
  Settings,
  Trash2,
  RefreshCw,
  Cpu,
  MemoryStick,
  Clock,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface ProcessTableProps {
  processes: ProcessInfo[];
  systemInfo: SystemInfo;
  loading: boolean;
  onTerminateProcess: (pid: number, signal?: ProcessSignal) => Promise<void>;
  onChangePriority: (pid: number, priority: number) => Promise<void>;
  onRefresh: () => void;
  sortBy: ProcessSortField;
  sortOrder: 'asc' | 'desc';
  onSort: (field: ProcessSortField) => void;
}

interface TerminateDialogState {
  open: boolean;
  process: ProcessInfo | null;
  signal: ProcessSignal;
}

interface PriorityDialogState {
  open: boolean;
  process: ProcessInfo | null;
  priority: number;
}

export function ProcessTable({
  processes,
  systemInfo,
  loading,
  onTerminateProcess,
  onChangePriority,
  onRefresh,
  sortBy,
  sortOrder,
  onSort
}: ProcessTableProps) {
  const [terminateDialog, setTerminateDialog] = useState<TerminateDialogState>({
    open: false,
    process: null,
    signal: 'TERM'
  });

  const [priorityDialog, setPriorityDialog] = useState<PriorityDialogState>({
    open: false,
    process: null,
    priority: 0
  });

  // 정렬 아이콘 렌더링
  const renderSortIcon = (field: ProcessSortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // 프로세스 상태 배지 렌더링
  const renderStateBadge = (state: ProcessState) => {
    const getStateColor = (state: ProcessState) => {
      switch (state) {
        case ProcessState.Running:
          return 'bg-green-500 hover:bg-green-600';
        case ProcessState.Sleeping:
          return 'bg-blue-500 hover:bg-blue-600';
        case ProcessState.Waiting:
          return 'bg-yellow-500 hover:bg-yellow-600';
        case ProcessState.Zombie:
          return 'bg-red-500 hover:bg-red-600';
        case ProcessState.Stopped:
          return 'bg-gray-500 hover:bg-gray-600';
        default:
          return 'bg-gray-400 hover:bg-gray-500';
      }
    };

    return (
      <Badge className={`${getStateColor(state)} text-white border-0`}>
        {ProcessStateLabels[state]}
      </Badge>
    );
  };

  // 메모리 사용량 포맷팅
  const formatMemory = (kb: number) => {
    if (kb < 1024) return `${kb} KB`;
    if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
  };

  // CPU 사용률 색상
  const getCpuColor = (percent: number) => {
    if (percent >= 80) return 'text-red-500';
    if (percent >= 60) return 'text-yellow-500';
    if (percent >= 40) return 'text-blue-500';
    return 'text-green-500';
  };

  // 메모리 사용률 색상
  const getMemoryColor = (percent: number) => {
    if (percent >= 80) return 'text-red-500';
    if (percent >= 60) return 'text-yellow-500';
    if (percent >= 40) return 'text-blue-500';
    return 'text-green-500';
  };

  // 프로세스 종료 핸들러
  const handleTerminate = async () => {
    if (!terminateDialog.process) return;

    try {
      await onTerminateProcess(terminateDialog.process.pid, terminateDialog.signal);
      toast.success(`프로세스 ${terminateDialog.process.pid} 종료됨`);
      setTerminateDialog({ open: false, process: null, signal: 'TERM' });
      onRefresh();
    } catch (error) {
      toast.error(`프로세스 종료 실패: ${error}`);
    }
  };

  // 우선순위 변경 핸들러
  const handlePriorityChange = async () => {
    if (!priorityDialog.process) return;

    try {
      await onChangePriority(priorityDialog.process.pid, priorityDialog.priority);
      toast.success(`프로세스 ${priorityDialog.process.pid} 우선순위 변경됨`);
      setPriorityDialog({ open: false, process: null, priority: 0 });
      onRefresh();
    } catch (error) {
      toast.error(`우선순위 변경 실패: ${error}`);
    }
  };

  // 시스템 정보 요약
  const systemSummary = useMemo(() => {
    const totalMemoryMB = systemInfo.totalMemoryKB / 1024;
    const usedMemoryMB = systemInfo.usedMemoryKB / 1024;
    const memoryUsagePercent = (usedMemoryMB / totalMemoryMB) * 100;

    return {
      totalMemoryMB,
      usedMemoryMB,
      memoryUsagePercent,
      processCount: processes.length,
      runningProcesses: processes.filter(p => p.state === ProcessState.Running).length
    };
  }, [systemInfo, processes]);

  return (
    <div className="space-y-4">
      {/* 시스템 정보 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">CPU 코어</span>
          </div>
          <p className="text-2xl font-bold">{systemInfo.cpuCount}</p>
          <p className="text-xs text-muted-foreground">
            로드: {systemInfo.loadAverage.map(l => l.toFixed(2)).join(', ')}
          </p>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <MemoryStick className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">메모리</span>
          </div>
          <p className="text-2xl font-bold">
            {systemSummary.memoryUsagePercent.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {systemSummary.usedMemoryMB.toFixed(0)}MB / {systemSummary.totalMemoryMB.toFixed(0)}MB
          </p>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Play className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">실행 중</span>
          </div>
          <p className="text-2xl font-bold">{systemSummary.runningProcesses}</p>
          <p className="text-xs text-muted-foreground">
            전체 {systemSummary.processCount}개 프로세스
          </p>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">가동시간</span>
          </div>
          <p className="text-2xl font-bold">
            {Math.floor(systemInfo.uptime / 86400)}일
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.floor((systemInfo.uptime % 86400) / 3600)}시간 {Math.floor((systemInfo.uptime % 3600) / 60)}분
          </p>
        </div>
      </div>

      {/* 프로세스 테이블 */}
      <div className="border rounded-lg">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">프로세스 목록</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort(ProcessSortField.PID)}
              >
                <div className="flex items-center">
                  PID
                  {renderSortIcon(ProcessSortField.PID)}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort(ProcessSortField.USER)}
              >
                <div className="flex items-center">
                  사용자
                  {renderSortIcon(ProcessSortField.USER)}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort(ProcessSortField.CPU)}
              >
                <div className="flex items-center">
                  CPU%
                  {renderSortIcon(ProcessSortField.CPU)}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort(ProcessSortField.MEMORY)}
              >
                <div className="flex items-center">
                  메모리%
                  {renderSortIcon(ProcessSortField.MEMORY)}
                </div>
              </TableHead>
              <TableHead>상태</TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort(ProcessSortField.PRIORITY)}
              >
                <div className="flex items-center">
                  우선순위
                  {renderSortIcon(ProcessSortField.PRIORITY)}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => onSort(ProcessSortField.COMMAND)}
              >
                <div className="flex items-center">
                  명령어
                  {renderSortIcon(ProcessSortField.COMMAND)}
                </div>
              </TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>로딩 중...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : processes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  프로세스가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              processes.map((process) => (
                <TableRow key={process.pid} className="hover:bg-muted/50">
                  <TableCell className="font-mono">{process.pid}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{process.user}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={getCpuColor(process.cpuPercent)}>
                      {process.cpuPercent.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span className={getMemoryColor(process.memoryPercent)}>
                        {process.memoryPercent.toFixed(1)}%
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {formatMemory(process.memoryKB)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderStateBadge(process.state)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {process.priority}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={process.fullCommand}>
                      {process.command}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>작업</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setPriorityDialog({
                            open: true,
                            process,
                            priority: process.priority
                          })}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          우선순위 변경
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setTerminateDialog({
                            open: true,
                            process,
                            signal: 'TERM'
                          })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          프로세스 종료
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 프로세스 종료 다이얼로그 */}
      <Sheet open={terminateDialog.open}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>프로세스 종료</SheetTitle>
            <SheetDescription>
              프로세스 {terminateDialog.process?.pid} ({terminateDialog.process?.command})를 종료하시겠습니까?
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="signal">종료 신호</Label>
              <select
                id="signal"
                className="w-full mt-1 p-2 border border-input bg-background rounded-md"
                value={terminateDialog.signal}
                onChange={(e) => setTerminateDialog({
                  ...terminateDialog,
                  signal: e.target.value as ProcessSignal
                })}
              >
                {Object.entries(ProcessSignalLabels).map(([signal, label]) => (
                  <option key={signal} value={signal}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setTerminateDialog({ open: false, process: null, signal: 'TERM' })}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
            >
              종료
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 우선순위 변경 다이얼로그 */}
      <Sheet open={priorityDialog.open}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>프로세스 우선순위 변경</SheetTitle>
            <SheetDescription>
              프로세스 {priorityDialog.process?.pid} ({priorityDialog.process?.command})의 우선순위를 변경합니다.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="priority">
                우선순위 (nice 값: -20 ~ 19, 낮을수록 높은 우선순위)
              </Label>
              <Input
                id="priority"
                type="number"
                min="-20"
                max="19"
                value={priorityDialog.priority}
                onChange={(e) => setPriorityDialog({
                  ...priorityDialog,
                  priority: parseInt(e.target.value, 10) || 0
                })}
                className="mt-1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                현재 우선순위: {priorityDialog.process?.priority}
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setPriorityDialog({ open: false, process: null, priority: 0 })}
            >
              취소
            </Button>
            <Button onClick={handlePriorityChange}>
              변경
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}