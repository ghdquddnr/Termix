import React from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { Status, StatusIndicator } from "@/components/ui/shadcn-io/status";
import { Separator } from "@/components/ui/separator.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Network, Wifi, Shield, Activity, RefreshCw, Globe, Lock, Unlock } from "lucide-react";
import { getServerStatusById, getMonitoringHosts, monitoringApi } from "@/ui/main-axios.ts";
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { HostInfo } from "@/types/process-monitoring";

interface NetworkConnection {
    protocol: string;
    localAddress: string;
    localIP: string;
    localPort: number;
    remoteAddress: string;
    remoteIP: string;
    remotePort: number;
    state: string;
    pid?: number;
    processName?: string;
    user?: string;
}

interface ListeningPort {
    protocol: string;
    ip: string;
    port: number;
    pid?: number;
    processName?: string;
    user?: string;
    serviceName?: string;
}

interface NetworkStatistics {
    totalConnections: number;
    connectionsByProtocol: {
        tcp: number;
        udp: number;
        tcp6: number;
        udp6: number;
    };
    connectionsByState: Record<string, number>;
    listeningPorts: number;
    interfaceStats: Array<{
        interface: string;
        rxBytes: number;
        rxPackets: number;
        rxErrors: number;
        rxDropped: number;
        txBytes: number;
        txPackets: number;
        txErrors: number;
        txDropped: number;
    }>;
}

interface FirewallStatus {
    active: boolean;
    service: string;
    defaultPolicy?: {
        incoming: string;
        outgoing: string;
        forwarding?: string;
    };
    ruleCount?: number;
}

interface NetworkMonitoringResponse {
    connections: NetworkConnection[];
    listeningPorts: ListeningPort[];
    statistics: NetworkStatistics;
    firewallStatus: FirewallStatus;
    timestamp: string;
    hostname: string;
}

interface NetworkMonitorProps {
    hostConfig?: any;
    title?: string;
    isVisible?: boolean;
    isTopbarOpen?: boolean;
    embedded?: boolean;
}

async function getNetworkInfo(hostId: string): Promise<NetworkMonitoringResponse> {
    try {
        const response = await monitoringApi.get(`/network/${hostId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to fetch network info: ${error.response?.status || 'Unknown'} ${error.response?.statusText || error.message}`);
    }
}

async function getListeningPorts(hostId: string): Promise<{ listeningPorts: ListeningPort[]; count: number; timestamp: string; hostname: string }> {
    try {
        const response = await monitoringApi.get(`/network/${hostId}/ports`);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to fetch listening ports: ${error.response?.status || 'Unknown'} ${error.response?.statusText || error.message}`);
    }
}

async function getNetworkStatistics(hostId: string): Promise<{ statistics: NetworkStatistics; timestamp: string; hostname: string }> {
    try {
        const response = await monitoringApi.get(`/network/${hostId}/statistics`);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to fetch network statistics: ${error.response?.status || 'Unknown'} ${error.response?.statusText || error.message}`);
    }
}

async function getFirewallStatus(hostId: string): Promise<{ firewallStatus: FirewallStatus; timestamp: string; hostname: string }> {
    try {
        const response = await monitoringApi.get(`/network/${hostId}/firewall`);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to fetch firewall status: ${error.response?.status || 'Unknown'} ${error.response?.statusText || error.message}`);
    }
}

export function NetworkMonitor({
    hostConfig,
    title,
    isVisible = true,
    isTopbarOpen = true,
    embedded = false
}: NetworkMonitorProps): React.ReactElement {
    const { t } = useTranslation();
    const { state: sidebarState } = useSidebar();
    const [hosts, setHosts] = React.useState<HostInfo[]>([]);
    const [selectedHostId, setSelectedHostId] = React.useState<string>('');
    const [serverStatus, setServerStatus] = React.useState<'online' | 'offline'>('offline');
    const [networkData, setNetworkData] = React.useState<NetworkMonitoringResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = React.useState(true);
    const [refreshInterval, setRefreshInterval] = React.useState(30000); // 30 seconds

    // Load available hosts on mount
    React.useEffect(() => {
        const loadHosts = async () => {
            try {
                const hostList = await getMonitoringHosts();
                setHosts(hostList);
                if (hostList.length > 0 && !selectedHostId) {
                    setSelectedHostId(hostList[0].id.toString());
                }
            } catch (error) {
                console.error('Failed to load hosts:', error);
                setError('Failed to load available hosts');
            }
        };
        loadHosts();
    }, [selectedHostId]);

    const fetchNetworkData = React.useCallback(async () => {
        if (!selectedHostId) return;

        setLoading(true);
        setError(null);
        
        try {
            const [statusRes, networkRes] = await Promise.all([
                getServerStatusById(parseInt(selectedHostId)),
                getNetworkInfo(selectedHostId)
            ]);
            
            setServerStatus(statusRes?.status === 'online' ? 'online' : 'offline');
            setNetworkData(networkRes);
        } catch (err) {
            console.error('Failed to fetch network data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch network data');
            setServerStatus('offline');
        } finally {
            setLoading(false);
        }
    }, [selectedHostId]);

    React.useEffect(() => {
        let cancelled = false;
        let intervalId: number | undefined;

        if (selectedHostId && isVisible) {
            fetchNetworkData();
            
            if (autoRefresh) {
                intervalId = window.setInterval(() => {
                    if (isVisible && !cancelled) {
                        fetchNetworkData();
                    }
                }, refreshInterval);
            }
        }

        return () => {
            cancelled = true;
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [selectedHostId, isVisible, autoRefresh, refreshInterval, fetchNetworkData]);

    const selectedHost = React.useMemo(() => {
        return hosts.find(host => host.id.toString() === selectedHostId);
    }, [hosts, selectedHostId]);

    const topMarginPx = isTopbarOpen ? 74 : 16;
    const leftMarginPx = sidebarState === 'collapsed' ? 16 : 8;
    const bottomMarginPx = 8;

    const wrapperStyle: React.CSSProperties = embedded
        ? { opacity: isVisible ? 1 : 0, height: '100%', width: '100%' }
        : {
            opacity: isVisible ? 1 : 0,
            marginLeft: leftMarginPx,
            marginRight: 17,
            marginTop: topMarginPx,
            marginBottom: bottomMarginPx,
            height: `calc(100vh - ${topMarginPx + bottomMarginPx}px)`,
        };

    const containerClass = embedded
        ? "h-full w-full text-white overflow-hidden bg-transparent"
        : "bg-[#18181b] text-white rounded-lg border-2 border-[#303032] overflow-hidden";

    const getStateColor = (state: string) => {
        switch (state.toUpperCase()) {
            case 'LISTEN': return 'bg-green-500';
            case 'ESTABLISHED': return 'bg-blue-500';
            case 'TIME_WAIT': return 'bg-yellow-500';
            case 'CLOSE_WAIT': return 'bg-orange-500';
            case 'FIN_WAIT1':
            case 'FIN_WAIT2': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getProtocolColor = (protocol: string) => {
        switch (protocol.toLowerCase()) {
            case 'tcp': return 'bg-blue-600';
            case 'udp': return 'bg-green-600';
            case 'tcp6': return 'bg-purple-600';
            case 'udp6': return 'bg-pink-600';
            default: return 'bg-gray-600';
        }
    };

    const formatBytes = (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    return (
        <div style={wrapperStyle} className={containerClass}>
            <div className="h-full w-full flex flex-col">
                {/* Top Header */}
                <div className="flex items-center justify-between px-3 pt-2 pb-2">
                    <div className="flex items-center gap-4">
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            <Network className="w-5 h-5" />
                            {title}
                        </h1>
                        <Select value={selectedHostId} onValueChange={setSelectedHostId}>
                            <SelectTrigger className="w-[300px]">
                                <SelectValue placeholder="Select a host to monitor" />
                            </SelectTrigger>
                            <SelectContent>
                                {hosts.map((host) => (
                                    <SelectItem key={host.id} value={host.id.toString()}>
                                        {host.folder || 'Default'} - {host.host}:{host.port} ({host.username})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedHost && (
                            <Status status={serverStatus} className="!bg-transparent !p-0.75 flex-shrink-0">
                                <StatusIndicator />
                            </Status>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={autoRefresh ? 'bg-green-500/10 border-green-500' : ''}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh && loading ? 'animate-spin' : ''}`} />
                            Auto Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchNetworkData}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
                <Separator className="p-0.25 w-full" />

                <div className="flex-1 overflow-auto p-3">
                    {error && (
                        <Card className="mb-4 border-red-500 bg-red-500/10">
                            <CardHeader>
                                <CardTitle className="text-red-400">Error</CardTitle>
                                <CardDescription className="text-red-300">{error}</CardDescription>
                            </CardHeader>
                        </Card>
                    )}

                    {!selectedHostId ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>No Host Selected</CardTitle>
                                <CardDescription>Please select a host to monitor network connections.</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : (
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="connections">Connections</TabsTrigger>
                                <TabsTrigger value="ports">Listening Ports</TabsTrigger>
                                <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
                                <TabsTrigger value="firewall">Firewall</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-4">
                                {networkData && (
                                    <>
                                        {/* Network Statistics Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{networkData.statistics.totalConnections}</div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Listening Ports</CardTitle>
                                                    <Wifi className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{networkData.statistics.listeningPorts}</div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Firewall Status</CardTitle>
                                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex items-center gap-2">
                                                        {networkData.firewallStatus.active ? (
                                                            <Lock className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <Unlock className="h-4 w-4 text-red-500" />
                                                        )}
                                                        <span className="text-sm font-medium">
                                                            {networkData.firewallStatus.active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {networkData.firewallStatus.service}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Network Interfaces</CardTitle>
                                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{networkData.statistics.interfaceStats.length}</div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Protocol Distribution */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Protocol Distribution</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-blue-500">
                                                            {networkData.statistics.connectionsByProtocol.tcp}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">TCP</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-green-500">
                                                            {networkData.statistics.connectionsByProtocol.udp}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">UDP</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-purple-500">
                                                            {networkData.statistics.connectionsByProtocol.tcp6}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">TCP6</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold text-pink-500">
                                                            {networkData.statistics.connectionsByProtocol.udp6}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">UDP6</div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="connections" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Active Network Connections</CardTitle>
                                        <CardDescription>
                                            All active network connections on the server
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {networkData?.connections && networkData.connections.length > 0 ? (
                                            <div className="overflow-auto max-h-[600px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Protocol</TableHead>
                                                            <TableHead>Local Address</TableHead>
                                                            <TableHead>Remote Address</TableHead>
                                                            <TableHead>State</TableHead>
                                                            <TableHead>Process</TableHead>
                                                            <TableHead>PID</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {networkData.connections.map((conn, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>
                                                                    <Badge className={getProtocolColor(conn.protocol)}>
                                                                        {conn.protocol.toUpperCase()}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm">
                                                                    {conn.localAddress}
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm">
                                                                    {conn.remoteAddress}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge className={getStateColor(conn.state)}>
                                                                        {conn.state}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm">
                                                                    {conn.processName || '-'}
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm">
                                                                    {conn.pid || '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No network connections found
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="ports" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Listening Ports</CardTitle>
                                        <CardDescription>
                                            Ports that are currently listening for connections
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {networkData?.listeningPorts && networkData.listeningPorts.length > 0 ? (
                                            <div className="overflow-auto max-h-[600px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Protocol</TableHead>
                                                            <TableHead>IP Address</TableHead>
                                                            <TableHead>Port</TableHead>
                                                            <TableHead>Service</TableHead>
                                                            <TableHead>Process</TableHead>
                                                            <TableHead>PID</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {networkData.listeningPorts.map((port, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>
                                                                    <Badge className={getProtocolColor(port.protocol)}>
                                                                        {port.protocol.toUpperCase()}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm">
                                                                    {port.ip}
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm font-bold">
                                                                    {port.port}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {port.serviceName ? (
                                                                        <Badge variant="outline">
                                                                            {port.serviceName}
                                                                        </Badge>
                                                                    ) : '-'}
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm">
                                                                    {port.processName || '-'}
                                                                </TableCell>
                                                                <TableCell className="font-mono text-sm">
                                                                    {port.pid || '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No listening ports found
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="interfaces" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Network Interface Statistics</CardTitle>
                                        <CardDescription>
                                            Data transfer statistics for each network interface
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {networkData?.statistics.interfaceStats && networkData.statistics.interfaceStats.length > 0 ? (
                                            <div className="space-y-4">
                                                {networkData.statistics.interfaceStats.map((iface, index) => (
                                                    <Card key={index} className="border-l-4 border-l-blue-500">
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2">
                                                                <Globe className="w-5 h-5" />
                                                                {iface.interface}
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <div>
                                                                    <h4 className="font-semibold mb-2 text-green-400">Received (RX)</h4>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span>Bytes:</span>
                                                                            <span className="font-mono">{formatBytes(iface.rxBytes)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Packets:</span>
                                                                            <span className="font-mono">{iface.rxPackets.toLocaleString()}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Errors:</span>
                                                                            <span className={`font-mono ${iface.rxErrors > 0 ? 'text-red-400' : ''}`}>
                                                                                {iface.rxErrors}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Dropped:</span>
                                                                            <span className={`font-mono ${iface.rxDropped > 0 ? 'text-yellow-400' : ''}`}>
                                                                                {iface.rxDropped}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold mb-2 text-blue-400">Transmitted (TX)</h4>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span>Bytes:</span>
                                                                            <span className="font-mono">{formatBytes(iface.txBytes)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Packets:</span>
                                                                            <span className="font-mono">{iface.txPackets.toLocaleString()}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Errors:</span>
                                                                            <span className={`font-mono ${iface.txErrors > 0 ? 'text-red-400' : ''}`}>
                                                                                {iface.txErrors}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Dropped:</span>
                                                                            <span className={`font-mono ${iface.txDropped > 0 ? 'text-yellow-400' : ''}`}>
                                                                                {iface.txDropped}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No network interface statistics available
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="firewall" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Firewall Status</CardTitle>
                                        <CardDescription>
                                            Current firewall configuration and status
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {networkData?.firewallStatus ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        {networkData.firewallStatus.active ? (
                                                            <Lock className="w-6 h-6 text-green-500" />
                                                        ) : (
                                                            <Unlock className="w-6 h-6 text-red-500" />
                                                        )}
                                                        <span className="text-lg font-semibold">
                                                            {networkData.firewallStatus.active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                    <Badge variant="outline">
                                                        {networkData.firewallStatus.service}
                                                    </Badge>
                                                </div>

                                                {networkData.firewallStatus.ruleCount !== undefined && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <Card>
                                                            <CardHeader>
                                                                <CardTitle className="text-sm">Active Rules</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="text-2xl font-bold">
                                                                    {networkData.firewallStatus.ruleCount}
                                                                </div>
                                                            </CardContent>
                                                        </Card>

                                                        {networkData.firewallStatus.defaultPolicy && (
                                                            <Card>
                                                                <CardHeader>
                                                                    <CardTitle className="text-sm">Default Policy</CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span>Incoming:</span>
                                                                            <Badge variant={networkData.firewallStatus.defaultPolicy.incoming === 'ACCEPT' ? 'default' : 'destructive'}>
                                                                                {networkData.firewallStatus.defaultPolicy.incoming}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>Outgoing:</span>
                                                                            <Badge variant={networkData.firewallStatus.defaultPolicy.outgoing === 'ACCEPT' ? 'default' : 'destructive'}>
                                                                                {networkData.firewallStatus.defaultPolicy.outgoing}
                                                                            </Badge>
                                                                        </div>
                                                                        {networkData.firewallStatus.defaultPolicy.forwarding && (
                                                                            <div className="flex justify-between">
                                                                                <span>Forwarding:</span>
                                                                                <Badge variant={networkData.firewallStatus.defaultPolicy.forwarding === 'ACCEPT' ? 'default' : 'destructive'}>
                                                                                    {networkData.firewallStatus.defaultPolicy.forwarding}
                                                                                </Badge>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No firewall information available
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}