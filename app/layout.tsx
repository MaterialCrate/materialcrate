import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import "./globals.css";
import ConditionalNavbar from "./components/ConditionalNavbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-baskerville",
});

export const metadata: Metadata = {
  title: "JuMaterials",
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
      className={`${inter.variable} ${libreBaskerville.variable} antialiased`}
    >
      <Auth0Provider>
        <body className="font-sans relative">
          {children}
          <ConditionalNavbar />
        </body>
      </Auth0Provider>
    </html>
  );
}
