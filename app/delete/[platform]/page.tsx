// file: /app/delete/[platform]/page.tsx
// feature: Auth - Platform data deletion handler

"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

type DeletionStatus = "pending" | "deleting" | "success" | "error";

export default function PlatformDataDeletion() {
  const { platform } = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [status, setStatus] = useState<DeletionStatus>("pending");
  const [error, setError] = useState<string | null>(null);

  // Get platform-specific user data
  const userData = useQuery(
    api.users.index.getPlatformData, 
    isAuthenticated ? { platform: platform as string } : "skip"
  );

  // Delete mutation
  const deletePlatformData = useMutation(api.users.index.deletePlatformData);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please sign in to manage your data.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      setStatus("deleting");
      await deletePlatformData({ platform: platform as string });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to delete data");
    }
  };

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-xl animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Delete {platform} Data
          </CardTitle>
        </CardHeader>

        <CardContent>
          {status === "pending" && (
            <div className="space-y-6">
              <Alert>
                <AlertTitle>Review Your Data</AlertTitle>
                <AlertDescription>
                  The following data associated with your {platform} account will be permanently deleted:
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {userData ? (
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(userData, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">No data found.</p>
                )}
              </div>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This action cannot be undone. All data associated with your {platform} account
                  will be permanently deleted from our systems.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {status === "deleting" && (
            <div className="py-8 text-center">
              <LoadingSpinner size="lg" label="Deleting data..." />
            </div>
          )}

          {status === "success" && (
            <Alert className="bg-green-500/15 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your {platform} data has been successfully deleted from our systems.
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error || `Failed to delete ${platform} data. Please try again.`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex gap-4 justify-end">
          {status === "pending" ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete Data
              </Button>
            </>
          ) : (
            <Button 
              variant="outline"
              onClick={handleClose}
            >
              Close
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}