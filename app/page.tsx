"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type AnalysisResponse = {
    summary: string;
    details: string;
    raw?: unknown;
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-all duration-200 hover:shadow-sm"
            title={`Copy ${label}`}
        >
            {copied ? (
                <>
                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">Copied!</span>
                </>
            ) : (
                <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                </>
            )}
        </button>
    );
}

export default function Page() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [focusPrompt, setFocusPrompt] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [showImplementation, setShowImplementation] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setAnalysis(null);

        if (!videoFile && !videoUrl.trim()) {
            setError("Provide a video file or a video URL.");
            return;
        }

        const formData = new FormData();
        if (videoFile) {
            formData.append("video", videoFile);
        }
        if (videoUrl.trim()) {
            formData.append("videoUrl", videoUrl.trim());
        }
        if (focusPrompt.trim()) {
            formData.append("focusPrompt", focusPrompt.trim());
        }

        setIsSubmitting(true);
        setIsStreaming(true);

        let accumulatedSummary = "";
        let accumulatedDetails = "";
        let isFirstChunk = true;

        try {
            const res = await fetch("/api/analyze-video", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(
                    data?.error || `Request failed with status ${res.status}`
                );
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error("No response body available");
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6).trim();

                        if (data === "[DONE]") {
                            continue;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || "";

                            if (content) {
                                if (isFirstChunk) {
                                    accumulatedSummary += content;
                                    accumulatedDetails += content;
                                    isFirstChunk = false;
                                } else {
                                    accumulatedDetails += content;
                                }

                                // Split into summary and details on first newline
                                const parts = accumulatedDetails.split("\n");
                                const summary = parts[0] || "AI analysis in progress...";
                                const details = parts.slice(1).join("\n");

                                setAnalysis({
                                    summary,
                                    details: details || "Generating detailed analysis...",
                                });
                            }
                        } catch (parseError) {
                            // Skip invalid JSON chunks
                            console.warn("Failed to parse chunk:", parseError);
                        }
                    }
                }
            }
        } catch (err: any) {
            setError(err.message || "Unexpected error analyzing video.");
        } finally {
            setIsSubmitting(false);
            setIsStreaming(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
            <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Video-Or
                        </h1>
                        <p className="text-xs text-gray-600">
                            AI-powered video analysis using google/gemini-2.5-flash-lite via OpenRouter.
                        </p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end text-[10px] text-gray-500">
                        <span>Deployed for Vercel</span>
                        <span>Powered by OpenRouter</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 w-full">
                <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                    <section className="bg-white border border-gray-200 rounded-2xl p-4 md:p-6 space-y-4 shadow-sm">
                        <h2 className="text-lg font-semibold">Analyze a video</h2>
                        <p className="text-xs text-gray-600">
                            Upload a clip or paste a video URL (e.g. YouTube). Optionally tell the AI what to focus on
                            (coaching, security, marketing hooks, scene breakdowns, etc.). The backend converts local files
                            to a video data URL and sends everything to OpenRouter's{" "}
                            <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-900 text-[10px]">
                                google/gemini-2.5-flash-lite
                            </code>{" "}
                            using <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-900 text-[10px]">input_video</code>.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">
                                    1. Video file (preferred)
                                </label>
                                <input
                                    type="file"
                                    accept="video/mp4,video/mpeg,video/quicktime,video/webm"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        setVideoFile(file ?? null);

                                        // Create preview URL
                                        if (file) {
                                            const url = URL.createObjectURL(file);
                                            setVideoPreviewUrl(url);
                                        } else {
                                            if (videoPreviewUrl) {
                                                URL.revokeObjectURL(videoPreviewUrl);
                                            }
                                            setVideoPreviewUrl(null);
                                        }
                                    }}
                                    className="block w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer bg-white border border-gray-300 rounded-md"
                                />
                                <p className="text-[10px] text-gray-500">
                                    Max recommended size depends on your OpenRouter/model limits. Compress/trim long videos.
                                </p>

                                {videoPreviewUrl && (
                                    <div className="mt-3 rounded-lg border border-gray-300 bg-gray-50 overflow-hidden">
                                        <video
                                            src={videoPreviewUrl}
                                            controls
                                            className="w-full max-h-[400px]"
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">
                                    2. Or paste video URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://www.youtube.com/watch?v=... or direct video link"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                                />
                                <p className="text-[10px] text-gray-500">
                                    For provider-specific URL support, ensure the target model supports video URLs.
                                    Backend forwards URLs directly without downloading them.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">
                                    3. Focus prompt (optional, but powerful)
                                </label>
                                <textarea
                                    placeholder="Example: Provide a coaching breakdown of the player's footwork and decision making. Highlight tactical patterns, strengths, and mistakes with timestamps if possible."
                                    value={focusPrompt}
                                    onChange={(e) => setFocusPrompt(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black resize-y"
                                />
                                <p className="text-[10px] text-gray-500">
                                    This will be appended to a system prompt so Gemini can tailor the analysis to your needs.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isSubmitting && (
                                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {isSubmitting ? "Analyzing video..." : "Run AI Analysis"}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 animate-fadeIn shadow-sm">
                                <div className="flex items-start gap-2">
                                    <svg className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-[10px] text-red-700 flex-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {analysis && (
                            <div className="mt-4 space-y-3 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-900">
                                        AI Analysis
                                        {isStreaming && (
                                            <span className="ml-2 inline-flex items-center gap-1.5 text-[10px] text-gray-500 font-normal">
                                                <span className="flex gap-0.5">
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></span>
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }}></span>
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></span>
                                                </span>
                                                Streaming...
                                            </span>
                                        )}
                                    </h3>
                                    <CopyButton text={`${analysis.summary}\n\n${analysis.details}`} label="all" />
                                </div>
                                <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 space-y-3 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <div className="relative">
                                        <div className="absolute top-0 right-0">
                                            <CopyButton text={analysis.summary} label="summary" />
                                        </div>
                                        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 pr-20">
                                            <ReactMarkdown>{analysis.summary}</ReactMarkdown>
                                        </div>
                                    </div>
                                    <hr className="border-gray-200" />
                                    <div className="relative">
                                        <div className="absolute top-0 right-0">
                                            <CopyButton text={analysis.details} label="details" />
                                        </div>
                                        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-ul:text-gray-600 prose-ol:text-gray-600 prose-li:text-gray-600 pr-20">
                                            <ReactMarkdown>{analysis.details}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="border border-gray-200 bg-gray-50 rounded-2xl p-3 md:p-4 transition-all duration-200 hover:border-gray-300">
                        <button
                            onClick={() => setShowImplementation(!showImplementation)}
                            className="w-full flex items-center justify-between text-left group"
                        >
                            <h4 className="text-[11px] font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                                Implementation notes
                            </h4>
                            <svg
                                className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showImplementation ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ${showImplementation ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
                            <ul className="text-[9px] text-gray-600 space-y-1 list-disc list-inside">
                                <li>
                                    API route at <code className="bg-gray-200 px-1 py-0.5 rounded">/api/analyze-video</code>{" "}
                                    uses <code className="bg-gray-200 px-1 py-0.5 rounded">google/gemini-2.5-flash-lite</code>{" "}
                                    via OpenRouter with <strong>streaming enabled</strong>.
                                </li>
                                <li>
                                    Local uploads are converted into base64 data URLs and passed as{" "}
                                    <code className="bg-gray-200 px-1 py-0.5 rounded">input_video</code>.
                                </li>
                                <li>
                                    If both file and URL are provided, the backend prefers the file.
                                </li>
                                <li>
                                    Responses stream in real-time using Server-Sent Events for progressive display.
                                </li>
                                <li>
                                    Copy buttons allow exporting summary, details, or full analysis to clipboard.
                                </li>
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}