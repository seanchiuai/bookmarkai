"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignUpButton } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  return (
    <>
      <Authenticated>
        <RedirectToDashboard />
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </>
  );
}

function RedirectToDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.push('/bookmarks');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight">Bookmark AI</h1>
        <p className="text-muted-foreground mt-2">Redirecting to bookmarks...</p>
      </div>
    </div>
  );
}

function SignInForm() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center animate-fade-in">
        <h1 className="text-5xl font-semibold mb-3 tracking-tight">Bookmark AI</h1>
        <p className="text-muted-foreground mb-12 text-lg">Save and organize your favorite links</p>
        <div className="flex flex-col gap-3">
          <SignInButton mode="modal">
            <button type="button" className="w-full px-6 py-3.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-sm hover:shadow font-medium">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button type="button" className="w-full px-6 py-3.5 border-2 border-border bg-white rounded-xl hover:bg-secondary transition-all duration-200 font-medium">
              Create account
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}

