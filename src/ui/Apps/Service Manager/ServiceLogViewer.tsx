import React, { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { 
    RefreshCw, 
    Download, 
    Search, 
    X, 
    Calendar,
    Play,
    Pause,
    RotateCcw,
    ArrowDown,
    Filter,
    Copy,
    Check
} from "lucide-react";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue 
} from "@/components/ui/select.tsx";
import { getServiceLogs, type ServiceLogResponse, type ServiceLogEntry } from "@/ui/main-axios.ts";

interface ServiceLogViewerProps {
    hostId: number;
    serviceName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ServiceLogViewer({ hostId, serviceName, isOpen, onClose }: ServiceLogViewerProps): React.ReactElement {
    const [logs, setLogs] = useState<ServiceLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredLogs, setFilteredLogs] = useState<ServiceLogEntry[]>([]);
    const [lines, setLines] = useState<number>(100);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [copied, setCopied] = useState(false);
    
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // 로그 로드
    const loadLogs = async (scrollToBottom = false) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await getServiceLogs(hostId, serviceName, { 
                lines,
                since: undefined 
            });
            setLogs(response.logs);
            
            if (scrollToBottom && bottomRef.current) {
                setTimeout(() => {
                    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (err) {
            setError(`로그를 불러오는데 실패했습니다: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    // 초기 로드
    useEffect(() => {
        if (isOpen && hostId && serviceName) {
            loadLogs(true);
        }
    }, [isOpen, hostId, serviceName, lines]);

    // 자동 새로고침
    useEffect(() => {
        if (autoRefresh && isOpen) {
            const interval = setInterval(() => {
                loadLogs(isAtBottom);
            }, 2000);
            setRefreshInterval(interval);
            
            return () => {
                if (interval) clearInterval(interval);
            };
        } else if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
        }
    }, [autoRefresh, isOpen, isAtBottom]);

    // 검색 필터링
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredLogs(logs);
        } else {
            const filtered = logs.filter(log => 
                log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.comm.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.hostname.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredLogs(filtered);
        }
    }, [logs, searchQuery]);

    // 스크롤 위치 추적
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        const atBottom = scrollHeight - scrollTop === clientHeight;
        setIsAtBottom(atBottom);
    };

    // 맨 아래로 스크롤
    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 로그 다운로드
    const downloadLogs = () => {
        const logContent = logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            return `[${timestamp}] ${log.hostname} ${log.comm}[${log.pid}]: ${log.message}`;
        }).join('\n');
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${serviceName}-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 로그 복사
    const copyLogs = async () => {
        try {
            const logText = filteredLogs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString();
                return `[${timestamp}] ${log.hostname} ${log.comm}[${log.pid}]: ${log.message}`;
            }).join('\n');
            await navigator.clipboard.writeText(logText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('로그 복사 실패:', err);
        }
    };

    // 로그 라인 렌더링
    const renderLogLine = (logEntry: ServiceLogEntry, index: number) => {
        const message = logEntry.message || '';
        const timestamp = new Date(logEntry.timestamp).toLocaleString();
        const processInfo = `${logEntry.comm}[${logEntry.pid}]`;
        const fullLine = `[${timestamp}] ${logEntry.hostname} ${processInfo}: ${message}`;
        
        const isError = message.toLowerCase().includes('error') || message.toLowerCase().includes('fail');
        const isWarning = message.toLowerCase().includes('warn') || message.toLowerCase().includes('warning');
        const isInfo = message.toLowerCase().includes('info');
        const isStart = message.toLowerCase().includes('start');
        const isStopped = message.toLowerCase().includes('stop');
        
        let className = 'font-mono text-xs leading-relaxed ';
        
        if (isError) {
            className += 'text-red-400';
        } else if (isWarning) {
            className += 'text-yellow-400';
        } else if (isInfo || isStart) {
            className += 'text-blue-400';
        } else if (isStopped) {
            className += 'text-orange-400';
        } else {
            className += 'text-gray-300';
        }

        // 검색어 하이라이트
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const hasMatch = message.toLowerCase().includes(searchLower) || 
                           logEntry.comm.toLowerCase().includes(searchLower) ||
                           logEntry.hostname.toLowerCase().includes(searchLower);
            
            if (hasMatch) {
                return (
                    <div key={index} className={className}>
                        <span className="text-gray-500">[{timestamp}]</span>
                        <span className="text-gray-400 ml-2">{logEntry.hostname}</span>
                        <span className="text-blue-300 ml-2">{processInfo}:</span>
                        <span className="ml-2">
                            {highlightSearchTerm(message, searchQuery)}
                        </span>
                    </div>
                );
            }
        }

        return (
            <div key={index} className={className}>
                <span className="text-gray-500">[{timestamp}]</span>
                <span className="text-gray-400 ml-2">{logEntry.hostname}</span>
                <span className="text-blue-300 ml-2">{processInfo}:</span>
                <span className="ml-2">{message}</span>
            </div>
        );
    };

    // 검색어 하이라이트 헬퍼 함수
    const highlightSearchTerm = (text: string, searchTerm: string) => {
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        const parts = text.split(regex);
        
        return parts.map((part, partIndex) => 
            regex.test(part) ? (
                <mark key={partIndex} className="bg-yellow-500/30 text-yellow-300">
                    {part}
                </mark>
            ) : (
                <span key={partIndex}>{part}</span>
            )
        );
    };

    if (!isOpen) return <></>;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="max-w-6xl w-full h-full flex flex-col sm:max-w-none">
                <SheetHeader>
                    <SheetTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>서비스 로그: {serviceName}</span>
                            <Badge variant="outline" className="text-xs">
                                {filteredLogs.length} / {logs.length} 라인
                            </Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </SheetTitle>
                </SheetHeader>

                {/* 컨트롤 패널 */}
                <div className="flex flex-col sm:flex-row gap-3 pb-4 border-b">
                    <div className="flex flex-1 gap-2">
                        {/* 검색 */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="로그 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        
                        {/* 라인 수 선택 */}
                        <Select value={lines.toString()} onValueChange={(value) => setLines(parseInt(value))}>
                            <SelectTrigger className="w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="200">200</SelectItem>
                                <SelectItem value="500">500</SelectItem>
                                <SelectItem value="1000">1000</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* 새로고침 */}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => loadLogs(true)}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            새로고침
                        </Button>
                        
                        {/* 자동 새로고침 */}
                        <Button 
                            variant={autoRefresh ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                        >
                            {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                            자동
                        </Button>
                        
                        {/* 아래로 스크롤 */}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={scrollToBottom}
                        >
                            <ArrowDown className="h-4 w-4 mr-2" />
                            아래로
                        </Button>
                        
                        {/* 복사 */}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={copyLogs}
                        >
                            {copied ? (
                                <Check className="h-4 w-4 mr-2 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4 mr-2" />
                            )}
                            {copied ? '복사됨' : '복사'}
                        </Button>
                        
                        {/* 다운로드 */}
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={downloadLogs}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            다운로드
                        </Button>
                    </div>
                </div>

                {/* 로그 내용 */}
                <div className="flex-1 min-h-0">
                    {error && (
                        <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {loading && logs.length === 0 ? (
                        <div className="flex justify-center items-center h-32">
                            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                            <span className="ml-2 text-gray-400">로그를 불러오는 중...</span>
                        </div>
                    ) : (
                        <ScrollArea 
                            className="h-full w-full border rounded-md"
                            ref={scrollAreaRef}
                            onScrollCapture={handleScroll}
                        >
                            <div className="p-4 space-y-1">
                                {filteredLogs.length === 0 ? (
                                    <div className="text-center text-gray-400 py-8">
                                        로그가 없습니다.
                                    </div>
                                ) : (
                                    <>
                                        {filteredLogs.map((logEntry, index) => renderLogLine(logEntry, index))}
                                        <div ref={bottomRef} />
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {/* 상태 표시 */}
                <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-400">
                    <div className="flex items-center gap-4">
                        <span>총 {logs.length}개 라인</span>
                        {searchQuery && (
                            <span>검색 결과: {filteredLogs.length}개</span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {autoRefresh && (
                            <Badge variant="outline" className="text-xs">
                                자동 새로고침 중
                            </Badge>
                        )}
                        {!isAtBottom && (
                            <Badge variant="outline" className="text-xs text-yellow-500">
                                새 로그 있음
                            </Badge>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}