import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AuthSplashGate from "./components/AuthSplashGate";
import ConditionalNavbar from "./components/ConditionalNavbar";

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
      <Script id="materialcrate-theme-init" strategy="beforeInteractive">
        {`
          try {
            var savedTheme = localStorage.getItem("mc-theme") || "system";
            var resolvedTheme = savedTheme;
            if (savedTheme === "system") {
              resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            }
            document.documentElement.dataset.theme = resolvedTheme;
          } catch (error) {}
        `}
      </Script>
      <body className="font-sans relative">
        <AuthSplashGate>
          {children}
          <ConditionalNavbar />
        </AuthSplashGate>
      </body>
    </html>
  );
}
