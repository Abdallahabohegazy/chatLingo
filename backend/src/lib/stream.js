import { StreamChat } from "stream-chat";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
    throw new Error("Stream API credentials required: STREAM_API_KEY and STREAM_API_SECRET must be set in .env");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
    if (!userData?.id) return userData;
    try {
        await streamClient.upsertUsers([{
            id: String(userData.id),
            name: userData.name || "User",
            image: userData.image || "",
        }]);
        return userData;
    } catch (error) {
        console.error("Error upserting Stream user:", error);
        throw error;
    }
};

export const generateStreamToken = (userId) => {
    try {
        const userIdStr = String(userId);
        const token = streamClient.createToken(userIdStr);
        return token || null;
    } catch (error) {
        console.error("Error generating Stream token:", error);
        return null;
    }
};

export const getStreamClient = () => streamClient;
