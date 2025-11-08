import { NextRequest, NextResponse } from "next/server";

const MODEL = "google/gemini-2.5-flash-lite";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const runtime = "nodejs";

async function fileToDataUrl(file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Default to mp4 if we cannot detect; OpenRouter cares that it's a valid video data URL.
    const mime =
        file.type ||
        "video/mp4";
    const base64 = buffer.toString("base64");
    return `data:${mime};base64,${base64}`;
}

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Server misconfigured: OPENROUTER_API_KEY is missing." },
                { status: 500 }
            );
        }

        const formData = await req.formData();

        const focusPrompt = (formData.get("focusPrompt") || "").toString().trim();
        const urlInput = (formData.get("videoUrl") || "").toString().trim();
        const fileInput = formData.get("video");

        if (!fileInput && !urlInput) {
            return NextResponse.json(
                { error: "Provide a video file or a video URL." },
                { status: 400 }
            );
        }

        let videoUrl: string | null = null;

        // Prefer uploaded file when both provided.
        if (fileInput instanceof File) {
            if (fileInput.size === 0) {
                return NextResponse.json(
                    { error: "Uploaded video file is empty." },
                    { status: 400 }
                );
            }

            // Basic safety: cap size (example: 100MB). Adjust based on your limits.
            const maxBytes = 100 * 1024 * 1024;
            if (fileInput.size > maxBytes) {
                return NextResponse.json(
                    {
                        error:
                            "Video too large. Please compress or trim below 100MB before uploading.",
                    },
                    { status: 413 }
                );
            }

            videoUrl = await fileToDataUrl(fileInput);
        } else if (urlInput) {
            // Do minimal validation; OpenRouter/provider will enforce capabilities.
            try {
                // eslint-disable-next-line no-new
                new URL(urlInput);
            } catch {
                return NextResponse.json(
                    { error: "Invalid video URL provided." },
                    { status: 400 }
                );
            }
            videoUrl = urlInput;
        }

        if (!videoUrl) {
            return NextResponse.json(
                { error: "Unable to resolve video input." },
                { status: 400 }
            );
        }

        const baseInstruction =
            "You are an expert video analysis system. Provide a structured, detailed analysis of the provided video. " +
            "Include: (1) clear summary, (2) timeline/scene breakdown where relevant with approximate timestamps if inferable, " +
            "(3) domain-specific insights (e.g., coaching, marketing hooks, storytelling, UX, security), " +
            "(4) concise bullet-point recommendations.";

        const mergedPrompt =
            baseInstruction +
            (focusPrompt
                ? ` The user has an additional focus: "${focusPrompt}". Prioritize this focus in your analysis while still covering core observations.`
                : " If no additional focus is provided, infer the most valuable insights for a professional audience.");

        const body = {
            model: MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: mergedPrompt,
                        },
                        {
                            type: "input_video",
                            video_url: {
                                url: videoUrl,
                            },
                        },
                    ],
                },
            ],
            stream: false,
        };

        const openrouterRes = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": req.headers.get("referer") || "",
                "X-Title": "Video-Or AI Video Analysis",
            },
            body: JSON.stringify(body),
        });

        if (!openrouterRes.ok) {
            const errText = await openrouterRes.text().catch(() => "");
            return NextResponse.json(
                {
                    error:
                        "OpenRouter request failed. Check model/video compatibility and limits.",
                    details: errText || `Status ${openrouterRes.status}`,
                },
                { status: 502 }
            );
        }

        const json = await openrouterRes.json();

        const contentText: string =
            json.choices?.[0]?.message?.content ||
            json.choices?.[0]?.message?.content?.[0]?.text ||
            "";

        if (!contentText) {
            return NextResponse.json(
                {
                    error: "No content returned from model.",
                    raw: json,
                },
                { status: 502 }
            );
        }

        // Simple split into summary + details for UI.
        const [firstLine, ...rest] = contentText.split("\n");
        const summary =
            firstLine.trim() || "AI analysis generated. See detailed breakdown below.";
        const details = rest.join("\n").trim() || contentText;

        return NextResponse.json({
            summary,
            details,
            // Optionally expose raw in non-production; here we keep minimal.
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                error: "Unexpected server error while analyzing video.",
                details: err?.message || String(err),
            },
            { status: 500 }
        );
    }
}