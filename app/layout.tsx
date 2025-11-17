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
                card: "bg-white border-[#E8E4DF] shadow-sm",
                headerTitle: "text-[#1A1614] font-['Bricolage_Grotesque']",
                headerSubtitle: "text-[#8B8682]",
                socialButtonsBlockButton: "border-[#E8E4DF] hover:bg-[#F5F2EE]",
                formButtonPrimary: "bg-[#C85A3C] text-white hover:bg-[#B54F35]",
                formFieldInput: "bg-white border-[#E8E4DF] text-[#1A1614]",
                footerActionLink: "text-[#C85A3C] hover:text-[#B54F35]",
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
