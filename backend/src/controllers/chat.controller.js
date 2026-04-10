import { generateStreamToken, getStreamClient, upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import { normalizeLanguageCode, translateMessage } from "../services/translation.service.js";

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

export async function sendTranslatedMessage(req, res) {
  try {
    const { channelId, targetUserId, text } = req.body || {};

    if (!channelId || !targetUserId || !text) {
      return res.status(400).json({ message: "channelId, targetUserId and text are required" });
    }

    const sender = req.user;
    const receiver = await User.findById(targetUserId).select("nativeLanguage");
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    const senderLangRaw = sender?.nativeLanguage || "";
    const receiverLangRaw = receiver?.nativeLanguage || "";

    const senderLang = normalizeLanguageCode(senderLangRaw) || senderLangRaw;
    const receiverLang = normalizeLanguageCode(receiverLangRaw) || receiverLangRaw;

    const translationNeeded =
      !!senderLangRaw &&
      !!receiverLangRaw &&
      String(senderLangRaw).toLowerCase() !== String(receiverLangRaw).toLowerCase();

    const textOriginal = String(text);
    const textTranslated = translationNeeded
      ? await translateMessage(textOriginal, senderLangRaw, receiverLangRaw)
      : textOriginal;

    const originalLanguage = normalizeLanguageCode(senderLangRaw) || String(senderLangRaw).toLowerCase();
    const translatedLanguage = normalizeLanguageCode(receiverLangRaw) || String(receiverLangRaw).toLowerCase();

    const streamClient = getStreamClient();
    const senderId = String(sender._id);
    const receiverId = String(targetUserId);

    const channel = streamClient.channel("messaging", channelId, {
      members: [senderId, receiverId],
    });

    const messagePayload = {
      text: textTranslated,
      textOriginal,
      textTranslated,
      originalLanguage,
      translatedLanguage: translationNeeded ? translatedLanguage : originalLanguage,
      user_id: senderId,
    };

    const response = await channel.sendMessage(messagePayload);
    return res.status(200).json({ success: true, message: response.message });
  } catch (error) {
    console.error("Error in sendTranslatedMessage controller:", error);
    return res.status(500).json({ message: "Failed to send translated message" });
  }
}