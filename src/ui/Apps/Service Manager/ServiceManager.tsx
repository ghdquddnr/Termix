import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { useSidebar } from "@/components/ui/sidebar.tsx";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Search, RefreshCw, Play, Square, RotateCcw, Settings, Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { ServiceCard } from "./ServiceCard.tsx";
import { ServiceLogViewer } from "./ServiceLogViewer.tsx";
import { 
    getServiceList, 
    getServiceStatistics, 
    performServiceAction, 
    type ServiceInfo, 
    type ServiceListOptions, 
    type ServiceAction 
} from "@/ui/main-axios.ts";
import { getSSHHosts } from "@/ui/main-axios.ts";

interface ServiceManagerProps {
    onSelectView: (view: string) => void;
    isTopbarOpen?: boolean;
}

export function ServiceManager({ onSelectView, isTopbarOpen }: ServiceManagerProps): React.ReactElement {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("service_overview");
    const [services, setServices] = useState<ServiceInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedHost, setSelectedHost] = useState<number | null>(null);
    const [hosts, setHosts] = useState<any[]>([]);
    const [statistics, setStatistics] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterState, setFilterState] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
    const [showLogViewer, setShowLogViewer] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    
    const { state: sidebarState } = useSidebar();

    // 호스트 목록 로드
    useEffect(() => {
        loadHosts();
    }, []);

    // 선택된 호스트의 서비스 목록 로드
    useEffect(() => {
        if (selectedHost) {
            loadServices();
            loadStatistics();
        }
    }, [selectedHost, searchQuery, filterState, filterType]);

    // 자동 새로고침 설정
    useEffect(() => {
        if (autoRefresh && selectedHost) {
            const interval = setInterval(() => {
                loadServices();
                loadStatistics();
            }, 5000); // 5초마다 새로고침
            setRefreshInterval(interval);
            
            return () => {
                if (interval) clearInterval(interval);
            };
        } else if (refreshInterval) {
            clearInterval(refreshInterval);
            setRefreshInterval(null);
        }
    }, [autoRefresh, selectedHost]);

    const loadHosts = async () => {
        try {
            const hostList = await getSSHHosts();
            setHosts(hostList);
            if (hostList.length > 0 && !selectedHost) {
                setSelectedHost(hostList[0].id);
            }
        } catch (err) {
            setError("호스트 목록을 불러오는데 실패했습니다.");
        }
    };

    const loadServices = async () => {
        if (!selectedHost) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const options: ServiceListOptions = {
                page: 1,
                limit: 100,
                search: searchQuery || undefined,
                state: filterState === 'all' ? undefined : filterState,
                type: filterType === 'all' ? undefined : filterType,
                sortBy: 'name',
                sortOrder: 'asc'
            };
            
            const result = await getServiceList(selectedHost, options);
            setServices(result.services);
        } catch (err) {
            setError("서비스 목록을 불러오는데 실패했습니다.");
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    const loadStatistics = async () => {
        if (!selectedHost) return;
        
        try {
            const stats = await getServiceStatistics(selectedHost);
            setStatistics(stats);
        } catch (err) {
            console.warn("서비스 통계를 불러오는데 실패했습니다.", err);
        }
    };

    const handleServiceAction = async (serviceName: string, action: ServiceAction) => {
        if (!selectedHost) return;
        
        try {
            setLoading(true);
            await performServiceAction(selectedHost, serviceName, action);
            // 액션 후 서비스 목록과 통계 다시 로드
            await loadServices();
            await loadStatistics();
        } catch (err) {
            setError(`서비스 ${action} 작업 중 오류가 발생했습니다.`);
        } finally {
            setLoading(false);
        }
    };

    const handleServiceSelect = (service: ServiceInfo) => {
        setSelectedService(service);
        setShowLogViewer(true);
    };

    const handleRefresh = useCallback(() => {
        if (selectedHost) {
            loadServices();
            loadStatistics();
        }
    }, [selectedHost]);

    const getServicesByState = (state: string) => {
        return services.filter(service => {
            if (state === 'active') return service.activeState === 'active';
            if (state === 'inactive') return service.activeState === 'inactive';
            if (state === 'failed') return service.activeState === 'failed';
            return true;
        });
    };

    const topMarginPx = isTopbarOpen ? 74 : 26;
    const leftMarginPx = sidebarState === 'collapsed' ? 26 : 8;
    const bottomMarginPx = 8;

    return (
        <div>
            <div className="w-full">
                <div
                    className="bg-[#18181b] text-white p-4 pt-0 rounded-lg border-2 border-[#303032] flex flex-col min-h-0 overflow-hidden"
                    style={{
                        marginLeft: leftMarginPx,
                        marginRight: 17,
                        marginTop: topMarginPx,
                        marginBottom: bottomMarginPx,
                        height: `calc(100vh - ${topMarginPx + bottomMarginPx}px)`
                    }}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab}
                          className="flex-1 flex flex-col h-full min-h-0">
                        <TabsList className="bg-[#18181b] border-2 border-[#303032] mt-1.5">
                            <TabsTrigger value="service_overview">서비스 개요</TabsTrigger>
                            <TabsTrigger value="service_management">서비스 관리</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="service_overview" className="flex-1 flex flex-col h-full min-h-0">
                            <Separator className="p-0.25 -mt-0.5 mb-4"/>
                            
                            {/* 호스트 선택 */}
                            <div className="mb-4">
                                <Select 
                                    value={selectedHost?.toString() || ""} 
                                    onValueChange={(value) => setSelectedHost(parseInt(value))}
                                >
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="호스트를 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {hosts.map((host) => (
                                            <SelectItem key={host.id} value={host.id.toString()}>
                                                {host.name} ({host.ip})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 통계 카드 */}
                            {statistics && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">전체 서비스</CardTitle>
                                            <Settings className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{statistics.total}</div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">활성 서비스</CardTitle>
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-green-500">{statistics.active}</div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">비활성 서비스</CardTitle>
                                            <XCircle className="h-4 w-4 text-gray-500" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-gray-500">{statistics.inactive}</div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">실패 서비스</CardTitle>
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-red-500">{statistics.failed}</div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* 상태별 서비스 섹션 */}
                            <div className="flex-1 overflow-auto">
                                <div className="space-y-6">
                                    {/* 실패 서비스 */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-red-500 flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5" />
                                            실패 서비스 ({getServicesByState('failed').length})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {getServicesByState('failed').slice(0, 6).map((service) => (
                                                <ServiceCard 
                                                    key={service.name}
                                                    service={service}
                                                    onAction={handleServiceAction}
                                                    onViewLogs={() => handleServiceSelect(service)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* 활성 서비스 */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-green-500 flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5" />
                                            활성 서비스 ({getServicesByState('active').length})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {getServicesByState('active').slice(0, 9).map((service) => (
                                                <ServiceCard 
                                                    key={service.name}
                                                    service={service}
                                                    onAction={handleServiceAction}
                                                    onViewLogs={() => handleServiceSelect(service)}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* 비활성 서비스 */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-gray-500 flex items-center gap-2">
                                            <XCircle className="h-5 w-5" />
                                            비활성 서비스 ({getServicesByState('inactive').length})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {getServicesByState('inactive').slice(0, 6).map((service) => (
                                                <ServiceCard 
                                                    key={service.name}
                                                    service={service}
                                                    onAction={handleServiceAction}
                                                    onViewLogs={() => handleServiceSelect(service)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        
                        <TabsContent value="service_management" className="flex-1 flex flex-col h-full min-h-0">
                            <Separator className="p-0.25 -mt-0.5 mb-4"/>
                            
                            {/* 컨트롤 패널 */}
                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                <div className="flex flex-1 gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            placeholder="서비스 검색..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    
                                    <Select value={filterState} onValueChange={setFilterState}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">모든 상태</SelectItem>
                                            <SelectItem value="active">활성</SelectItem>
                                            <SelectItem value="inactive">비활성</SelectItem>
                                            <SelectItem value="failed">실패</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    
                                    <Select value={filterType} onValueChange={setFilterType}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">모든 타입</SelectItem>
                                            <SelectItem value="service">서비스</SelectItem>
                                            <SelectItem value="socket">소켓</SelectItem>
                                            <SelectItem value="timer">타이머</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleRefresh}
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        새로고침
                                    </Button>
                                    
                                    <Button 
                                        variant={autoRefresh ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setAutoRefresh(!autoRefresh)}
                                    >
                                        <Activity className="h-4 w-4 mr-2" />
                                        자동 새로고침
                                    </Button>
                                </div>
                            </div>

                            {/* 서비스 목록 */}
                            <div className="flex-1 overflow-auto">
                                {error && (
                                    <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
                                        {error}
                                    </div>
                                )}

                                {loading && services.length === 0 ? (
                                    <div className="flex justify-center items-center h-32">
                                        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                                        <span className="ml-2 text-gray-400">서비스 목록을 불러오는 중...</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {services.map((service) => (
                                            <ServiceCard 
                                                key={service.name}
                                                service={service}
                                                onAction={handleServiceAction}
                                                onViewLogs={() => handleServiceSelect(service)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {!loading && services.length === 0 && !error && (
                                    <div className="text-center text-gray-400 py-8">
                                        조건에 맞는 서비스가 없습니다.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
            
            {/* 로그 뷰어 모달 */}
            {showLogViewer && selectedService && selectedHost && (
                <ServiceLogViewer
                    hostId={selectedHost}
                    serviceName={selectedService.name}
                    isOpen={showLogViewer}
                    onClose={() => {
                        setShowLogViewer(false);
                        setSelectedService(null);
                    }}
                />
            )}
        </div>
    );
}