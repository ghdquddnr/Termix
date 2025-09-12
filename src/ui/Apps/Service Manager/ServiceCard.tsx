import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { 
    Play, 
    Square, 
    RotateCcw, 
    Pause, 
    FileText, 
    Clock, 
    User, 
    Cpu, 
    MemoryStick,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Circle,
    Activity
} from "lucide-react";
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu.tsx";
import { type ServiceInfo, type ServiceAction } from "@/ui/main-axios.ts";

interface ServiceCardProps {
    service: ServiceInfo;
    onAction: (serviceName: string, action: ServiceAction) => void;
    onViewLogs: () => void;
}

export function ServiceCard({ service, onAction, onViewLogs }: ServiceCardProps): React.ReactElement {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAction = async (action: ServiceAction) => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        try {
            await onAction(service.name, action);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStateIcon = (activeState: string, subState: string) => {
        switch (activeState) {
            case 'active':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'inactive':
                return <XCircle className="h-4 w-4 text-gray-500" />;
            case 'failed':
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'activating':
            case 'deactivating':
                return <Activity className="h-4 w-4 text-yellow-500 animate-spin" />;
            default:
                return <Circle className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStateBadgeVariant = (activeState: string) => {
        switch (activeState) {
            case 'active':
                return 'default';
            case 'inactive':
                return 'secondary';
            case 'failed':
                return 'destructive';
            case 'activating':
            case 'deactivating':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getStateBadgeColor = (activeState: string) => {
        switch (activeState) {
            case 'active':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'inactive':
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
            case 'failed':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'activating':
            case 'deactivating':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default:
                return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const canStart = service.canStart !== false && service.activeState !== 'active';
    const canStop = service.canStop !== false && service.activeState === 'active';
    const canRestart = service.canRestart !== false && service.activeState === 'active';
    const canReload = service.canReload !== false && service.activeState === 'active';

    return (
        <Card className="hover:bg-[#1a1a1d] transition-colors border-[#303032]">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                        {getStateIcon(service.activeState, service.subState)}
                        <span className="truncate font-mono">{service.name}</span>
                    </div>
                    <Badge 
                        variant="outline" 
                        className={`ml-2 text-xs ${getStateBadgeColor(service.activeState)}`}
                    >
                        {service.activeState}
                    </Badge>
                </CardTitle>
                
                {service.description && (
                    <p className="text-xs text-gray-400 truncate" title={service.description}>
                        {service.description}
                    </p>
                )}
            </CardHeader>
            
            <CardContent className="pt-0">
                {/* 서비스 정보 */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                            <Circle className="h-3 w-3" />
                            <span>타입: {service.unitType}</span>
                        </div>
                        {service.enabledState && (
                            <Badge variant="outline" className="text-xs">
                                {service.enabledState}
                            </Badge>
                        )}
                    </div>
                    
                    {/* 리소스 정보 */}
                    {(service.mainPid || service.memory || service.cpuUsage) && (
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                            {service.mainPid && (
                                <div className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    <span>PID: {service.mainPid}</span>
                                </div>
                            )}
                            {service.memory && (
                                <div className="flex items-center gap-1">
                                    <MemoryStick className="h-3 w-3" />
                                    <span>{service.memory}</span>
                                </div>
                            )}
                            {service.cpuUsage && (
                                <div className="flex items-center gap-1">
                                    <Cpu className="h-3 w-3" />
                                    <span>{service.cpuUsage}</span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* 시간 정보 */}
                    {service.activeEnterTimestamp && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>
                                시작: {new Date(service.activeEnterTimestamp).toLocaleString()}
                            </span>
                        </div>
                    )}
                    
                    {/* 사용자 정보 */}
                    {service.user && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <User className="h-3 w-3" />
                            <span>사용자: {service.user}</span>
                        </div>
                    )}
                </div>
                
                {/* 액션 버튼 */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        {canStart && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction('start')}
                                disabled={isProcessing}
                                className="h-8 px-2"
                            >
                                <Play className="h-3 w-3" />
                            </Button>
                        )}
                        
                        {canStop && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction('stop')}
                                disabled={isProcessing}
                                className="h-8 px-2"
                            >
                                <Square className="h-3 w-3" />
                            </Button>
                        )}
                        
                        {canRestart && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction('restart')}
                                disabled={isProcessing}
                                className="h-8 px-2"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex gap-1">
                        {/* 로그 보기 버튼 */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onViewLogs}
                            className="h-8 px-2"
                        >
                            <FileText className="h-3 w-3" />
                        </Button>
                        
                        {/* 더 많은 액션 메뉴 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2"
                                    disabled={isProcessing}
                                >
                                    <span className="text-xs">⋮</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {canReload && (
                                    <DropdownMenuItem onClick={() => handleAction('reload')}>
                                        <Pause className="h-3 w-3 mr-2" />
                                        다시 로드
                                    </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuSeparator />
                                
                                {service.canEnable !== false && service.enabledState !== 'enabled' && (
                                    <DropdownMenuItem onClick={() => handleAction('enable')}>
                                        활성화
                                    </DropdownMenuItem>
                                )}
                                
                                {service.canDisable !== false && service.enabledState === 'enabled' && (
                                    <DropdownMenuItem onClick={() => handleAction('disable')}>
                                        비활성화
                                    </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem onClick={onViewLogs}>
                                    <FileText className="h-3 w-3 mr-2" />
                                    로그 보기
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}