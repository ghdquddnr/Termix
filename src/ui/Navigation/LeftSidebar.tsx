import React, {useState} from 'react';
import {
    Computer,
    Server,
    File,
    Hammer, ChevronUp, User2, HardDrive, Trash2, Users, Shield, Settings, Menu, ChevronRight, Activity, Cog, Network, FileText
} from "lucide-react";
import { useTranslation } from 'react-i18next';

import {
    Sidebar,
    SidebarContent, SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem, SidebarProvider, SidebarInset, SidebarHeader,
} from "@/components/ui/sidebar.tsx"

import {
    Separator,
} from "@/components/ui/separator.tsx"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@radix-ui/react-dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose
} from "@/components/ui/sheet";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table.tsx";
import {Card} from "@/components/ui/card.tsx";
import {FolderCard} from "@/ui/Navigation/Hosts/FolderCard.tsx";
import {getSSHHosts} from "@/ui/main-axios.ts";
import {useTabs} from "@/ui/Navigation/Tabs/TabContext.tsx";
import { deleteAccount } from "@/ui/main-axios.ts";

interface SSHHost {
    id: number;
    name: string;
    ip: string;
    port: number;
    username: string;
    folder: string;
    tags: string[];
    pin: boolean;
    authType: string;
    password?: string;
    key?: string;
    keyPassword?: string;
    keyType?: string;
    enableTerminal: boolean;
    enableTunnel: boolean;
    enableFileManager: boolean;
    defaultPath: string;
    tunnelConnections: any[];
    createdAt: string;
    updatedAt: string;
}

interface SidebarProps {
    onSelectView: (view: string) => void;
    getView?: () => string;
    disabled?: boolean;
    isAdmin?: boolean;
    username?: string | null;
    children?: React.ReactNode;
}

function handleLogout() {
    document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.reload();
}

function getCookie(name: string) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, "");
}



export function LeftSidebar({
                                onSelectView,
                                getView,
                                disabled,
                                isAdmin,
                                username,
                                children,
                            }: SidebarProps): React.ReactElement {
    const { t } = useTranslation();
    
    const [deleteAccountOpen, setDeleteAccountOpen] = React.useState(false);
    const [deletePassword, setDeletePassword] = React.useState("");
    const [deleteLoading, setDeleteLoading] = React.useState(false);
    const [deleteError, setDeleteError] = React.useState<string | null>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

    const {tabs: tabList, addTab, setCurrentTab, allSplitScreenTab, currentTab} = useTabs() as any;
    const isSplitScreenActive = Array.isArray(allSplitScreenTab) && allSplitScreenTab.length > 0;
    const sshManagerTab = tabList.find((t) => t.type === 'ssh_manager');
    const openSshManagerTab = () => {
        if (sshManagerTab || isSplitScreenActive) return;
        const id = addTab({type: 'ssh_manager'} as any);
        setCurrentTab(id);
    };
    const adminTab = tabList.find((t) => t.type === 'admin');
    const openAdminTab = () => {
        if (isSplitScreenActive) return;
        if (adminTab) {
            setCurrentTab(adminTab.id);
            return;
        }
        const id = addTab({type: 'admin'} as any);
        setCurrentTab(id);
    };

    const processMonitorTab = tabList.find((t) => t.type === 'process_monitor');
    const openProcessMonitorTab = () => {
        if (isSplitScreenActive) return;
        if (processMonitorTab) {
            setCurrentTab(processMonitorTab.id);
            return;
        }
        const id = addTab({type: 'process_monitor', title: '프로세스 모니터링'} as any);
        setCurrentTab(id);
    };

    const serviceManagerTab = tabList.find((t) => t.type === 'service_manager');
    const openServiceManagerTab = () => {
        if (isSplitScreenActive) return;
        if (serviceManagerTab) {
            setCurrentTab(serviceManagerTab.id);
            return;
        }
        const id = addTab({type: 'service_manager', title: '서비스 관리'} as any);
        setCurrentTab(id);
    };

    const networkMonitorTab = tabList.find((t) => t.type === 'network_monitor');
    const openNetworkMonitorTab = () => {
        if (isSplitScreenActive) return;
        if (networkMonitorTab) {
            setCurrentTab(networkMonitorTab.id);
            return;
        }
        const id = addTab({type: 'network_monitor', title: '네트워크 모니터링'} as any);
        setCurrentTab(id);
    };

    const diskMonitorTab = tabList.find((t) => t.type === 'disk_monitor');
    const openDiskMonitorTab = () => {
        if (isSplitScreenActive) return;
        if (diskMonitorTab) {
            setCurrentTab(diskMonitorTab.id);
            return;
        }
        const id = addTab({type: 'disk_monitor', title: '디스크 모니터링'} as any);
        setCurrentTab(id);
    };

    const logViewerTab = tabList.find((t: any) => t.type === 'log_viewer');
    const openLogViewerTab = () => {
        if (isSplitScreenActive) return;
        if (logViewerTab) {
            setCurrentTab(logViewerTab.id);
            return;
        }
        const id = addTab({ type: 'log_viewer', title: '로그 뷰어' } as any);
        setCurrentTab(id);
    };

    const scriptLibraryTab = tabList.find((t: any) => t.type === 'script_library');
    const openScriptLibraryTab = () => {
        if (isSplitScreenActive) return;
        if (scriptLibraryTab) {
            setCurrentTab(scriptLibraryTab.id);
            return;
        }
        const id = addTab({ type: 'script_library', title: '스크립트 라이브러리' } as any);
        setCurrentTab(id);
    };

    const batchExecutionTab = tabList.find((t: any) => t.type === 'batch_execution');
    const openBatchExecutionTab = () => {
        if (isSplitScreenActive) return;
        if (batchExecutionTab) {
            setCurrentTab(batchExecutionTab.id);
            return;
        }
        const id = addTab({ type: 'batch_execution', title: '배치 실행' } as any);
        setCurrentTab(id);
    };

    // Helper functions to check if tabs are active
    const isTabActive = (tabType: string) => {
        const tab = tabList.find((t: any) => t.type === tabType);
        return tab && tab.id === currentTab;
    };

    // Get button variant based on active state
    const getButtonVariant = (tabType: string) => {
        return isTabActive(tabType) ? 'default' : 'outline';
    };

    // Get button className based on active state
    const getButtonClassName = (tabType: string) => {
        const baseClassName = "m-2 flex flex-row font-semibold border-2 border-sidebar-border";
        return isTabActive(tabType) ? `${baseClassName} bg-primary text-primary-foreground` : baseClassName;
    };

    const [hosts, setHosts] = useState<SSHHost[]>([]);
    const [hostsLoading, setHostsLoading] = useState(false);
    const [hostsError, setHostsError] = useState<string | null>(null);
    const prevHostsRef = React.useRef<SSHHost[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");



    const fetchHosts = React.useCallback(async () => {
        try {
            const newHosts = await getSSHHosts();
            const prevHosts = prevHostsRef.current;

            const existingHostsMap = new Map(prevHosts.map(h => [h.id, h]));
            const newHostsMap = new Map(newHosts.map(h => [h.id, h]));

            let hasChanges = false;

            if (newHosts.length !== prevHosts.length) {
                hasChanges = true;
            } else {
                for (const [id, newHost] of newHostsMap) {
                    const existingHost = existingHostsMap.get(id);
                    if (!existingHost) {
                        hasChanges = true;
                        break;
                    }

                    if (
                        newHost.name !== existingHost.name ||
                        newHost.folder !== existingHost.folder ||
                        newHost.ip !== existingHost.ip ||
                        newHost.port !== existingHost.port ||
                        newHost.username !== existingHost.username ||
                        newHost.pin !== existingHost.pin ||
                        newHost.enableTerminal !== existingHost.enableTerminal ||
                        JSON.stringify(newHost.tags) !== JSON.stringify(existingHost.tags)
                    ) {
                        hasChanges = true;
                        break;
                    }
                }
            }

            if (hasChanges) {
                setTimeout(() => {
                    setHosts(newHosts);
                    prevHostsRef.current = newHosts;
                }, 50);
            }
        } catch (err: any) {
            setHostsError(t('leftSidebar.failedToLoadHosts'));
        }
    }, []);

    React.useEffect(() => {
        fetchHosts();
        const interval = setInterval(fetchHosts, 300000); // 5 minutes instead of 10 seconds
        return () => clearInterval(interval);
    }, [fetchHosts]);

    React.useEffect(() => {
        const handleHostsChanged = () => {
            fetchHosts();
        };
        window.addEventListener('ssh-hosts:changed', handleHostsChanged as EventListener);
        return () => window.removeEventListener('ssh-hosts:changed', handleHostsChanged as EventListener);
    }, [fetchHosts]);

    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(search), 200);
        return () => clearTimeout(handler);
    }, [search]);

    const filteredHosts = React.useMemo(() => {
        if (!debouncedSearch.trim()) return hosts;
        const q = debouncedSearch.trim().toLowerCase();
        return hosts.filter(h => {
            const searchableText = [
                h.name || '',
                h.username,
                h.ip,
                h.folder || '',
                ...(h.tags || []),
                h.authType,
                h.defaultPath || ''
            ].join(' ').toLowerCase();
            return searchableText.includes(q);
        });
    }, [hosts, debouncedSearch]);

    const hostsByFolder = React.useMemo(() => {
        const map: Record<string, SSHHost[]> = {};
        filteredHosts.forEach(h => {
            const folder = h.folder && h.folder.trim() ? h.folder : t('leftSidebar.noFolder');
            if (!map[folder]) map[folder] = [];
            map[folder].push(h);
        });
        return map;
    }, [filteredHosts]);

    const sortedFolders = React.useMemo(() => {
        const folders = Object.keys(hostsByFolder);
        folders.sort((a, b) => {
            if (a === t('leftSidebar.noFolder')) return -1;
            if (b === t('leftSidebar.noFolder')) return 1;
            return a.localeCompare(b);
        });
        return folders;
    }, [hostsByFolder]);

    const getSortedHosts = React.useCallback((arr: SSHHost[]) => {
        const pinned = arr.filter(h => h.pin).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        const rest = arr.filter(h => !h.pin).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return [...pinned, ...rest];
    }, []);

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeleteLoading(true);
        setDeleteError(null);

        if (!deletePassword.trim()) {
            setDeleteError(t('leftSidebar.passwordRequired'));
            setDeleteLoading(false);
            return;
        }

        const jwt = getCookie("jwt");
        try {
            await deleteAccount(deletePassword);

            handleLogout();
        } catch (err: any) {
            setDeleteError(err?.response?.data?.error || t('leftSidebar.failedToDeleteAccount'));
            setDeleteLoading(false);
        }
    };

    return (
        <div className="min-h-svh">
            <SidebarProvider open={isSidebarOpen}>
                <Sidebar variant="floating" className="">
                    <SidebarHeader>
                        <SidebarGroupLabel className="text-lg font-bold text-sidebar-foreground">
                            SolTerm
                            <Button
                                variant="outline"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="w-[28px] h-[28px] absolute right-5"
                                title={t('common.toggleSidebar')}
                            >
                                <Menu className="h-4 w-4"/>
                            </Button>
                        </SidebarGroupLabel>
                    </SidebarHeader>
                    <Separator className="p-0.25"/>
                    <SidebarContent>
                        <SidebarGroup className="!m-0 !p-0 !-mb-2">
                            <Button className={getButtonClassName('ssh_manager')} variant={getButtonVariant('ssh_manager')}
                                    onClick={openSshManagerTab} disabled={!!sshManagerTab || isSplitScreenActive}
                                    title={sshManagerTab ? t('interface.sshManagerAlreadyOpen') : isSplitScreenActive ? t('interface.disabledDuringSplitScreen') : undefined}>
                                <HardDrive strokeWidth="2.5"/>
                                {t('nav.hostManager')}
                            </Button>
                            <Button className={getButtonClassName('process_monitor')} variant={getButtonVariant('process_monitor')}
                                    onClick={openProcessMonitorTab} disabled={isSplitScreenActive}
                                    title={isSplitScreenActive ? t('interface.disabledDuringSplitScreen') : undefined}>
                                <Activity strokeWidth="2.5"/>
                                프로세스 모니터링
                            </Button>
                            <Button className={getButtonClassName('service_manager')} variant={getButtonVariant('service_manager')}
                                    onClick={openServiceManagerTab} disabled={isSplitScreenActive}
                                    title={isSplitScreenActive ? t('interface.disabledDuringSplitScreen') : undefined}>
                                <Cog strokeWidth="2.5"/>
                                서비스 관리
                            </Button>
                            <Button className={getButtonClassName('network_monitor')} variant={getButtonVariant('network_monitor')}
                                    onClick={openNetworkMonitorTab} disabled={isSplitScreenActive}
                                    title={isSplitScreenActive ? t('interface.disabledDuringSplitScreen') : undefined}>
                                <Network strokeWidth="2.5"/>
                                네트워크 모니터링
                            </Button>
                            <Button className={getButtonClassName('disk_monitor')} variant={getButtonVariant('disk_monitor')}
                                    onClick={openDiskMonitorTab} disabled={isSplitScreenActive}
                                    title={isSplitScreenActive ? t('interface.disabledDuringSplitScreen') : undefined}>
                                <HardDrive strokeWidth="2.5"/>
                                디스크 모니터링
                            </Button>
                            <Button className={getButtonClassName('log_viewer')} variant={getButtonVariant('log_viewer')}
                                    onClick={openLogViewerTab} disabled={isSplitScreenActive}
                                    title={isSplitScreenActive ? t('interface.disabledDuringSplitScreen') : undefined}>
                                <File strokeWidth="2.5"/>
                                로그 뷰어
                            </Button>
                            <Button className={getButtonClassName('script_library')} variant={getButtonVariant('script_library')}
                                    onClick={openScriptLibraryTab} disabled={isSplitScreenActive}
                                    title={isSplitScreenActive ? t('interface.disabledDuringSplitScreen') : undefined}>
                                <FileText strokeWidth="2.5"/>
                                스크립트 라이브러리
                            </Button>
                            <Button className={getButtonClassName('batch_execution')} variant={getButtonVariant('batch_execution')}
                                    onClick={openBatchExecutionTab} disabled={isSplitScreenActive}
                                    title={isSplitScreenActive ? t('interface.disabledDuringSplitScreen') : undefined}>
                                <Server strokeWidth="2.5"/>
                                배치 실행
                            </Button>
                        </SidebarGroup>
                        <Separator className="p-0.25"/>
                        <SidebarGroup className="flex flex-col gap-y-2 !-mt-2">
                            <div className="bg-sidebar-accent rounded-lg">
                                <Input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={t('placeholders.searchHostsAny')}
                                    className="w-full h-8 text-sm border-2 bg-sidebar-accent border-sidebar-border rounded-md text-sidebar-accent-foreground placeholder:text-sidebar-accent-foreground/60"
                                    autoComplete="off"
                                />
                            </div>

                            {hostsError && (
                                <div className="px-1">
                                    <div
                                        className="text-xs text-red-500 bg-red-500/10 rounded-lg px-2 py-1 border w-full">
                                        {t('leftSidebar.failedToLoadHosts')}
                                    </div>
                                </div>
                            )}

                            {hostsLoading && (
                                <div className="px-4 pb-2">
                                    <div className="text-xs text-muted-foreground text-center">
                                        {t('hosts.loadingHosts')}
                                    </div>
                                </div>
                            )}

                            {sortedFolders.map((folder, idx) => (
                                <FolderCard
                                    key={`folder-${folder}-${hostsByFolder[folder]?.length || 0}`}
                                    folderName={folder}
                                    hosts={getSortedHosts(hostsByFolder[folder])}
                                    isFirst={idx === 0}
                                    isLast={idx === sortedFolders.length - 1}
                                />
                            ))}
                        </SidebarGroup>
                    </SidebarContent>
                    <Separator className="p-0.25 mt-1 mb-1"/>
                    <SidebarFooter>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            className="data-[state=open]:opacity-90 w-full"
                                            style={{width: '100%'}}
                                            disabled={disabled}
                                        >
                                            <User2/> {username ? username : t('common.logout')}
                                            <ChevronUp className="ml-auto"/>
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side="top"
                                        align="start"
                                        sideOffset={6}
                                        className="min-w-[var(--radix-popper-anchor-width)] bg-sidebar-accent text-sidebar-accent-foreground border border-border rounded-md shadow-2xl p-1"
                                    >
                                        <DropdownMenuItem
                                            className="rounded px-2 py-1.5 hover:bg-white/15 hover:text-accent-foreground focus:bg-white/20 focus:text-accent-foreground cursor-pointer focus:outline-none"
                                            onClick={() => {
                                                if (isSplitScreenActive) return;
                                                const profileTab = tabList.find((t: any) => t.type === 'profile');
                                                if (profileTab) {
                                                    setCurrentTab(profileTab.id);
                                                    return;
                                                }
                                                const id = addTab({type: 'profile', title: t('profile.title')} as any);
                                                setCurrentTab(id);
                                            }}>
                                            <span>{t('profile.title')}</span>
                                        </DropdownMenuItem>
                                        {isAdmin && (
                                            <DropdownMenuItem
                                                className="rounded px-2 py-1.5 hover:bg-white/15 hover:text-accent-foreground focus:bg-white/20 focus:text-accent-foreground cursor-pointer focus:outline-none"
                                                onClick={() => {
                                                    if (isAdmin) openAdminTab();
                                                }}>
                                                <span>{t('admin.title')}</span>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                            className="rounded px-2 py-1.5 hover:bg-white/15 hover:text-accent-foreground focus:bg-white/20 focus:text-accent-foreground cursor-pointer focus:outline-none"
                                            onClick={handleLogout}>
                                            <span>{t('common.logout')}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="rounded px-2 py-1.5 hover:bg-white/15 hover:text-accent-foreground focus:bg-white/20 focus:text-accent-foreground cursor-pointer focus:outline-none"
                                            onClick={() => setDeleteAccountOpen(true)}
                                        >
                                            <span className="text-red-400">
                                                {t('leftSidebar.deleteAccount')}
                                            </span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooter>


                </Sidebar>
                <SidebarInset>
                    {children}
                </SidebarInset>
            </SidebarProvider>

            {!isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-0 left-0 w-[10px] h-full bg-sidebar cursor-pointer z-20 flex items-center justify-center rounded-tr-md rounded-br-md text-sidebar-foreground">
                    <ChevronRight size={10}/>
                </div>
            )}

            {deleteAccountOpen && (
                <div
                    className="fixed inset-0 z-[999999] flex"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999999,
                        pointerEvents: 'auto',
                        isolation: 'isolate',
                        transform: 'translateZ(0)',
                        willChange: 'z-index'
                    }}
                >
                    <div
                        className="w-[400px] h-full bg-sidebar border-r-2 border-sidebar-border flex flex-col shadow-2xl"
                        style={{
                            backgroundColor: 'hsl(var(--sidebar))',
                            boxShadow: '4px 0 20px rgba(0, 0, 0, 0.5)',
                            zIndex: 9999999,
                            position: 'relative',
                            isolation: 'isolate',
                            transform: 'translateZ(0)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
                            <h2 className="text-lg font-semibold text-sidebar-foreground">{t('leftSidebar.deleteAccount')}</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setDeleteAccountOpen(false);
                                    setDeletePassword("");
                                    setDeleteError(null);
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                title={t('leftSidebar.closeDeleteAccount')}
                            >
                                <span className="text-lg font-bold leading-none">×</span>
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="space-y-4">
                                <div className="text-sm text-sidebar-foreground/80">
                                    {t('leftSidebar.deleteAccountWarning')}
                                </div>

                                <Alert variant="destructive">
                                    <AlertTitle>{t('common.warning')}</AlertTitle>
                                    <AlertDescription>
                                        {t('leftSidebar.deleteAccountWarningDetails')}
                                    </AlertDescription>
                                </Alert>

                                {deleteError && (
                                    <Alert variant="destructive">
                                        <AlertTitle>{t('common.error')}</AlertTitle>
                                        <AlertDescription>{deleteError}</AlertDescription>
                                    </Alert>
                                )}

                                <form onSubmit={handleDeleteAccount} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="delete-password">{t('leftSidebar.confirmPassword')}</Label>
                                        <Input
                                            id="delete-password"
                                            type="password"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            placeholder={t('placeholders.confirmPassword')}
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            className="flex-1"
                                            disabled={deleteLoading || !deletePassword.trim()}
                                        >
                                            {deleteLoading ? t('leftSidebar.deleting') : t('leftSidebar.deleteAccount')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setDeleteAccountOpen(false);
                                                setDeletePassword("");
                                                setDeleteError(null);
                                            }}
                                        >
                                            {t('leftSidebar.cancel')}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex-1"
                        onClick={() => {
                            setDeleteAccountOpen(false);
                            setDeletePassword("");
                            setDeleteError(null);
                        }}
                        style={{cursor: 'pointer'}}
                    />
                </div>
            )}
        </div>
    )
}
