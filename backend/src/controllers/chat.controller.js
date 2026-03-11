import { generateStreamToken, upsertStreamUser } from "../lib/stream.js";

export async function getStreamToken(req, res) {
    try {
        const user = req.user;
        const userId = user._id.toString();

        await upsertStreamUser({
            id: userId,
            name: user.fullName || "User",
            image: user.profilePic || "",
        });

        const token = generateStreamToken(userId);
        if (!token) {
            return res.status(500).json({ message: "Failed to generate chat token. Check Stream API credentials." });
        }

        const streamApiKey = process.env.STREAM_API_KEY;
        if (!streamApiKey) {
            return res.status(500).json({ message: "Stream API key not configured on server." });
        }

        res.status(200).json({ token, streamApiKey });
    } catch (error) {
        console.error("Error in Stream token controller:", error);
        res.status(500).json({ message: "Could not connect to chat. Please try again." });
    }
}