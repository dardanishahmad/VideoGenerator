require("dotenv").config();

const express = require("express");
const path = require("path");
const Replicate = require("replicate");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN in .env");
    process.exit(1);
}

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

/*
    POST /api/generate

    Starts an AI video generation job.
*/
app.post("/api/generate", async (req, res) => {
    try {
        const {
            prompt,
            orientation = "portrait"
        } = req.body;

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                error: "Please enter a prompt."
            });
        }

        if (prompt.length > 5000) {
            return res.status(400).json({
                error: "Prompt is too long."
            });
        }

        /*
            HeyGen Video Agent on Replicate.

            duration_sec:
            30 seconds

            orientation:
            portrait or landscape
        */

        const prediction = await replicate.predictions.create({
            model: "heygen/video-agent",
            input: {
                prompt: prompt.trim(),
                duration_sec: 30,
                orientation
            }
        });

        res.json({
            success: true,
            id: prediction.id,
            status: prediction.status
        });

    } catch (error) {
        console.error("Generation error:", error);

        res.status(500).json({
            error: error.message || "Unable to start video generation."
        });
    }
});


/*
    GET /api/status/:id

    Frontend calls this endpoint while
    the video is being generated.
*/
app.get("/api/status/:id", async (req, res) => {
    try {
        const prediction = await replicate.predictions.get(
            req.params.id
        );

        let videoUrl = null;

        if (prediction.status === "succeeded") {
            videoUrl = extractVideoUrl(prediction.output);
        }

        res.json({
            id: prediction.id,
            status: prediction.status,
            videoUrl,
            error: prediction.error || null
        });

    } catch (error) {
        console.error("Status error:", error);

        res.status(500).json({
            error: error.message || "Unable to check generation status."
        });
    }
});


/*
    Replicate model outputs can vary in shape.

    This helper attempts to find a video URL
    whether output is a string, array or object.
*/
function extractVideoUrl(output) {
    if (!output) {
        return null;
    }

    if (typeof output === "string") {
        return output;
    }

    if (Array.isArray(output)) {
        const video = output.find(item => {
            return typeof item === "string" &&
                (
                    item.includes(".mp4") ||
                    item.includes("video")
                );
        });

        return video || output[0] || null;
    }

    if (typeof output === "object") {
        return (
            output.video ||
            output.url ||
            output.video_url ||
            null
        );
    }

    return null;
}


/*
    Health check
*/
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok"
    });
});


app.listen(PORT, () => {
    console.log(`
========================================
 AI Video Generator
========================================

 Server running at:

 http://localhost:${PORT}

========================================
    `);
});
