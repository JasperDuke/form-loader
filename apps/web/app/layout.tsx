import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { ConfigProvider } from "@/components/ConfigProvider";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Convoy — queued file dispatch",
  description: "Upload files, queue them in batches, and dispatch to Atenxion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} font-sans antialiased`}>
        <ConfigProvider>{children}</ConfigProvider>
      </body>
    </html>
  );
}
