/**
 * ProcessFilter Component
 * 프로세스 필터링 컴포넌트
 */

import React from 'react';
import { ProcessFilter as ProcessFilterType, ProcessState, ProcessFilterProps } from '@/types/process-monitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Filter, X, RotateCcw } from 'lucide-react';

export function ProcessFilter({ 
  filter, 
  onFilterChange, 
  onClearFilter 
}: ProcessFilterProps) {
  const updateFilter = (updates: Partial<ProcessFilterType>) => {
    onFilterChange({ ...filter, ...updates });
  };

  const handleClearFilter = () => {
    onClearFilter();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>프로세스 필터</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilter}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>초기화</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 사용자 필터 */}
          <div className="space-y-2">
            <Label htmlFor="user-filter">사용자</Label>
            <Input
              id="user-filter"
              placeholder="사용자명 입력..."
              value={filter.user || ''}
              onChange={(e) => updateFilter({ user: e.target.value || undefined })}
            />
          </div>

          {/* 명령어 필터 */}
          <div className="space-y-2">
            <Label htmlFor="command-filter">명령어</Label>
            <Input
              id="command-filter"
              placeholder="명령어 검색..."
              value={filter.command || ''}
              onChange={(e) => updateFilter({ command: e.target.value || undefined })}
            />
          </div>

          {/* 프로세스 상태 필터 */}
          <div className="space-y-2">
            <Label>프로세스 상태</Label>
            <Select 
              value={filter.state || 'all'} 
              onValueChange={(value) => 
                updateFilter({ state: value === 'all' ? undefined : value as ProcessState })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value={ProcessState.Running}>실행 중 (R)</SelectItem>
                <SelectItem value={ProcessState.Sleeping}>대기 중 (S)</SelectItem>
                <SelectItem value={ProcessState.Waiting}>대기 중 차단 (D)</SelectItem>
                <SelectItem value={ProcessState.Zombie}>좀비 (Z)</SelectItem>
                <SelectItem value={ProcessState.Stopped}>중지됨 (T)</SelectItem>
                <SelectItem value={ProcessState.Tracing}>추적 중 (t)</SelectItem>
                <SelectItem value={ProcessState.Dead}>종료됨 (X)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CPU 사용률 범위 */}
          <div className="space-y-4">
            <Label>CPU 사용률 (%)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <Label className="text-sm w-12">최소:</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={filter.minCpu || ''}
                  onChange={(e) => updateFilter({ 
                    minCpu: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="w-20"
                />
              </div>
              <div className="flex items-center space-x-4">
                <Label className="text-sm w-12">최대:</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="100"
                  value={filter.maxCpu || ''}
                  onChange={(e) => updateFilter({ 
                    maxCpu: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {/* 메모리 사용률 범위 */}
          <div className="space-y-4">
            <Label>메모리 사용률 (%)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <Label className="text-sm w-12">최소:</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={filter.minMemory || ''}
                  onChange={(e) => updateFilter({ 
                    minMemory: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="w-20"
                />
              </div>
              <div className="flex items-center space-x-4">
                <Label className="text-sm w-12">최대:</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="100"
                  value={filter.maxMemory || ''}
                  onChange={(e) => updateFilter({ 
                    maxMemory: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {/* 필터 옵션들 */}
          <div className="space-y-4">
            <Label>필터 옵션</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="exclude-kernel"
                  checked={filter.excludeKernel || false}
                  onCheckedChange={(checked) => updateFilter({ excludeKernel: checked })}
                />
                <Label htmlFor="exclude-kernel" className="text-sm">
                  커널 프로세스 제외
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="exclude-zombies"
                  checked={filter.excludeZombies || false}
                  onCheckedChange={(checked) => updateFilter({ excludeZombies: checked })}
                />
                <Label htmlFor="exclude-zombies" className="text-sm">
                  좀비 프로세스 제외
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* 활성 필터 표시 */}
        {Object.keys(filter).length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">
                활성 필터: {Object.keys(filter).length}개
              </Label>
              <div className="flex flex-wrap gap-2">
                {filter.user && (
                  <div className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-md text-xs">
                    <span>사용자: {filter.user}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateFilter({ user: undefined })}
                      className="h-4 w-4 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {filter.command && (
                  <div className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-md text-xs">
                    <span>명령어: {filter.command}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateFilter({ command: undefined })}
                      className="h-4 w-4 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {filter.state && (
                  <div className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-md text-xs">
                    <span>상태: {filter.state}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateFilter({ state: undefined })}
                      className="h-4 w-4 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {(filter.minCpu !== undefined || filter.maxCpu !== undefined) && (
                  <div className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-md text-xs">
                    <span>
                      CPU: {filter.minCpu || 0}% - {filter.maxCpu || 100}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateFilter({ minCpu: undefined, maxCpu: undefined })}
                      className="h-4 w-4 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {(filter.minMemory !== undefined || filter.maxMemory !== undefined) && (
                  <div className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-md text-xs">
                    <span>
                      메모리: {filter.minMemory || 0}% - {filter.maxMemory || 100}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateFilter({ minMemory: undefined, maxMemory: undefined })}
                      className="h-4 w-4 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}