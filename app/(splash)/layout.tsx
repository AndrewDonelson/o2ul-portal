// file: ./app/(splash)/layout.tsx
// feature: WebApp Splash
"use client";
import Footer from "@/components/app/Footer";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UserMenu } from "@/components/UserMenu";
import { api } from "@/convex/_generated/api";
import { viewer } from "@/convex/users";
import { Authenticated, Unauthenticated, useConvexAuth, useQuery } from "convex/react";
import { LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ReactNode, Suspense, useState, useEffect } from "react";

export default function SplashPageLayout({
  children,
}: {
  children: ReactNode;
}) {
 // const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, isLoading } = useConvexAuth();
    
  // Always call useQuery, but conditionally use the result
  // This ensures consistent hook call order between renders
  const viewerQuery = useQuery(api.users.viewer);
  // Don't use the query result if loading or not authenticated
  const viewer = isAuthenticated && !isLoading && viewerQuery ? viewerQuery : null;

  if (isLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-20 border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <nav className="container flex w-full justify-between gap-6 text-lg font-medium md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/app/O2UL-64.png"
              alt="Nlaak Studios"
              width={50}
              height={50}
              className="object-contain"
            />
            <span className="text-base font-semibold"></span>
          </Link>

          {/* Center section */}
          <div className="flex items-center gap-4">
            <SplashPageNav />
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4">
            <Authenticated>
              <UserMenu>{viewer?.username || ''}</UserMenu>
            </Authenticated>
            <Unauthenticated>
              <Link href="/signin" className="text-primary">
                <LogIn className="h-4 w-4" />
              </Link>
            </Unauthenticated>
          </div>
        </nav>
      </header>

      <main className="flex grow flex-col">
        <Suspense fallback={<LoadingSpinner />}>
          {children}
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

function SplashPageNav() {
  return (
    <>
      <Link
        href="/"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        Home
      </Link>
      {/* <Link href="/profile" className="text-muted-foreground transition-colors hover:text-foreground">
        Profile
      </Link> */}
    </>
  );
}