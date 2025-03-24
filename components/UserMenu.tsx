// file: /components/UserMenu.tsx
// feature: UI - User menu with authentication

"use client";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UserPlaque } from "@/components/shared/UserPlaque";
import { Button } from "@/components/ui/button";
import { User, Download, Palette, Settings, Menu, LayoutDashboard, Minimize, Maximize } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import ThemeSelectorDialog from "@/components/shared/ThemeSelectorDialog";
import { useFullscreen } from "@/context/fullscreen/FullscreenContext";
import { Administrator } from "@/providers/AdminAuthProvider";
import { AdminRole } from "@/convex/auth/types";

export function UserMenu({ children }: { children: ReactNode }) {
  const { signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isMounted = useRef(true);
  const { isInstallable, promptInstall } = useInstallPrompt();
  const { toast } = useToast();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const userData = useQuery(
    api.users.viewer,
    isAuthenticated ? {} : "skip"
  );

  // Handle auth state changes in useEffect instead of during render
  useEffect(() => {
    if (!isLoading && !isAuthenticated && isMounted.current) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);

      // Perform sign out
      await signOut();

      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear localStorage items related to your app
        const keysToKeep = ['theme']; // Keep theme preference if needed

        Object.keys(localStorage).forEach(key => {
          if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
          }
        });

        // Clear sessionStorage if used
        sessionStorage.clear();
      }

      // Push to home page and refresh to clear all state
      router.push('/');
      router.refresh();

      // Fallback: If router navigation doesn't work,
      // force a reload after a slight delay
      setTimeout(() => {
        if (isAuthenticated) {
          window.location.href = '/';
        }
      }, 500);

    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: "Failed to sign out. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallApp = async () => {
    try {
      const success = await promptInstall();
      if (success) {
        toast({
          title: "App Installed",
          description: "The app has been installed successfully!",
        });
      } else {
        toast({
          variant: "default",
          title: "Installation Cancelled",
          description: "App installation was cancelled by the user.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Installation Failed",
        description: "Unable to install the app. Please try again.",
      });
      console.error("App installation error:", error);
    }
  };

  const handleOpenSetupPage = () => {
    router.push("/administration");
  };

  // Show loading state while checking auth
  if (isLoading) {
    return <LoadingSpinner size="sm" />;
  }

  // Don't render anything if not authenticated (useEffect will handle redirect)
  if (!isAuthenticated || !userData || !userData.userId) {
    return null;
  }

  return (
    <>
      <div className="flex justify-end items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="px-1 h-auto hover:bg-transparent">
              <Menu className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <UserPlaque
                userId={userData.userId}
                username={userData.username}
                role={userData.role}
                showStatus={true}
                className="px-0"
                lastSeen={userData.lastSeen}
              />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowThemeSelector(true)}
              className="flex items-center gap-2"
            >
              <Palette className="h-4 w-4" />
              Change Theme
            </DropdownMenuItem>
            <DropdownMenuLabel className="flex items-center gap-2 py-2 font-normal">
              Theme
              <ThemeToggle />
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize className="mr-2 h-4 w-4" />
              ) : (
                <Maximize className="mr-2 h-4 w-4" />
              )}
              <span>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push(`/profile/${userData.userId}`)}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/settings`)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            {isInstallable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleInstallApp}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Install App
                </DropdownMenuItem>
              </>
            )}
            {(userData.role === AdminRole.ADMINISTRATOR || 
              userData.role === AdminRole.MODERATOR || 
              userData.role === AdminRole.SYSOP || 
              userData.role === AdminRole.FINANCIER) && (
              <>
                <DropdownMenuItem
                  onClick={handleOpenSetupPage}
                  className="flex items-center gap-2"
                >
                  {process.env.NODE_ENV === 'production' ? (
                    <LayoutDashboard className="h-4 w-4 text-red-500" />
                  ) : (
                    <LayoutDashboard className="h-4 w-4 text-yellow-500" />
                  )}
                  Admin ({userData.role})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-500 focus:text-red-500"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>
      <ThemeSelectorDialog
        open={showThemeSelector}
        onOpenChange={setShowThemeSelector}
      />
    </>
  );
}