import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Server, Play, Square, Save, Clock, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getSSHHosts,
  getServerGroups,
  createBatchExecution,
  getBatchExecutions,
  getBatchExecutionDetails,
  cancelBatchExecution,
  getBatchTemplates,
  createBatchTemplate,
  type BatchExecutionRequest,
  type BatchExecution as BatchExecutionType,
  type ServerGroup,
  type BatchTemplate,
  type HostExecutionResult
} from '@/ui/main-axios';
import { toast } from 'sonner';

interface BatchExecutionProps {
  onSelectView: () => void;
  isTopbarOpen: boolean;
}

export function BatchExecution({ onSelectView, isTopbarOpen }: BatchExecutionProps) {

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    command: '',
    executionType: 'parallel' as 'parallel' | 'sequential',
    timeout: 300,
    retryCount: 0,
    retryDelay: 5,
    stopOnFirstError: false,
  });

  // Server selection state
  const [servers, setServers] = useState<any[]>([]);
  const [serverGroups, setServerGroups] = useState<ServerGroup[]>([]);
  const [selectedServers, setSelectedServers] = useState<number[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [useServerGroup, setUseServerGroup] = useState(false);

  // Execution state
  const [executions, setExecutions] = useState<BatchExecutionType[]>([]);
  const [currentExecution, setCurrentExecution] = useState<BatchExecutionType | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<BatchTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<BatchTemplate | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState('execution');
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [serversData, groupsData, templatesData, executionsData] = await Promise.all([
        getSSHHosts(),
        getServerGroups(),
        getBatchTemplates(),
        getBatchExecutions(1, 10)
      ]);

      setServers(serversData || []);
      setServerGroups(groupsData || []);
      setTemplates(templatesData || []);
      setExecutions(executionsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  // Handle form changes
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle server selection
  const toggleServerSelection = (serverId: number) => {
    setSelectedServers(prev =>
      prev.includes(serverId)
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const selectAllServers = () => {
    if (selectedServers.length === servers.length) {
      setSelectedServers([]);
    } else {
      setSelectedServers(servers.map(s => s.id));
    }
  };

  // Handle template selection
  const applyTemplate = (template: BatchTemplate) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      command: template.command,
      executionType: template.defaultExecutionType,
      timeout: template.defaultTimeout,
      retryCount: template.defaultRetryCount,
    }));
    setSelectedTemplate(template);
    toast.success('템플릿이 적용되었습니다');
  };

  // Save as template
  const saveAsTemplate = async () => {
    if (!formData.name.trim() || !formData.command.trim()) {
      toast.error('템플릿 이름과 명령어는 필수입니다');
      return;
    }

    try {
      await createBatchTemplate({
        name: formData.name,
        description: formData.description,
        command: formData.command,
        defaultTimeout: formData.timeout,
        defaultRetryCount: formData.retryCount,
        defaultExecutionType: formData.executionType,
      });

      await loadData();
      toast.success('템플릿이 저장되었습니다');
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('템플릿 저장 실패');
    }
  };

  // Execute batch command
  const executeBatch = async () => {
    if (!formData.command.trim()) {
      toast.error('명령어를 입력해주세요');
      return;
    }

    if (!useServerGroup && selectedServers.length === 0) {
      toast.error('실행할 서버를 선택해주세요');
      return;
    }

    if (useServerGroup && !selectedGroup) {
      toast.error('서버 그룹을 선택해주세요');
      return;
    }

    const request: BatchExecutionRequest = {
      ...formData,
      serverGroupId: useServerGroup ? selectedGroup : null,
      targetHosts: useServerGroup ? null : selectedServers,
    };

    setIsExecuting(true);
    try {
      const execution = await createBatchExecution(request);
      setCurrentExecution(execution);
      setActiveTab('results');

      // Poll for updates
      pollExecutionStatus(execution.id);

      toast.success('배치 실행이 시작되었습니다');
    } catch (error) {
      console.error('Failed to execute batch:', error);
      toast.error('배치 실행 실패');
    } finally {
      setIsExecuting(false);
    }
  };

  // Poll execution status
  const pollExecutionStatus = (executionId: number) => {
    const interval = setInterval(async () => {
      try {
        const execution = await getBatchExecutionDetails(executionId);
        setCurrentExecution(execution);

        if (execution.status === 'completed' || execution.status === 'failed' || execution.status === 'cancelled') {
          clearInterval(interval);
          setIsExecuting(false);
          await loadData();
        }
      } catch (error) {
        console.error('Failed to poll execution status:', error);
        clearInterval(interval);
        setIsExecuting(false);
      }
    }, 2000);

    return interval;
  };

  // Cancel execution
  const cancelExecution = async (executionId: number) => {
    try {
      await cancelBatchExecution(executionId);
      toast.success('배치 실행이 취소되었습니다');
      await loadData();
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      toast.error('배치 실행 취소 실패');
    }
  };

  // Get execution status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  // Get execution status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'running': return <Play className="w-4 h-4" />;
      case 'cancelled': return <Square className="w-4 h-4" />;
      default: return <Timer className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          <h1 className="text-lg font-semibold">배치 실행</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData()}
          disabled={loading}
        >
          새로고침
        </Button>
      </div>

      <div className="flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="execution">배치 실행</TabsTrigger>
            <TabsTrigger value="results">실행 결과</TabsTrigger>
            <TabsTrigger value="history">실행 이력</TabsTrigger>
          </TabsList>

          <TabsContent value="execution" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Command Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">명령어 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">실행 이름 (선택사항)</Label>
                    <Input
                      id="name"
                      placeholder="배치 실행 이름"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="command">실행할 명령어</Label>
                    <Textarea
                      id="command"
                      placeholder="실행할 명령어를 입력하세요"
                      rows={3}
                      value={formData.command}
                      onChange={(e) => updateFormData('command', e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">설명 (선택사항)</Label>
                    <Textarea
                      id="description"
                      placeholder="실행에 대한 설명"
                      rows={2}
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="executionType">실행 방식</Label>
                      <Select
                        value={formData.executionType}
                        onValueChange={(value) => updateFormData('executionType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parallel">병렬 실행</SelectItem>
                          <SelectItem value="sequential">순차 실행</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeout">타임아웃 (초)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        min="1"
                        max="3600"
                        value={formData.timeout}
                        onChange={(e) => updateFormData('timeout', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="retryCount">재시도 횟수</Label>
                      <Input
                        id="retryCount"
                        type="number"
                        min="0"
                        max="10"
                        value={formData.retryCount}
                        onChange={(e) => updateFormData('retryCount', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retryDelay">재시도 간격 (초)</Label>
                      <Input
                        id="retryDelay"
                        type="number"
                        min="1"
                        max="60"
                        value={formData.retryDelay}
                        onChange={(e) => updateFormData('retryDelay', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="stopOnFirstError"
                      checked={formData.stopOnFirstError}
                      onCheckedChange={(checked) => updateFormData('stopOnFirstError', checked)}
                    />
                    <Label htmlFor="stopOnFirstError">첫 번째 오류 시 중단</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Server Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">서버 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="useServerGroup"
                      checked={useServerGroup}
                      onCheckedChange={setUseServerGroup}
                    />
                    <Label htmlFor="useServerGroup">서버 그룹 사용</Label>
                  </div>

                  {useServerGroup ? (
                    <div className="space-y-2">
                      <Label>서버 그룹 선택</Label>
                      <Select
                        value={selectedGroup?.toString() || ""}
                        onValueChange={(value) => setSelectedGroup(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="서버 그룹 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {serverGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.name} ({group.memberCount}개 서버)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>서버 목록</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllServers}
                        >
                          {selectedServers.length === servers.length ? '전체 해제' : '전체 선택'}
                        </Button>
                      </div>

                      <ScrollArea className="h-48 border rounded-md p-2">
                        <div className="space-y-2">
                          {servers.map((server) => (
                            <div key={server.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`server-${server.id}`}
                                checked={selectedServers.includes(server.id)}
                                onCheckedChange={() => toggleServerSelection(server.id)}
                              />
                              <Label
                                htmlFor={`server-${server.id}`}
                                className="flex-1 text-sm"
                              >
                                <span className="font-medium">{server.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  {server.username}@{server.ip}:{server.port}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <p className="text-sm text-muted-foreground">
                        {selectedServers.length}개 서버 선택됨
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Templates */}
            {templates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">템플릿</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {templates.map((template) => (
                      <Button
                        key={template.id}
                        variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => applyTemplate(template)}
                        className="justify-start"
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                onClick={saveAsTemplate}
                disabled={!formData.name.trim() || !formData.command.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                템플릿 저장
              </Button>

              <Button
                onClick={executeBatch}
                disabled={isExecuting || !formData.command.trim()}
              >
                <Play className="w-4 h-4 mr-2" />
                {isExecuting ? '실행 중...' : '배치 실행'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-4">
            {currentExecution ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {currentExecution.name || `실행 #${currentExecution.id}`}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(currentExecution.status)}>
                        {getStatusIcon(currentExecution.status)}
                        <span className="ml-1">{currentExecution.status}</span>
                      </Badge>
                      {currentExecution.status === 'running' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelExecution(currentExecution.id)}
                        >
                          <Square className="w-4 h-4 mr-2" />
                          취소
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{currentExecution.totalHosts}</div>
                      <div className="text-sm text-muted-foreground">총 서버</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{currentExecution.completedHosts}</div>
                      <div className="text-sm text-muted-foreground">완료</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{currentExecution.failedHosts}</div>
                      <div className="text-sm text-muted-foreground">실패</div>
                    </div>
                  </div>

                  <Progress
                    value={(currentExecution.completedHosts + currentExecution.failedHosts) / currentExecution.totalHosts * 100}
                    className="w-full"
                  />

                  {currentExecution.results && currentExecution.results.length > 0 && (
                    <div className="space-y-2">
                      <Label>실행 결과</Label>
                      <ScrollArea className="h-64 border rounded-md p-2">
                        <div className="space-y-2">
                          {currentExecution.results.map((result) => (
                            <div key={result.id} className="border rounded-md p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{result.hostName}</span>
                                <Badge className={getStatusColor(result.status)}>
                                  {result.status}
                                </Badge>
                              </div>

                              {result.output && (
                                <div className="mt-2">
                                  <Label className="text-xs">출력:</Label>
                                  <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap">
                                    {result.output}
                                  </pre>
                                </div>
                              )}

                              {result.errorOutput && (
                                <div className="mt-2">
                                  <Label className="text-xs text-red-600">오류:</Label>
                                  <pre className="text-xs bg-red-50 p-2 rounded mt-1 whitespace-pre-wrap text-red-800">
                                    {result.errorOutput}
                                  </pre>
                                </div>
                              )}

                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                {result.duration && (
                                  <span>실행 시간: {result.duration}초</span>
                                )}
                                {result.exitCode !== null && (
                                  <span>종료 코드: {result.exitCode}</span>
                                )}
                                {result.retryAttempt > 0 && (
                                  <span>재시도: {result.retryAttempt}회</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">실행 중인 배치가 없습니다</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveTab('execution')}
                >
                  배치 실행하기
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">실행 이력</CardTitle>
              </CardHeader>
              <CardContent>
                {executions.length > 0 ? (
                  <div className="space-y-2">
                    {executions.map((execution) => (
                      <div key={execution.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {execution.name || `실행 #${execution.id}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {execution.command.length > 50
                                ? `${execution.command.substring(0, 50)}...`
                                : execution.command
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(execution.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(execution.status)}>
                              {execution.status}
                            </Badge>
                            <div className="text-sm text-muted-foreground mt-1">
                              {execution.completedHosts}/{execution.totalHosts} 완료
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">실행 이력이 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}