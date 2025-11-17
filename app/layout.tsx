import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import ClientBody from "@/components/ClientBody";

export const metadata: Metadata = {
  title: "VIBED",
  description: "Welcome to VIBED",
  icons: {
    icon: "/convex.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ClientBody className="antialiased">
          <ClerkProvider
            dynamic
            appearance={{
              variables: {
                colorPrimary: "#C85A3C",
                colorBackground: "#FAF8F5",
                colorInputBackground: "#FFFFFF",
                colorInputText: "#1A1614",
                colorText: "#1A1614",
                colorTextSecondary: "#8B8682",
                colorNeutral: "#E8E4DF",
                colorDanger: "#D64545",
                colorSuccess: "#7A9D87",
                colorWarning: "#E8A87C",
                borderRadius: "0.875rem",
                fontFamily: "'Commissioner', system-ui, sans-serif",
              },
              elements: {
                card: "bg-white border-border shadow-sm",
                headerTitle: "text-foreground font-['Bricolage_Grotesque']",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton: "border-border hover:bg-secondary",
                formButtonPrimary: "bg-primary text-white hover:bg-primary-hover",
                formFieldInput: "bg-white border-border text-foreground",
                footerActionLink: "text-primary hover:text-primary-hover",
              }
            }}
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ClerkProvider>
        </ClientBody>
      </body>
    </html>
  );
}
