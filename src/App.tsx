import React, {useState, useEffect} from "react"
import {LeftSidebar} from "@/ui/Navigation/LeftSidebar.tsx"
import {Homepage} from "@/ui/Homepage/Homepage.tsx"
import {AppView} from "@/ui/Navigation/AppView.tsx"
import {HostManager} from "@/ui/Apps/Host Manager/HostManager.tsx"
import {TabProvider, useTabs} from "@/ui/Navigation/Tabs/TabContext.tsx"
import {TopNavbar} from "@/ui/Navigation/TopNavbar.tsx";
import { AdminSettings } from "@/ui/Admin/AdminSettings";
import { UserProfile } from "@/ui/User/UserProfile.tsx";
import { Toaster } from "@/components/ui/sonner";
import { getUserInfo } from "@/ui/main-axios.ts";
import { ThemeSettings } from "@/components/theme/ThemeSettings";
import { ThemeProvider } from "@/components/theme-provider";
import { ProcessMonitor } from "@/components/process/ProcessMonitor";
import { ServiceManager } from "@/ui/Apps/Service Manager/ServiceManager";
import { NetworkMonitor } from "@/ui/Apps/Network Monitor/NetworkMonitor";
import { DiskMonitor } from "@/ui/Apps/Disk Monitor/DiskMonitor";

function getCookie(name: string) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, "");
}

function setCookie(name: string, value: string, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function AppContent() {
    const [view, setView] = useState<string>("homepage")
    const [mountedViews, setMountedViews] = useState<Set<string>>(new Set(["homepage"]))
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [username, setUsername] = useState<string | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const [isTopbarOpen, setIsTopbarOpen] = useState<boolean>(true)
    const {currentTab, tabs} = useTabs();

    useEffect(() => {
        const checkAuth = () => {
            const jwt = getCookie("jwt");
            if (jwt) {
                setAuthLoading(true);
                getUserInfo()
                    .then((meRes) => {
                        setIsAuthenticated(true);
                        setIsAdmin(!!meRes.is_admin);
                        setUsername(meRes.username || null);
                    })
                    .catch((err) => {
                        setIsAuthenticated(false);
                        setIsAdmin(false);
                        setUsername(null);
                        document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    })
                    .finally(() => setAuthLoading(false));
            } else {
                setIsAuthenticated(false);
                setIsAdmin(false);
                setUsername(null);
                setAuthLoading(false);
            }
        }

        checkAuth()

        const handleStorageChange = () => checkAuth()
        window.addEventListener('storage', handleStorageChange)

        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    const handleSelectView = (nextView: string) => {
        setMountedViews((prev) => {
            if (prev.has(nextView)) return prev
            const next = new Set(prev)
            next.add(nextView)
            return next
        })
        setView(nextView)
    }

    const handleAuthSuccess = (authData: { isAdmin: boolean; username: string | null; userId: string | null }) => {
        setIsAuthenticated(true)
        setIsAdmin(authData.isAdmin)
        setUsername(authData.username)
    }

    const currentTabData = tabs.find(tab => tab.id === currentTab);
    const showTerminalView = currentTabData?.type === 'terminal'
        || currentTabData?.type === 'server'
        || currentTabData?.type === 'file_manager'
        || currentTabData?.type === 'log_viewer'
        || currentTabData?.type === 'script_library'
        || currentTabData?.type === 'batch_execution';
    const showHome = currentTabData?.type === 'home';
    const showSshManager = currentTabData?.type === 'ssh_manager';
    const showAdmin = currentTabData?.type === 'admin';
    const showProfile = currentTabData?.type === 'profile';
    const showThemeSettings = currentTabData?.type === 'theme_settings';
    const showProcessMonitor = currentTabData?.type === 'process_monitor';
    const showServiceManager = currentTabData?.type === 'service_manager';
    const showNetworkMonitor = currentTabData?.type === 'network_monitor';
    const showDiskMonitor = currentTabData?.type === 'disk_monitor';

    return (
        <div>
            {!isAuthenticated && !authLoading && (
                <div>
                    <div className="absolute inset-0" style={{
                        backgroundImage: `linear-gradient(
                            135deg,
                            transparent 0%,
                            transparent 49%,
                            rgba(255, 255, 255, 0.03) 49%,
                            rgba(255, 255, 255, 0.03) 51%,
                            transparent 51%,
                            transparent 100%
                        )`,
                        backgroundSize: '80px 80px'
                    }} />
                </div>
            )}

            {!isAuthenticated && !authLoading && (
                <div className="fixed inset-0 flex items-center justify-center z-[10000]">
                    <Homepage 
                        onSelectView={handleSelectView}
                        isAuthenticated={isAuthenticated}
                        authLoading={authLoading}
                        onAuthSuccess={handleAuthSuccess}
                        isTopbarOpen={isTopbarOpen}
                    />
                </div>
            )}

            {isAuthenticated && (
                <LeftSidebar
                    onSelectView={handleSelectView}
                    disabled={!isAuthenticated || authLoading}
                    isAdmin={isAdmin}
                    username={username}
                >
                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showTerminalView ? "visible" : "hidden",
                            pointerEvents: showTerminalView ? "auto" : "none",
                            height: showTerminalView ? "100vh" : 0,
                            width: showTerminalView ? "100%" : 0,
                            position: showTerminalView ? "static" : "absolute",
                            overflow: "hidden",
                        }}
                    >
                        <AppView isTopbarOpen={isTopbarOpen} />
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showHome ? "visible" : "hidden",
                            pointerEvents: showHome ? "auto" : "none",
                            height: showHome ? "100vh" : 0,
                            width: showHome ? "100%" : 0,
                            position: showHome ? "static" : "absolute",
                            overflow: "hidden",
                        }}
                    >
                        <Homepage 
                            onSelectView={handleSelectView}
                            isAuthenticated={isAuthenticated}
                            authLoading={authLoading}
                            onAuthSuccess={handleAuthSuccess}
                            isTopbarOpen={isTopbarOpen}
                        />
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showSshManager ? "visible" : "hidden",
                            pointerEvents: showSshManager ? "auto" : "none",
                            height: showSshManager ? "100vh" : 0,
                            width: showSshManager ? "100%" : 0,
                            position: showSshManager ? "static" : "absolute",
                            overflow: "hidden",
                        }}
                    >
                        <HostManager onSelectView={handleSelectView} isTopbarOpen={isTopbarOpen} />
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showAdmin ? "visible" : "hidden",
                            pointerEvents: showAdmin ? "auto" : "none",
                            height: showAdmin ? "100vh" : 0,
                            width: showAdmin ? "100%" : 0,
                            position: showAdmin ? "static" : "absolute",
                            overflow: "hidden",
                        }}
                    >
                        <AdminSettings isTopbarOpen={isTopbarOpen} />
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showProfile ? "visible" : "hidden",
                            pointerEvents: showProfile ? "auto" : "none",
                            height: showProfile ? "100vh" : 0,
                            width: showProfile ? "100%" : 0,
                            position: showProfile ? "static" : "absolute",
                            overflow: "auto",
                        }}
                    >
                        <UserProfile isTopbarOpen={isTopbarOpen} />
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showThemeSettings ? "visible" : "hidden",
                            pointerEvents: showThemeSettings ? "auto" : "none",
                            height: showThemeSettings ? "100vh" : 0,
                            width: showThemeSettings ? "100%" : 0,
                            position: showThemeSettings ? "static" : "absolute",
                            overflow: "auto",
                        }}
                    >
                        <div className="p-6 max-w-4xl mx-auto" style={{
                            paddingTop: isTopbarOpen ? '70px' : '20px',
                        }}>
                            <ThemeSettings />
                        </div>
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showProcessMonitor ? "visible" : "hidden",
                            pointerEvents: showProcessMonitor ? "auto" : "none",
                            height: showProcessMonitor ? "100vh" : 0,
                            width: showProcessMonitor ? "100%" : 0,
                            position: showProcessMonitor ? "static" : "absolute",
                            overflow: "auto",
                        }}
                    >
                        <ProcessMonitor isTopbarOpen={isTopbarOpen} />
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showServiceManager ? "visible" : "hidden",
                            pointerEvents: showServiceManager ? "auto" : "none",
                            height: showServiceManager ? "100vh" : 0,
                            width: showServiceManager ? "100%" : 0,
                            position: showServiceManager ? "static" : "absolute",
                            overflow: "auto",
                        }}
                    >
                        <ServiceManager onSelectView={handleSelectView} isTopbarOpen={isTopbarOpen} />
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showNetworkMonitor ? "visible" : "hidden",
                            pointerEvents: showNetworkMonitor ? "auto" : "none",
                            height: showNetworkMonitor ? "100vh" : 0,
                            width: showNetworkMonitor ? "100%" : 0,
                            position: showNetworkMonitor ? "static" : "absolute",
                            overflow: "auto",
                        }}
                    >
                        <NetworkMonitor title="네트워크 모니터링" isTopbarOpen={isTopbarOpen} />
                    </div>

                    <div
                        className="h-screen w-full"
                        style={{
                            visibility: showDiskMonitor ? "visible" : "hidden",
                            pointerEvents: showDiskMonitor ? "auto" : "none",
                            height: showDiskMonitor ? "100vh" : 0,
                            width: showDiskMonitor ? "100%" : 0,
                            position: showDiskMonitor ? "static" : "absolute",
                            overflow: "auto",
                        }}
                    >
                        <DiskMonitor title="디스크 모니터링" isTopbarOpen={isTopbarOpen} />
                    </div>

                    <TopNavbar isTopbarOpen={isTopbarOpen} setIsTopbarOpen={setIsTopbarOpen}/>
                </LeftSidebar>
            )}
            <Toaster 
                position="bottom-right"
                richColors={false}
                closeButton
                duration={5000}
                offset={20}
            />
        </div>
    )
}

function App() {
    return (
        <ThemeProvider defaultTheme="dark">
            <TabProvider>
                <AppContent />
            </TabProvider>
        </ThemeProvider>
    );
}

export default App

