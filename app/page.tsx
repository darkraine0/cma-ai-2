"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    // Check user authentication and redirect accordingly
    const checkAndRedirect = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          const user = data.user;
          
          // If user is not email verified (and not admin), redirect to signin
          if (user.role !== "admin" && !user.emailVerified) {
            router.replace("/signin");
            return;
          }
          
          // If user is pending approval, show pending page
          if (user.status === "pending") {
            setIsPending(true);
            return;
          }
          
          // User is authenticated and approved - redirect to communities
          router.replace("/communities");
        } else {
          // Not authenticated - redirect to signin
          router.replace("/signin");
        }
      } catch (error) {
        // Error checking auth - redirect to signin
        router.replace("/signin");
      }
    };

    checkAndRedirect();
  }, [router]);

  // Only show pending UI if user is confirmed to be pending
  // Otherwise show nothing (redirecting in background)
  if (!isPending) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[40vw] animate-fade-in-scale">
        <Card className="bg-primary/95 text-white border-0 shadow-2xl min-h-[40vh] flex flex-col backdrop-blur-sm" style={{ boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)' }}>
          <CardContent className="flex-grow flex flex-col justify-center items-center space-y-6 px-8 py-8">
            <div className="text-center space-y-4 max-w-xl mx-auto animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
              <CardTitle className="text-xl md:text-2xl font-bold text-white mb-2">
                Account Pending Approval
              </CardTitle>
              <p className="text-sm md:text-base text-white/90">
                Your account is pending admin approval.
              </p>
              <p className="text-xs md:text-sm text-white/80">
                Please wait for an admin to approve your account. You'll be able to access the application once approved.
              </p>
            </div>
            
            <div className="pt-6 border-t border-white/20 mt-auto w-full max-w-sm mx-auto animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
              <Button
                onClick={async () => {
                  try {
                    await fetch("/api/auth/signout", { method: "POST" });
                    router.push("/signin");
                    router.refresh();
                  } catch (error) {
                    console.error("Sign out error:", error);
                  }
                }}
                variant="outline"
                className="w-full bg-white text-primary hover:bg-white/90 border-white"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
