import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Video-Or | AI Video Analysis",
    description:
        "Upload videos or provide URLs and get detailed AI-powered insights using Google Gemini via OpenRouter.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full">
            <body className="min-h-full bg-slate-950 text-slate-50 antialiased">
                {children}
            </body>
        </html>
    );
}