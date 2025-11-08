"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type AnalysisResponse = {
    summary: string;
    details: string;
    raw?: unknown;
};

export default function Page() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState("");
    const [focusPrompt, setFocusPrompt] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

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

            const data = (await res.json()) as AnalysisResponse;
            setAnalysis(data);
        } catch (err: any) {
            setError(err.message || "Unexpected error analyzing video.");
        } finally {
            setIsSubmitting(false);
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
                                className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? "Analyzing video..." : "Run AI Analysis"}
                            </button>
                        </form>

                        {error && (
                            <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2">
                                <p className="text-[10px] text-red-700">{error}</p>
                            </div>
                        )}

                        {analysis && (
                            <div className="mt-4 space-y-3">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    AI Analysis
                                </h3>
                                <div className="rounded-lg border border-gray-300 bg-white px-4 py-3 space-y-3">
                                    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700">
                                        <ReactMarkdown>{analysis.summary}</ReactMarkdown>
                                    </div>
                                    <hr className="border-gray-200" />
                                    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-ul:text-gray-600 prose-ol:text-gray-600 prose-li:text-gray-600">
                                        <ReactMarkdown>{analysis.details}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="border border-gray-200 bg-gray-50 rounded-2xl p-3 md:p-4">
                        <h4 className="text-[11px] font-semibold text-gray-700">
                            Implementation notes
                        </h4>
                        <ul className="mt-1 text-[9px] text-gray-600 space-y-1 list-disc list-inside">
                            <li>
                                API route at <code className="bg-gray-200 px-1 py-0.5 rounded">/api/analyze-video</code>{" "}
                                uses <code className="bg-gray-200 px-1 py-0.5 rounded">google/gemini-2.5-flash-lite</code>{" "}
                                via OpenRouter.
                            </li>
                            <li>
                                Local uploads are converted into base64 data URLs and passed as{" "}
                                <code className="bg-gray-200 px-1 py-0.5 rounded">input_video</code>.
                            </li>
                            <li>
                                If both file and URL are provided, the backend prefers the file.
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </main>
    );
}