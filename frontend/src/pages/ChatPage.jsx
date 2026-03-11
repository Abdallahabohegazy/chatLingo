import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const { authUser } = useAuthUser();

  const { data: tokenData, isError: tokenError, isLoading: tokenLoading } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser && !!targetUserId,
  });

  useEffect(() => {
    const initChat = async () => {
      if (!authUser || !targetUserId) {
        setLoading(false);
        return;
      }
      const streamApiKey = tokenData?.streamApiKey || import.meta.env.VITE_STREAM_API_KEY;
      if (!streamApiKey || !tokenData?.token) return;

      try {
        const client = StreamChat.getInstance(streamApiKey);

        const userId = String(authUser._id);
        const targetId = String(targetUserId);

        await client.connectUser(
          {
            id: userId,
            name: authUser.fullName || "User",
            image: authUser.profilePic || "",
          },
          tokenData.token
        );

        const channelId = [userId, targetId].sort().join("-");

        const currChannel = client.channel("messaging", channelId, {
          members: [userId, targetId],
        });

        await currChannel.watch({ presence: true });

        setChatClient(client);
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not connect to chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [tokenData, authUser, targetUserId]);

  useEffect(() => {
    if (!channel || !authUser) return;

    const currentUserId = String(authUser._id);

    const handleNewMessage = (event) => {
      if (event.user?.id !== currentUserId) {
        console.log("New message received");
      }
    };

    channel.on("message.new", handleNewMessage);

    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [channel, authUser]);

  useEffect(() => {
    if (tokenError) {
      toast.error("Could not connect to chat. Please try again.");
      setLoading(false);
    } else if (!tokenLoading && authUser && tokenData && (!tokenData.token || !tokenData.streamApiKey)) {
      toast.error("Chat is not configured. Add STREAM_API_KEY and STREAM_API_SECRET to backend .env");
      setLoading(false);
    } else if (!tokenLoading && authUser && !tokenData?.token) {
      setLoading(false);
    }
  }, [tokenError, tokenLoading, authUser, tokenData]);

  const handleVideoCall = () => {
    if (!authUser || !targetUserId) return;
    const userId = String(authUser._id);
    const targetId = String(targetUserId);
    const callId = [userId, targetId].sort().join("-");
    navigate(`/call/${callId}`);
  };

  if (loading || !chatClient || !channel) return <ChatLoader />;

  return (
    <div className="h-[93vh]">
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <div className="w-full relative">
            <CallButton handleVideoCall={handleVideoCall} />
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput focus />
            </Window>
          </div>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};
export default ChatPage;
