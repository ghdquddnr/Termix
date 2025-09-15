import React, {useEffect, useState} from "react";
import {HomepageAuth} from "@/ui/Homepage/HomepageAuth.tsx";
import {HomepageAlertManager} from "@/ui/Homepage/HomepageAlertManager.tsx";
import { getUserInfo, getDatabaseHealth } from "@/ui/main-axios.ts";
import {useTranslation} from "react-i18next";

interface HomepageProps {
    onSelectView: (view: string) => void;
    isAuthenticated: boolean;
    authLoading: boolean;
    onAuthSuccess: (authData: { isAdmin: boolean; username: string | null; userId: string | null }) => void;
    isTopbarOpen?: boolean;
}

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

export function Homepage({
                             onSelectView,
                             isAuthenticated,
                             authLoading,
                             onAuthSuccess,
                             isTopbarOpen = true
                         }: HomepageProps): React.ReactElement {
    const {t} = useTranslation();
    const [loggedIn, setLoggedIn] = useState(isAuthenticated);
    const [isAdmin, setIsAdmin] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [dbError, setDbError] = useState<string | null>(null);

    useEffect(() => {
        setLoggedIn(isAuthenticated);
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            const jwt = getCookie("jwt");
            if (jwt) {
                Promise.all([
                    getUserInfo(),
                    getDatabaseHealth()
                ])
                    .then(([meRes]) => {
                        setIsAdmin(!!meRes.is_admin);
                        setUsername(meRes.username || null);
                        setUserId(meRes.userId || null);
                        setDbError(null);
                    })
                    .catch((err) => {
                        setIsAdmin(false);
                        setUsername(null);
                        setUserId(null);
                        if (err?.response?.data?.error?.includes("Database")) {
                            setDbError("Could not connect to the database. Please try again later.");
                        } else {
                            setDbError(null);
                        }
                    });
            }
        }
    }, [isAuthenticated]);

    const topOffset = isTopbarOpen ? 66 : 0;
    const topPadding = isTopbarOpen ? 66 : 0;

    return (
        <div
            className="w-full min-h-svh relative transition-[padding-top] duration-300 ease-in-out"
            style={{ paddingTop: `${topPadding}px` }}>
            {!loggedIn ? (
                <div 
                    className="absolute left-0 w-full flex items-center justify-center transition-all duration-300 ease-in-out"
                    style={{ 
                        top: `${topOffset}px`, 
                        height: `calc(100% - ${topOffset}px)` 
                    }}>
                    <HomepageAuth
                        setLoggedIn={setLoggedIn}
                        setIsAdmin={setIsAdmin}
                        setUsername={setUsername}
                        setUserId={setUserId}
                        loggedIn={loggedIn}
                        authLoading={authLoading}
                        dbError={dbError}
                        setDbError={setDbError}
                        onAuthSuccess={onAuthSuccess}
                    />
                </div>
            ) : (
                <div 
                    className="absolute left-0 w-full flex items-center justify-center transition-all duration-300 ease-in-out"
                    style={{ 
                        top: `${topOffset}px`, 
                        height: `calc(100% - ${topOffset}px)` 
                    }}>
                    {/* Empty main area - content removed */}
                    <div className="flex items-center justify-center">
                        <div className="text-center text-gray-500">
                            {/* Main content area is now empty */}
                        </div>
                    </div>
                </div>
            )}

            <HomepageAlertManager
                userId={userId}
                loggedIn={loggedIn}
            />
        </div>
    );
}