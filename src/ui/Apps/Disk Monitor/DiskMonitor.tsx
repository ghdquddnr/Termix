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
import { Input } from "@/components/ui/input.tsx";
import { HardDrive, Folder, File, RefreshCw, Search, FileText, Database, Archive } from "lucide-react";
import { getServerStatusById, getMonitoringHosts, monitoringApi } from "@/ui/main-axios.ts";
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { HostInfo } from "@/types/process-monitoring";
import {
    Treemap,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from "recharts";

interface DiskUsageInfo {
    path: string;
    usedBytes: number;
    usedHuman: string;
    totalBytes?: number;
    totalHuman?: string;
    availableBytes?: number;
    availableHuman?: string;
    usagePercent?: number;
    filesystem?: string;
    mountPoint?: string;
}

interface DirectorySize {
    path: string;
    sizeBytes: number;
    sizeHuman: string;
    fileCount?: number;
    dirCount?: number;
    lastModified?: string;
}

interface FilesystemInfo {
    device: string;
    type: string;
    mountPoint: string;
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usagePercent: number;
    totalHuman: string;
    usedHuman: string;
    availableHuman: string;
    mountOptions?: string[];
}

interface LargeFile {
    path: string;
    sizeBytes: number;
    sizeHuman: string;
    type: string;
    lastModified: string;
    lastAccessed?: string;
    owner: string;
    permissions: string;
}

interface DiskMonitoringResponse {
    diskUsage: DiskUsageInfo[];
    filesystems: FilesystemInfo[];
    directoryUsage?: DirectorySize[];
    largeFiles?: LargeFile[];
    total: number;
    timestamp: string;
    hostname: string;
}

interface DiskMonitorProps {
    hostConfig?: any;
    title?: string;
    isVisible?: boolean;
    isTopbarOpen?: boolean;
    embedded?: boolean;
}

async function getDiskInfo(hostId: string, options: any = {}): Promise<DiskMonitoringResponse> {
    try {
        const params = new URLSearchParams();
        if (options.includeDirectories) params.append('includeDirectories', 'true');
        if (options.includeLargeFiles) params.append('includeLargeFiles', 'true');
        if (options.largeFileThreshold) params.append('largeFileThreshold', options.largeFileThreshold.toString());
        if (options.paths) params.append('paths', options.paths);

        const response = await monitoringApi.get(`/disk/${hostId}?${params}`);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to fetch disk info: ${error.response?.status || 'Unknown'} ${error.response?.statusText || error.message}`);
    }
}

async function getFilesystems(hostId: string): Promise<{ filesystems: FilesystemInfo[]; count: number; timestamp: string; hostname: string }> {
    try {
        const response = await monitoringApi.get(`/disk/${hostId}/filesystems`);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to fetch filesystems: ${error.response?.status || 'Unknown'} ${error.response?.statusText || error.message}`);
    }
}

async function getLargeFiles(hostId: string, threshold: number = 100000000, paths: string = '/'): Promise<{ largeFiles: LargeFile[]; count: number; threshold: number; timestamp: string; hostname: string }> {
    try {
        const response = await monitoringApi.get(`/disk/${hostId}/large-files?threshold=${threshold}&paths=${encodeURIComponent(paths)}`);
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to fetch large files: ${error.response?.status || 'Unknown'} ${error.response?.statusText || error.message}`);
    }
}

export function DiskMonitor({
    hostConfig,
    title,
    isVisible = true,
    isTopbarOpen = true,
    embedded = false
}: DiskMonitorProps): React.ReactElement {
    const { t } = useTranslation();
    const { state: sidebarState } = useSidebar();
    const [hosts, setHosts] = React.useState<HostInfo[]>([]);
    const [selectedHostId, setSelectedHostId] = React.useState<string>('');
    const [serverStatus, setServerStatus] = React.useState<'online' | 'offline'>('offline');
    const [diskData, setDiskData] = React.useState<DiskMonitoringResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = React.useState(true);
    const [refreshInterval, setRefreshInterval] = React.useState(60000); // 60 seconds
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedPath, setSelectedPath] = React.useState<string>('/');
    const [largeFileThreshold, setLargeFileThreshold] = React.useState<number>(100);

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

    const fetchDiskData = React.useCallback(async () => {
        if (!selectedHostId) return;

        setLoading(true);
        setError(null);

        try {
            const [statusRes, diskRes] = await Promise.all([
                getServerStatusById(parseInt(selectedHostId)),
                getDiskInfo(selectedHostId, {
                    includeDirectories: true,
                    includeLargeFiles: true,
                    largeFileThreshold: largeFileThreshold * 1024 * 1024, // MB to bytes
                    paths: selectedPath
                })
            ]);

            setServerStatus(statusRes?.status === 'online' ? 'online' : 'offline');
            setDiskData(diskRes);
        } catch (err) {
            console.error('Failed to fetch disk data:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch disk data');
            setServerStatus('offline');
        } finally {
            setLoading(false);
        }
    }, [selectedHostId, selectedPath, largeFileThreshold]);

    React.useEffect(() => {
        let cancelled = false;
        let intervalId: number | undefined;

        if (selectedHostId && isVisible) {
            fetchDiskData();

            if (autoRefresh) {
                intervalId = window.setInterval(() => {
                    if (isVisible && !cancelled) {
                        fetchDiskData();
                    }
                }, refreshInterval);
            }
        }

        return () => {
            cancelled = true;
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [selectedHostId, isVisible, autoRefresh, refreshInterval, fetchDiskData]);

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

    const formatBytes = (bytes: number) => {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf':
            case 'doc':
            case 'docx':
            case 'txt':
                return FileText;
            case 'sql':
            case 'db':
            case 'sqlite':
                return Database;
            case 'zip':
            case 'tar':
            case 'gz':
            case '7z':
                return Archive;
            default:
                return File;
        }
    };

    const getUsageColor = (percent: number) => {
        if (percent >= 90) return 'text-red-500';
        if (percent >= 75) return 'text-orange-500';
        if (percent >= 50) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getUsageVariant = (percent: number) => {
        if (percent >= 90) return 'destructive';
        if (percent >= 75) return 'secondary';
        return 'default';
    };

    // Color palette for treemap blocks (avoid relying on undefined `colors` prop)
    const treemapColors = [
        '#8884d8', '#82ca9d', '#ffc658', '#ff8042',
        '#a78bfa', '#34d399', '#f59e0b', '#ef4444',
        '#60a5fa', '#f472b6', '#22c55e', '#eab308'
    ];

    // Prepare data for charts
    const filesystemChartData = React.useMemo(() => {
        if (!diskData?.filesystems) return [];
        return diskData.filesystems.map(fs => ({
            name: fs.mountPoint === '/' ? 'Root' : fs.mountPoint,
            used: fs.usedBytes,
            available: fs.availableBytes,
            usagePercent: fs.usagePercent,
            total: fs.totalBytes,
            device: fs.device,
            type: fs.type
        }));
    }, [diskData]);

    const directoryTreemapData = React.useMemo(() => {
        if (!diskData?.directoryUsage) return [];
        return diskData.directoryUsage
            .filter(dir => dir.sizeBytes > 0)
            .sort((a, b) => b.sizeBytes - a.sizeBytes)
            .slice(0, 20)
            .map(dir => ({
                name: dir.path.split('/').pop() || dir.path,
                size: dir.sizeBytes,
                sizeHuman: dir.sizeHuman,
                fullPath: dir.path
            }));
    }, [diskData]);

    const filteredLargeFiles = React.useMemo(() => {
        if (!diskData?.largeFiles) return [];
        return diskData.largeFiles.filter(file =>
            searchQuery === '' ||
            file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
            file.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            file.owner.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [diskData, searchQuery]);

    return (
        <div style={wrapperStyle} className={containerClass}>
            <div className="h-full w-full flex flex-col">
                {/* Top Header */}
                <div className="flex items-center justify-between px-3 pt-2 pb-2">
                    <div className="flex items-center gap-4">
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            <HardDrive className="w-5 h-5" />
                            {title || 'Disk Monitor'}
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
                        <Select value={selectedPath} onValueChange={setSelectedPath}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="/">Root (/)</SelectItem>
                                <SelectItem value="/home">/home</SelectItem>
                                <SelectItem value="/var">/var</SelectItem>
                                <SelectItem value="/usr">/usr</SelectItem>
                                <SelectItem value="/tmp">/tmp</SelectItem>
                            </SelectContent>
                        </Select>
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
                            onClick={fetchDiskData}
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
                                <CardDescription>Please select a host to monitor disk usage.</CardDescription>
                            </CardHeader>
                        </Card>
                    ) : (
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="filesystems">Filesystems</TabsTrigger>
                                <TabsTrigger value="directories">Directories</TabsTrigger>
                                <TabsTrigger value="large-files">Large Files</TabsTrigger>
                                <TabsTrigger value="visualization">Charts</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-4">
                                {diskData && (
                                    <>
                                        {/* Disk Usage Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Filesystems</CardTitle>
                                                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{diskData.filesystems.length}</div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Directories Scanned</CardTitle>
                                                    <Folder className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{diskData.directoryUsage?.length || 0}</div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Large Files Found</CardTitle>
                                                    <File className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{diskData.largeFiles?.length || 0}</div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Total Scanned</CardTitle>
                                                    <Database className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{diskData.total}</div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Quick Filesystem Overview */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Filesystem Usage Overview</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {diskData.filesystems.map((fs, index) => (
                                                        <div key={index} className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{fs.mountPoint}</span>
                                                                    <Badge variant="outline">{fs.type}</Badge>
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {fs.usedHuman} / {fs.totalHuman}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Progress
                                                                    value={fs.usagePercent}
                                                                    className="flex-1"
                                                                />
                                                                <span className={`text-sm font-medium ${getUsageColor(fs.usagePercent)}`}>
                                                                    {fs.usagePercent.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="filesystems" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Filesystem Details</CardTitle>
                                        <CardDescription>
                                            Detailed information about all mounted filesystems
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {diskData?.filesystems && diskData.filesystems.length > 0 ? (
                                            <div className="overflow-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Device</TableHead>
                                                            <TableHead>Mount Point</TableHead>
                                                            <TableHead>Type</TableHead>
                                                            <TableHead>Size</TableHead>
                                                            <TableHead>Used</TableHead>
                                                            <TableHead>Available</TableHead>
                                                            <TableHead>Usage %</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {diskData.filesystems.map((fs, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell className="font-mono text-sm">
                                                                    {fs.device}
                                                                </TableCell>
                                                                <TableCell className="font-mono">
                                                                    {fs.mountPoint}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{fs.type}</Badge>
                                                                </TableCell>
                                                                <TableCell>{fs.totalHuman}</TableCell>
                                                                <TableCell>{fs.usedHuman}</TableCell>
                                                                <TableCell>{fs.availableHuman}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Progress
                                                                            value={fs.usagePercent}
                                                                            className="w-12"
                                                                        />
                                                                        <Badge variant={getUsageVariant(fs.usagePercent)}>
                                                                            {fs.usagePercent.toFixed(1)}%
                                                                        </Badge>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No filesystem information available
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="directories" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Directory Usage Analysis</CardTitle>
                                        <CardDescription>
                                            Directory sizes within {selectedPath}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {diskData?.directoryUsage && diskData.directoryUsage.length > 0 ? (
                                            <div className="overflow-auto max-h-[600px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Directory</TableHead>
                                                            <TableHead>Size</TableHead>
                                                            <TableHead>Size (Bytes)</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {diskData.directoryUsage
                                                            .sort((a, b) => b.sizeBytes - a.sizeBytes)
                                                            .map((dir, index) => (
                                                                <TableRow key={index}>
                                                                    <TableCell className="font-mono text-sm">
                                                                        <div className="flex items-center gap-2">
                                                                            <Folder className="w-4 h-4 text-blue-400" />
                                                                            {dir.path}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="font-bold">
                                                                        {dir.sizeHuman}
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-sm text-muted-foreground">
                                                                        {dir.sizeBytes.toLocaleString()}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        }
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No directory usage information available
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="large-files" className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle>Large Files</CardTitle>
                                                <CardDescription>
                                                    Files larger than {largeFileThreshold}MB in {selectedPath}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Search files..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-[200px]"
                                                />
                                                <Select
                                                    value={largeFileThreshold.toString()}
                                                    onValueChange={(v) => setLargeFileThreshold(parseInt(v, 10))}
                                                >
                                                    <SelectTrigger className="w-[100px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="10">10MB</SelectItem>
                                                        <SelectItem value="50">50MB</SelectItem>
                                                        <SelectItem value="100">100MB</SelectItem>
                                                        <SelectItem value="500">500MB</SelectItem>
                                                        <SelectItem value="1000">1GB</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {filteredLargeFiles.length > 0 ? (
                                            <div className="overflow-auto max-h-[600px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>File</TableHead>
                                                            <TableHead>Size</TableHead>
                                                            <TableHead>Type</TableHead>
                                                            <TableHead>Owner</TableHead>
                                                            <TableHead>Modified</TableHead>
                                                            <TableHead>Permissions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredLargeFiles.map((file, index) => {
                                                            const IconComponent = getFileIcon(file.path);
                                                            return (
                                                                <TableRow key={index}>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <IconComponent className="w-4 h-4 text-blue-400" />
                                                                            <div className="font-mono text-sm">
                                                                                <div>{file.path.split('/').pop()}</div>
                                                                                <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                                                    {file.path.substring(0, file.path.lastIndexOf('/'))}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="font-bold">
                                                                        {file.sizeHuman}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="outline">{file.type}</Badge>
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-sm">
                                                                        {file.owner}
                                                                    </TableCell>
                                                                    <TableCell className="text-sm">
                                                                        {file.lastModified}
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-xs">
                                                                        {file.permissions}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                {searchQuery ? 'No files match your search criteria' : 'No large files found'}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="visualization" className="space-y-4">
                                {diskData && (
                                    <>
                                        {/* Filesystem Usage Chart */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Filesystem Usage Chart</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div style={{ width: '100%', height: 300 }}>
                                                    <ResponsiveContainer>
                                                        <BarChart data={filesystemChartData}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="name" />
                                                            <YAxis tickFormatter={(value) => formatBytes(value)} />
                                                            <Tooltip
                                                                formatter={(value: any, name: string) => [
                                                                    formatBytes(value),
                                                                    name === 'used' ? 'Used' : 'Available'
                                                                ]}
                                                            />
                                                            <Legend />
                                                            <Bar dataKey="used" fill="#ef4444" name="Used" />
                                                            <Bar dataKey="available" fill="#22c55e" name="Available" />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Filesystem Usage Pie Chart */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Storage Distribution</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div style={{ width: '100%', height: 250 }}>
                                                        <ResponsiveContainer>
                                                            <PieChart>
                                                                <Pie
                                                                    data={filesystemChartData}
                                                                    dataKey="used"
                                                                    nameKey="name"
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    outerRadius={80}
                                                                    fill="#8884d8"
                                                                >
                                                                    {filesystemChartData.map((entry, index) => (
                                                                        <Cell
                                                                            key={`cell-${index}`}
                                                                            fill={`hsl(${(index * 45) % 360}, 70%, 50%)`}
                                                                        />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip formatter={(value: any) => formatBytes(value)} />
                                                                <Legend />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            {/* Directory Size Treemap */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Directory Size Distribution</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {directoryTreemapData.length > 0 ? (
                                                        <div style={{ width: '100%', height: 250 }}>
                                                            <ResponsiveContainer>
                                                                <Treemap
                                                                    data={directoryTreemapData}
                                                                    dataKey="size"
                                                                    aspectRatio={4/3}
                                                                    stroke="#fff"
                                                                    fill="#8884d8"
                                                                    content={({ depth, x, y, width, height, index, payload, name }) => {
                                                                        if (depth === 1) {
                                                                            const color = treemapColors[index % treemapColors.length];
                                                                            return (
                                                                                <g>
                                                                                    <rect
                                                                                        x={x}
                                                                                        y={y}
                                                                                        width={width}
                                                                                        height={height}
                                                                                        style={{
                                                                                            fill: color,
                                                                                            stroke: '#fff',
                                                                                            strokeWidth: 2 / (depth + 1e-10),
                                                                                            strokeOpacity: 1 / (depth + 1e-10),
                                                                                        }}
                                                                                    />
                                                                                    {width > 60 && height > 30 && (
                                                                                        <>
                                                                                            <text
                                                                                                x={x + width / 2}
                                                                                                y={y + height / 2 - 6}
                                                                                                textAnchor="middle"
                                                                                                fill="#fff"
                                                                                                fontSize={12}
                                                                                                fontWeight="bold"
                                                                                            >
                                                                                                {name}
                                                                                            </text>
                                                                                            <text
                                                                                                x={x + width / 2}
                                                                                                y={y + height / 2 + 8}
                                                                                                textAnchor="middle"
                                                                                                fill="#fff"
                                                                                                fontSize={10}
                                                                                            >
                                                                                                {payload?.sizeHuman}
                                                                                            </text>
                                                                                        </>
                                                                                    )}
                                                                                </g>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    }}
                                                                />
                                                            </ResponsiveContainer>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 text-muted-foreground">
                                                            No directory data available for visualization
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}
