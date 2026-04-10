import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";

const CallPage = () => {
  const { id: callId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const joinedRef = useRef(false);
  const callRef = useRef(null);
  const clientRef = useRef(null);

  const { authUser, isLoading } = useAuthUser();

  const { data: tokenData, isError: tokenError } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser && !!callId,
  });

  useEffect(() => {
    if (tokenError) {
      toast.error("Could not connect to video call.");
      setIsConnecting(false);
    }
  }, [tokenError]);

  useEffect(() => {
    const initCall = async () => {
      if (!tokenData?.token || !authUser || !callId) return;
      if (joinedRef.current) return;
      joinedRef.current = true;

      const streamApiKey = tokenData.streamApiKey || import.meta.env.VITE_STREAM_API_KEY;
      if (!streamApiKey) {
        toast.error("Video call is not configured.");
        setIsConnecting(false);
        joinedRef.current = false;
        return;
      }

      try {
        const user = {
          id: String(authUser._id),
          name: authUser.fullName || "User",
          image: authUser.profilePic || "",
        };

        const videoClient = new StreamVideoClient({
          apiKey: streamApiKey,
          user,
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", callId);
        await callInstance.join({ create: true });

        callRef.current = callInstance;
        clientRef.current = videoClient;
        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("Error joining call:", error);
        toast.error("Could not join the call. Please try again.");
        joinedRef.current = false;
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();

    return () => {
      joinedRef.current = false;
      const c = callRef.current;
      const v = clientRef.current;
      callRef.current = null;
      clientRef.current = null;
      if (c) c.leave().catch(() => {});
      if (v) v.disconnectUser().catch(() => {});
    };
  }, [tokenData, authUser, callId]);

  if (isLoading || isConnecting) return <PageLoader />;

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="relative">
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Could not initialize call. Please refresh or try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CallContent = () => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const navigate = useNavigate();

  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      navigate("/", { replace: true });
    }
  }, [callingState, navigate]);

  if (callingState === CallingState.LEFT) {
    return null;
  }

  return (
    <StreamTheme>
      <SpeakerLayout />
      <CallControls />
    </StreamTheme>
  );
};

export default CallPage;
