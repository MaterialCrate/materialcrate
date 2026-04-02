import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Libre_Baskerville } from "next/font/google";
import "./globals.css";
import AuthSplashGate from "./components/AuthSplashGate";
import ConditionalNavbar from "./components/ConditionalNavbar";
import { SystemPopupProvider } from "./components/SystemPopup";
import BrowserNotificationBridge from "./components/BrowserNotificationBridge";
import ScrollRestoration from "./components/ScrollRestoration";
import ThemeSync from "./components/ThemeSync";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-baskerville",
});

export const metadata: Metadata = {
  title: "Material Crate",
  description: "Home to your studies.",
};

const themeInitScript = `
  try {
    var savedTheme = localStorage.getItem("mc-theme") || "light";
    if (savedTheme === "dark" || savedTheme === "sepia") {
      document.documentElement.dataset.theme = savedTheme;
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch (error) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${libreBaskerville.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans relative">
        <SystemPopupProvider>
          <Suspense>
            <ScrollRestoration />
          </Suspense>
          <BrowserNotificationBridge />
          <ThemeSync />
          <AuthSplashGate>
            {children}
            <ConditionalNavbar />
          </AuthSplashGate>
        </SystemPopupProvider>
      </body>
    </html>
  );
}
