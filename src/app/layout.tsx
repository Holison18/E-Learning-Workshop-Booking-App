import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog/ConfirmDialogProvider";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KNUST E-Learning Week | Workshops",
  description: "Browse and book workshops for the KNUST E-Learning Week.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body suppressHydrationWarning>
        <ToastProvider>
          <ConfirmDialogProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ConfirmDialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
