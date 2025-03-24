// file: /context/fullscreen/FullscreenContext.tsx
// feature: UI - Fullscreen mode support

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

type FullscreenContextType = {
    isFullscreen: boolean;
    toggleFullscreen: () => void;
};

const FullscreenContext = createContext<FullscreenContextType | undefined>(undefined);

export function FullscreenProvider({ children }: { children: React.ReactNode }) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Initialize state from localStorage
    useEffect(() => {
        const savedFullscreen = localStorage.getItem("fullscreen");
        if (savedFullscreen) {
            setIsFullscreen(savedFullscreen === "true");
        }
    }, []);

    // Effect to handle fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            localStorage.setItem("fullscreen", String(!!document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    return (
        <FullscreenContext.Provider value={{ isFullscreen, toggleFullscreen }}>
            {children}
        </FullscreenContext.Provider>
    );
}

export const useFullscreen = () => {
    const context = useContext(FullscreenContext);
    if (context === undefined) {
        throw new Error("useFullscreen must be used within a FullscreenProvider");
    }
    return context;
};