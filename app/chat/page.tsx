"use client";

import React, { useEffect, useState, useRef } from "react";
import { client } from "@/utils/insforge";
import {
  Send, LogOut, Loader2, Sparkles, AlertCircle,
  Hash, Search, X, MessageSquare, Circle, Paperclip, FileText, Moon, Sun,
  Trash2, ChevronRight, Plus, Settings, Bell, Phone, Video, Pin, Users as UsersIcon, Image as ImageIcon, Menu
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = { id: string; username: string };

type Message = {
  id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
  channel: string;
  recipient_id?: string | null;
  file_url?: string | null;
  file_key?: string | null;
  file_name?: string | null;
  file_type?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const GLOBAL_CHANNEL = "chat_room";

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [verifyStep, setVerifyStep] = useState(false);
  const [otp, setOtp] = useState("");

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [selectedChat, setSelectedChat] = useState<"global" | string>("global");
  const [messages, setMessages] = useState<Record<string, Message[]>>({ global: [] });
  const [input, setInput] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── UI Interactivity States ───────────────────────────────────────────────
  const [activeWorkspace, setActiveWorkspace] = useState('ICG');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeCall, setActiveCall] = useState<'audio'|'video'|null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // ── Users ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [dmUsers, setDmUsers] = useState<Profile[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set());

  // ── Connection status (visible to user) ───────────────────────────────────
  const [connStatus, setConnStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [retryCount, setRetryCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({ global: new Set() });
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ msg: string; channel: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myProfileRef = useRef<Profile | null>(null);
  const realtimeStarted = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { myProfileRef.current = myProfile; }, [myProfile]);

  // ── Scroll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat]);

  // ── Theme toggle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // ── Restore session ───────────────────────────────────────────────────────
  useEffect(() => {
    client.auth.getCurrentUser().then(({ data }) => {
      if (data?.user) setUser({ id: data.user.id, email: data.user.email });
    });
  }, []);

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    client.database.from("profiles").select("id, username").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setMyProfile(data as Profile);
        
        client.database.from("pinned_chats").select("pinned_user_id").eq("user_id", data.id).then(({ data: pinned }) => {
          if (pinned && pinned.length > 0) {
            const pinnedIds = (pinned as { pinned_user_id: string }[]).map(p => p.pinned_user_id);
            setPinnedChats(new Set(pinnedIds));
            
            client.database.from("profiles").select("id, username").in("id", pinnedIds).then(({ data: users }) => {
              if (users) {
                setDmUsers(prev => {
                  const newUsers = [...prev];
                  (users as Profile[]).forEach(u => {
                    if (!newUsers.find(nu => nu.id === u.id)) newUsers.push(u);
                  });
                  return newUsers;
                });
              }
            });
          }
        });
      }
    });
  }, [user]);

  function showToast(msg: string, channel: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ msg, channel });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  }

  // ── Realtime setup — ONE channel, client-side filtering ───────────────────
  useEffect(() => {
    if (!myProfile || realtimeStarted.current) return;
    realtimeStarted.current = true;

    const start = async () => {
      setConnStatus("connecting");

      client.realtime.on("connect", () => setConnStatus("connected"));
      client.realtime.on("connect_error", () => { setConnStatus("error"); realtimeStarted.current = false; });
      client.realtime.on("disconnect", () => { setConnStatus("connecting"); realtimeStarted.current = false; });
      client.realtime.on("error", ({ code, message }: Record<string, unknown>) => console.warn("RT error", code, message));

      try {
        await client.realtime.connect();
      } catch (err: unknown) {
        const error = err as Error;
        console.warn("Realtime connect failed:", error?.message ?? error);
        setConnStatus("error");
        realtimeStarted.current = false;
        retryTimerRef.current = setTimeout(() => {
          setRetryCount(c => c + 1);
        }, 5000);
        return;
      }

      setConnStatus("connected");

      const subResult = await client.realtime.subscribe(GLOBAL_CHANNEL);
      if (!subResult.ok) {
        console.error("Failed to subscribe:", subResult.error);
        setConnStatus("error");
        realtimeStarted.current = false;
        return;
      }
      console.log("✅ Subscribed to chat_room");

      client.realtime.on("new_global_message", (payload: unknown) => {
        const msg = payload as Message;
        if (!msg?.id) return;
        setMessages(prev => {
          if ((prev.global ?? []).find(m => m.id === msg.id)) return prev;
          return { ...prev, global: [...(prev.global ?? []), msg] };
        });

        if (selectedChat !== "global") {
          setUnreadCounts(prev => ({ ...prev, global: (prev.global ?? 0) + 1 }));
          showToast(`New message in #Global`, "global");
        }
      });

      client.realtime.on("new_dm_message", (payload: unknown) => {
        const msg = payload as Message;
        if (!msg?.id) return;
        const me = myProfileRef.current;
        if (!me) return;

        const amSender = msg.user_id === me.id;
        const amRecipient = msg.recipient_id === me.id;
        if (!amSender && !amRecipient) return;

        const otherPersonId = amSender ? (msg.recipient_id ?? "") : msg.user_id;
        if (!otherPersonId) return;

        if (amRecipient) {
          const senderProfile: Profile = { id: msg.user_id, username: msg.username };
          setDmUsers(prev => prev.find(u => u.id === msg.user_id) ? prev : [...prev, senderProfile]);
        }

        setMessages(prev => {
          if ((prev[otherPersonId] ?? []).find(m => m.id === msg.id)) return prev;
          return { ...prev, [otherPersonId]: [...(prev[otherPersonId] ?? []), msg] };
        });

        if (selectedChat !== otherPersonId) {
          setUnreadCounts(prev => ({ ...prev, [otherPersonId]: (prev[otherPersonId] ?? 0) + 1 }));
          showToast(`Direct message from ${msg.username}`, otherPersonId);
        }
      });

      client.realtime.on("user_online", (payload: Record<string, unknown>) => {
        if (typeof payload?.user_id === "string") setOnlineUserIds(prev => new Set(prev).add(payload.user_id as string));
      });
      client.realtime.on("user_offline", (payload: Record<string, unknown>) => {
        if (typeof payload?.user_id === "string") setOnlineUserIds(prev => { const s = new Set(prev); s.delete(payload.user_id as string); return s; });
      });

      client.realtime.on("typing_start", (payload: Record<string, unknown>) => {
        const { user_id, username, channel_id } = payload as { user_id: string; username: string; channel_id: string };
        if (!user_id || user_id === myProfileRef.current?.id) return;
        setTypingUsers(prev => {
          const s = new Set(prev[channel_id] || []);
          s.add(username);
          return { ...prev, [channel_id]: s };
        });
      });

      client.realtime.on("typing_stop", (payload: Record<string, unknown>) => {
        const { username, channel_id } = payload as { username: string; channel_id: string };
        setTypingUsers(prev => {
          const s = new Set(prev[channel_id] || []);
          s.delete(username);
          return { ...prev, [channel_id]: s };
        });
      });

      client.realtime.on("message_deleted", (payload: Record<string, unknown>) => {
        const { id, channel_id } = payload as { id: string; channel_id: string };
        setMessages(prev => {
          const cid = channel_id === "global" ? "global" : channel_id;
          return { ...prev, [cid]: (prev[cid] || []).filter(m => m.id !== id) };
        });
      });

      await client.realtime.publish(GLOBAL_CHANNEL, "user_online", {
        user_id: myProfile.id,
        username: myProfile.username,
      });

      const { data: hist } = await client.database
        .from("messages")
        .select("*")
        .eq("channel", "global")
        .order("created_at", { ascending: true })
        .limit(80);
      if (hist) setMessages(prev => ({ ...prev, global: hist as Message[] }));
    };

    start().catch(err => {
      console.error("Realtime start failed:", err);
      setConnStatus("error");
      realtimeStarted.current = false;
    });

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      const me = myProfileRef.current;
      if (me) client.realtime.publish(GLOBAL_CHANNEL, "user_offline", { user_id: me.id }).catch(() => { });
      client.realtime.disconnect();
      realtimeStarted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile, retryCount]);

  const handleReconnect = () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    client.realtime.disconnect();
    realtimeStarted.current = false;
    setConnStatus("connecting");
    setRetryCount(c => c + 1);
  };

  const openDm = async (profile: Profile) => {
    setSelectedChat(profile.id);
    setMobileMenuOpen(false);
    setUnreadCounts(prev => ({ ...prev, [profile.id]: 0 }));
    setDmUsers(prev => prev.find(u => u.id === profile.id) ? prev : [...prev, profile]);
    setSearchQuery("");
    setSearchResults([]);

    if (!messages[profile.id]) {
      const me = myProfileRef.current;
      if (!me) return;
      const { data: sent } = await client.database.from("messages").select("*")
        .eq("user_id", me.id).eq("recipient_id", profile.id)
        .order("created_at", { ascending: true }).limit(80);
      const { data: received } = await client.database.from("messages").select("*")
        .eq("user_id", profile.id).eq("recipient_id", me.id)
        .order("created_at", { ascending: true }).limit(80);

      const combined = [...(sent ?? []), ...(received ?? [])] as Message[];
      combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(prev => ({ ...prev, [profile.id]: combined }));
    }
  };

  const loadMore = async () => {
    if (loadingMore) return;
    const currentMsgs = messages[selectedChat] ?? [];
    if (currentMsgs.length === 0) return;

    setLoadingMore(true);
    const oldestDate = currentMsgs[0].created_at;
    const isGlobal = selectedChat === "global";

    let query = client.database.from("messages").select("*");

    if (isGlobal) {
      query = query.eq("channel", "global");
    } else {
      const me = myProfileRef.current;
      if (!me) return;
      query = query.or(`and(user_id.eq.${me.id},recipient_id.eq.${selectedChat}),and(user_id.eq.${selectedChat},recipient_id.eq.${me.id})`);
    }

    const { data: older } = await query
      .lt("created_at", oldestDate)
      .order("created_at", { ascending: false })
      .limit(40);

    if (older && older.length > 0) {
      const newMsgs = [...(older as Message[])].reverse();
      setMessages(prev => ({ ...prev, [selectedChat]: [...newMsgs, ...(prev[selectedChat] ?? [])] }));
    }
    setLoadingMore(false);
  };

  const togglePin = async () => {
    const me = myProfileRef.current;
    if (!me || selectedChat === "global") return;
    
    const isPinned = pinnedChats.has(selectedChat);
    const newPinned = new Set(pinnedChats);
    
    if (isPinned) {
      newPinned.delete(selectedChat);
      setPinnedChats(newPinned);
      await client.database.from("pinned_chats")
        .delete()
        .eq("user_id", me.id)
        .eq("pinned_user_id", selectedChat);
      showToast("Chat unpinned", selectedChat);
    } else {
      newPinned.add(selectedChat);
      setPinnedChats(newPinned);
      await client.database.from("pinned_chats")
        .insert([{ user_id: me.id, pinned_user_id: selectedChat }]);
      showToast("Chat pinned to favorites", selectedChat);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await client.database.from("profiles").select("id, username")
        .ilike("username", `%${searchQuery.trim()}%`).limit(8);
      setSearchResults(((data as Profile[] | null) ?? []).filter(p => p.id !== myProfile?.id));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery, myProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setAttachPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachPreview(null);
    }
    e.target.value = "";
  };

  const clearAttach = () => { setAttachFile(null); setAttachPreview(null); };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const me = myProfileRef.current;
    if ((!input.trim() && !attachFile) || !me || sendLoading) return;
    setSendLoading(true);

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();

    let fileUrl: string | null = null;
    let fileKey: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    if (attachFile) {
      const { data: uploadData, error: uploadError } = await client.storage
        .from("chat-attachments")
        .uploadAuto(attachFile);
      if (uploadError || !uploadData) {
        console.error("Upload failed:", uploadError);
        setSendLoading(false);
        return;
      }
      fileUrl = uploadData.url;
      fileKey = uploadData.key;
      fileName = attachFile.name;
      fileType = attachFile.type;
      clearAttach();
    }

    const isGlobal = selectedChat === "global";
    const recipientId = isGlobal ? null : selectedChat;
    const msg: Message = {
      id: msgId, user_id: me.id, username: me.username,
      content: input.trim(), created_at: now,
      channel: isGlobal ? "global" : "dm",
      recipient_id: recipientId,
      file_url: fileUrl, file_key: fileKey,
      file_name: fileName, file_type: fileType,
    };
    setInput("");

    if (isGlobal) {
      setMessages(prev => ({ ...prev, global: [...(prev.global ?? []), msg] }));
      await client.database.from("messages").insert([msg]);
      await client.realtime.publish(GLOBAL_CHANNEL, "new_global_message", msg);
    } else {
      setMessages(prev => ({ ...prev, [recipientId!]: [...(prev[recipientId!] ?? []), msg] }));
      await client.database.from("messages").insert([msg]);
      await client.realtime.publish(GLOBAL_CHANNEL, "new_dm_message", msg);
    }

    setSendLoading(false);
  };

  const handleDelete = async (msg: Message) => {
    if (!confirm("Delete this message?")) return;
    const cid = msg.channel === "global" ? "global" : (msg.recipient_id === myProfile?.id ? msg.user_id : msg.recipient_id!);
    setMessages(prev => ({ ...prev, [cid]: (prev[cid] || []).filter(m => m.id !== msg.id) }));
    await client.database.from("messages").delete().eq("id", msg.id);
    if (msg.file_key) await client.storage.from("chat-attachments").remove(msg.file_key);
    await client.realtime.publish(GLOBAL_CHANNEL, "message_deleted", {
      id: msg.id,
      channel_id: msg.channel === "global" ? "global" : myProfile?.id
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    else if (data?.user) setUser({ id: data.user.id, email: data.user.email });
    setAuthLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) { setAuthError("Please choose a username."); return; }
    setAuthLoading(true); setAuthError("");
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) { setAuthError(error.message); setAuthLoading(false); return; }
    if (data?.requireEmailVerification) { setVerifyStep(true); setAuthLoading(false); return; }
    if (data?.user) {
      await client.database.from("profiles").insert([{ id: data.user.id, username: usernameInput.trim() }]);
      setUser({ id: data.user.id, email: data.user.email });
    }
    setAuthLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    const { data, error } = await client.auth.verifyEmail({ email, otp });
    if (error) setAuthError(error.message);
    else if (data?.user) {
      await client.database.from("profiles").insert([{ id: data.user.id, username: usernameInput.trim() }]);
      setUser({ id: data.user.id, email: data.user.email });
    }
    setAuthLoading(false);
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true); setAuthError("");
    const rnd = Math.floor(Math.random() * 99999);
    const gEmail = `guest${rnd}@insforge.app`, gPw = `Guest${rnd}!x`, gUname = `guest_${rnd}`;
    await client.auth.signUp({ email: gEmail, password: gPw });
    const { data, error } = await client.auth.signInWithPassword({ email: gEmail, password: gPw });
    if (error || !data?.user) { setAuthError("Guest login failed."); setAuthLoading(false); return; }
    await client.database.from("profiles").insert([{ id: data.user.id, username: gUname }]);
    setUser({ id: data.user.id, email: data.user.email });
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    const me = myProfileRef.current;
    if (me) await client.realtime.publish(GLOBAL_CHANNEL, "user_offline", { user_id: me.id }).catch(() => { });
    await client.auth.signOut();
    client.realtime.disconnect();
    realtimeStarted.current = false;
    setUser(null); setMyProfile(null); setMessages({ global: [] });
    setDmUsers([]); setOnlineUserIds(new Set()); setConnStatus("connecting");
  };

  // ─── Format Utils ─────────────────────────────────────────────────────────
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
  };
  const formatDateString = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ─── Auth View ────────────────────────────────────────────────────────────
  if (!user || !myProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] dark:bg-[#0a0a0c] p-4 font-sans text-[#191c1e] dark:text-white relative overflow-hidden">
        {/* Accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38]/10 blur-[140px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-white/5 blur-[140px] rounded-full" />
        </div>
        
        {/* Box */}
        <div className="w-full max-w-[420px] z-10">
          <div className="flex items-center justify-center gap-3 mb-10">
              <div className="bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] flex items-center justify-center w-12 h-12 rounded-xl shadow-[0_0_20px_rgba(211,245,91,0.2)] -skew-x-6">
                <span className="text-[#191c1e] dark:text-white font-black text-2xl italic">S</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#191c1e] dark:text-white">InsForge</h1>
          </div>
          <div className="bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)]/90 backdrop-blur-3xl border border-transparent dark:border-white/5 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {!verifyStep && (
              <div className="flex bg-[#f2f4f6] dark:bg-[#1a1b22] rounded-xl p-1.5 mb-6 shadow-inner border border-transparent dark:border-white/5">
                {(["signin", "signup"] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => { setAuthMode(mode); setAuthError(""); }}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === mode ? "bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white shadow-sm transform scale-[1.02]" : "text-[#191c1e]/50 dark:text-white/50 hover:text-[#191c1e] dark:text-white"}`}>
                    {mode === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>
            )}
            {verifyStep ? (
              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <p className="text-[#191c1e]/80 dark:text-white/80 text-sm text-center">Enter the 6-digit code sent to <strong>{email}</strong></p>
                <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6}
                  className="w-full px-4 py-3.5 bg-[#e0e3e5] dark:bg-[#18191e] border border-transparent dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0056d2] dark:ring-[#d3f55b] text-[#191c1e] dark:text-white text-center text-3xl tracking-widest shadow-inner transition-colors" />
                {authError && <ErrorBox msg={authError} />}
                <AuthBtn loading={authLoading} label="Verify Email" />
              </form>
            ) : authMode === "signin" ? (
              <form onSubmit={handleSignIn} className="flex flex-col gap-5">
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
                {authError && <ErrorBox msg={authError} />}
                <AuthBtn loading={authLoading} label="Sign In" />
                <Divider />
                <button type="button" onClick={handleGuestLogin} disabled={authLoading}
                  className="w-full border border-transparent dark:border-white/5 hover:border-transparent dark:border-white/5 bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] hover:bg-[#f2f4f6] dark:bg-[#1a1b22] text-[#191c1e]/80 dark:text-white/80 hover:text-[#191c1e] dark:text-white py-3.5 rounded-xl font-semibold transition-all shadow-sm">
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Continue as Guest"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="flex flex-col gap-5">
                <Field label="Username" type="text" value={usernameInput} onChange={setUsernameInput} placeholder="pick a username" />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="min. 8 characters" />
                {authError && <ErrorBox msg={authError} />}
                <AuthBtn loading={authLoading} label="Create Account" />
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Chat View ────────────────────────────────────────────────────────────
  const activeMsgs = messages[selectedChat] ?? [];
  const selectedDmUser = dmUsers.find(u => u.id === selectedChat);
  const chatTitle = selectedChat === "global" ? "Global Room" : selectedDmUser?.username ?? "Direct Message";

  return (
    <div className="flex h-[100dvh] bg-[#f7f9fb] dark:bg-[#0a0a0c] text-[#191c1e] dark:text-white font-sans overflow-hidden md:p-2.5 md:gap-2.5">
      
      {/* 1. Leftmost Nav */}
      <nav className={`w-[72px] flex-col items-center gap-5 py-6 flex-shrink-0 bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] md:rounded-3xl  border-transparent dark:border-white/5 shadow-lg relative z-20 ${mobileMenuOpen ? 'flex' : 'hidden md:flex'}`}>
        <div onClick={() => setActiveWorkspace('Home')} className="w-11 h-11 bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] rounded-2xl flex items-center justify-center -skew-x-6 shadow-[0_12px_24px_rgba(0,86,210,0.2)] dark:shadow-[0_12px_24px_rgba(211,245,91,0.2)] cursor-pointer hover:scale-105 transition-transform">
          <span className="text-[#191c1e] dark:text-white font-black text-2xl italic">S</span>
        </div>
        
        <div className="w-6 h-px bg-white/10 my-1" />
        
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto w-full items-center custom-scrollbar">
          {['Work', 'ICG', 'SP', 'BFF', 'MJ', 'GI'].map((lbl) => (
            <div key={lbl} onClick={() => setActiveWorkspace(lbl)} className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[11px] font-bold cursor-pointer transition-all ${activeWorkspace === lbl ? 'bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white shadow-[0_8px_20px_rgba(0,86,210,0.15)] dark:shadow-[0_8px_20px_rgba(211,245,91,0.15)]' : 'bg-[#f2f4f6] dark:bg-[#1a1b22] text-[#191c1e]/80 dark:text-white/80 hover:bg-[#e0e3e5] dark:bg-[#18191e] hover:text-[#191c1e] dark:text-white hover:rounded-xl'}`}>
              {lbl}
            </div>
          ))}
        </div>
        
        <button onClick={() => setShowSettingsModal(true)} className="w-11 h-11 rounded-2xl bg-white/[0.03] text-[#191c1e]/60 dark:text-white/60 flex items-center justify-center hover:bg-white/10 hover:text-[#191c1e] dark:text-white hover:rounded-xl transition-all border border-transparent dark:border-white/5">
          <Settings className="w-5 h-5" />
        </button>
        <button onClick={() => showToast("Add Workspace dialog opened", "global")} className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white flex items-center justify-center shadow-[0_8px_16px_rgba(0,86,210,0.2)] dark:shadow-[0_8px_16px_rgba(211,245,91,0.2)] transform transition-transform hover:scale-110 mt-2">
          <Plus className="w-6 h-6" />
        </button>
      </nav>

      {/* 2. Messages Sidebar */}
      <aside className={`flex-1 md:w-[300px] md:flex-shrink-0 flex-col h-full bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] md:rounded-3xl overflow-hidden shadow-xl border-transparent dark:border-white/5 relative z-10 ${mobileMenuOpen ? 'flex' : 'hidden md:flex'}`}>
         <div className="p-6 pb-4 border-transparent dark:border-white/5">
            <div className="flex items-center gap-3 mb-5">
               <h2 className="font-bold text-[22px] text-[#191c1e] dark:text-white tracking-tight">Messages</h2>
               <span className="bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">{dmUsers.length + 1}</span>
            </div>
            <div className="relative">
               <Search className="w-4 h-4 absolute left-3.5 top-[13px] text-[#191c1e]/40 dark:text-white/40" />
               <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f2f4f6] dark:bg-[#1a1b22] border border-transparent dark:border-white/5 rounded-2xl pl-10 pr-8 py-2.5 text-sm text-[#191c1e] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0056d2] dark:ring-[#d3f55b]/50 transition-all shadow-inner placeholder-white/30" />
               {searchQuery && (
                 <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-3.5 top-[14px] text-[#191c1e]/50 dark:text-white/50 hover:text-[#191c1e] dark:text-white">
                   <X className="w-3.5 h-3.5" />
                 </button>
               )}
            </div>
         </div>

         {searchQuery && (
           <div className="absolute left-6 right-6 top-[125px] bg-[#f2f4f6] dark:bg-[#1a1b22] border border-transparent dark:border-white/5 rounded-2xl shadow-2xl z-50 overflow-hidden">
             {searchResults.length > 0 ? searchResults.map(p => (
               <button key={p.id} onClick={() => openDm(p)}
                 className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38]/10 transition-colors text-left group">
                 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm border border-transparent dark:border-white/5">
                   {p.username[0].toUpperCase()}
                 </div>
                 <div>
                   <p className="text-sm font-bold truncate text-[#191c1e] dark:text-white">{p.username}</p>
                   <p className="text-[11px]">{onlineUserIds.has(p.id) ? <span className="text-[#0056d2] dark:text-[#d3f55b] font-medium">Online</span> : <span className="text-[#191c1e]/40 dark:text-white/40">Offline</span>}</p>
                 </div>
               </button>
             )) : (
               <p className="px-4 py-4 text-sm text-[#191c1e]/50 dark:text-white/50 text-center font-medium">No users found</p>
             )}
           </div>
         )}

         <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 custom-scrollbar">
             <NavItem 
                icon={<Hash className="w-4 h-4" />}
                label="Global Room"
                active={selectedChat === "global"}
                onClick={() => { setSelectedChat("global"); setUnreadCounts(prev => ({ ...prev, global: 0 })); setMobileMenuOpen(false); }}
                unread={unreadCounts.global}
                subtitle="Community chat room"
             />
             {dmUsers.map(u => (
                <NavItem 
                   key={u.id}
                   icon={
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold relative text-[#191c1e] dark:text-white">
                         {u.username[0].toUpperCase()}
                         {onlineUserIds.has(u.id) && <span className="absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] rounded-full border-[2px] border-[#16171b]" />}
                      </div>
                   }
                   label={u.username} 
                   active={selectedChat === u.id}
                   unread={unreadCounts[u.id]}
                   onClick={() => openDm(u)}
                   subtitle={messages[u.id]?.[messages[u.id]?.length - 1]?.content || 'Tap to chat...'}
                />
             ))}
         </div>

         <div className="p-4 border-transparent dark:border-white/5 bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] mt-auto flex items-center gap-3">
             <div onClick={() => setShowSettingsModal(true)} className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] flex items-center justify-center text-sm font-black text-[#191c1e] dark:text-white flex-shrink-0 shadow-[0_8px_16px_rgba(0,86,210,0.15)] dark:shadow-[0_8px_16px_rgba(211,245,91,0.15)] cursor-pointer hover:scale-105 transition-all">
                 {myProfile.username[0].toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-[#191c1e] dark:text-white truncate">{myProfile.username}</p>
                 <p className="text-[11px] text-[#191c1e]/60 dark:text-white/60 flex items-center gap-1.5 font-medium"><Circle className="w-1.5 h-1.5 fill-[#d3f55b] text-[#0056d2] dark:text-[#d3f55b]" /> Online</p>
             </div>
             <button onClick={handleSignOut} title="Sign out" className="p-2.5 rounded-xl bg-[#f2f4f6] dark:bg-[#1a1b22] hover:bg-red-500/10 text-[#191c1e]/50 dark:text-white/50 hover:text-red-400 transition-all border border-transparent dark:border-white/5 hover:border-red-500/30">
                 <LogOut className="w-4 h-4" />
             </button>
         </div>
      </aside>

      {/* 3. Main Chat Area */}
      <main className={`flex-1 flex-col min-w-0 bg-[#f7f9fb] dark:bg-[#0a0a0c] relative z-0 ${mobileMenuOpen ? 'hidden md:flex' : 'flex'}`}>
         <header className="flex h-[60px] md:h-[80px] items-center gap-3 md:gap-4 px-4 md:px-8 shrink-0">
             <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-[#191c1e]/80 dark:text-white/80 hover:text-[#191c1e] dark:text-white">
                <Menu className="w-6 h-6" />
             </button>
             <h2 className="text-[20px] md:text-[25px] font-bold tracking-tight text-[#191c1e] dark:text-white">{chatTitle}</h2>
             <div className="ml-auto flex items-center gap-2 md:gap-3">
                 <div className="relative hidden md:block w-48">
                     <Search className="w-4 h-4 absolute left-4 top-2.5 text-[#191c1e]/40 dark:text-white/40" />
                     <input type="text" placeholder="Search files/messages..." className="w-full bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] border border-transparent dark:border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-[#191c1e] dark:text-white focus:outline-none focus:border-[#d3f55b]/50 shadow-inner" />
                 </div>
                 
                 <button onClick={() => setShowRightPanel(!showRightPanel)} className={`hidden md:block p-2.5 border border-transparent dark:border-white/5 rounded-full transition-colors shadow-sm ml-1 ${showRightPanel ? 'bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-white dark:text-black border-transparent' : 'bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] text-[#191c1e] dark:text-white hover:bg-black/5 dark:hover:bg-white/10'}`}>
                    <UsersIcon className={`w-[18px] h-[18px] ${showRightPanel ? 'text-white dark:text-black' : ''}`} strokeWidth={showRightPanel ? 2.5 : 2} />
                 </button>
                 
                 <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 bg-[#ffffff] dark:bg-[#121318] border border-transparent dark:border-white/5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)]">
                    {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-[#191c1e] dark:text-white" /> : <Moon className="w-[18px] h-[18px] text-[#191c1e] dark:text-white" />}
                 </button>
                 
                 <button onClick={() => showToast("You have 0 new notifications", "global")} className="p-2.5 bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] border border-transparent dark:border-white/5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors shadow-sm"><Bell className="w-[18px] h-[18px] text-[#191c1e] dark:text-white" /></button>
                 
                 <div onClick={() => setShowSettingsModal(true)} className="w-[34px] h-[34px] md:w-[38px] md:h-[38px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[13px] font-bold ml-1 md:ml-2 shadow-sm border border-transparent dark:border-white/5 cursor-pointer overflow-hidden transform transition-transform hover:scale-105 ring-2 ring-transparent hover:ring-[#0056d2] dark:ring-[#d3f55b]/50">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${myProfile.username}`} alt="me" className="w-full h-full object-cover bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38]/10" />
                 </div>
             </div>
         </header>

         {/* Chat Box */}
         <div className="flex-1 bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] md:rounded-[2.5rem] rounded-t-[2rem] md:mx-2 md:mb-2 flex flex-col overflow-hidden shadow-2xl relative border border-transparent dark:border-white/5">
             
             {/* Banner */}
             {selectedChat === 'global' && (
               <div className="h-[220px] shrink-0 relative m-4 rounded-3xl overflow-hidden z-10 shadow-lg border border-transparent dark:border-white/5">
                 <img onClick={() => setLightboxImage("https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2000&auto=format&fit=crop")} src="https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2000&auto=format&fit=crop" className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-700" alt="Banner" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#16171d] via-[#16171d]/20 to-transparent opacity-90 pointer-events-none" />
               </div>
             )}

             {/* Messages */}
             <div className={`flex-1 overflow-y-auto px-6 py-6 pb-2 space-y-1 relative z-10 custom-scrollbar ${selectedChat === 'global' ? '-mt-[100px]' : ''}`}>
                {activeMsgs.length >= 80 && (
                  <div className="flex justify-center mb-6">
                    <button onClick={loadMore} disabled={loadingMore}
                      className="text-xs font-bold px-5 py-2.5 rounded-full border border-transparent dark:border-white/5 bg-[#f2f4f6] dark:bg-[#1a1b22] hover:bg-[#282a33] text-[#191c1e]/60 dark:text-white/60 hover:text-[#191c1e] dark:text-white transition-all shadow-md">
                      {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Load older messages"}
                    </button>
                  </div>
                )}
                {activeMsgs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#191c1e]/30 dark:text-white/30 gap-4">
                    <Sparkles className="w-12 h-12 opacity-40 text-[#0056d2] dark:text-[#d3f55b]" />
                    <p className="text-[15px] font-medium">No messages yet — start the conversation!</p>
                  </div>
                ) : activeMsgs.map((msg, idx) => {
                  const prev = activeMsgs[idx - 1];
                  const prevDate = prev ? new Date(prev.created_at).toDateString() : null;
                  const currDate = new Date(msg.created_at).toDateString();
                  const showDate = prevDate !== currDate;
                  const grouped = prev && prev.user_id === msg.user_id && !showDate;

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-8">
                            <span className="bg-[#f2f4f6] dark:bg-[#1a1b22]/80 border border-transparent dark:border-white/5 backdrop-blur-md text-[#191c1e]/60 dark:text-white/60 text-[10px] font-bold px-4 py-1.5 rounded-full tracking-widest uppercase shadow-sm">
                              {formatDateString(msg.created_at)}
                            </span>
                        </div>
                      )}
                      
                      <div className={`flex gap-3.5 group mt-${grouped ? '1' : '6'} px-4 hover:bg-white/[0.015] py-1.5 -mx-4 rounded-2xl transition-colors`}>
                        <div className="w-10 flex-shrink-0 flex justify-center mt-0.5">
                          {!grouped && (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2a2b30] to-[#121318] flex items-center justify-center text-sm font-bold text-[#191c1e] dark:text-white shadow-sm ring-1 ring-white/10 relative overflow-hidden cursor-pointer" onClick={() => openDm({id: msg.user_id, username: msg.username})}>
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} alt="avatar" className="w-full h-full object-cover hover:scale-110 transition-transform" />
                              </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0 pb-1">
                          {!grouped && (
                            <div className="flex items-baseline gap-2.5 mb-1.5">
                              <span className="font-bold text-[#191c1e] dark:text-white text-[15px] leading-none cursor-pointer hover:underline decoration-white/30" onClick={() => openDm({id: msg.user_id, username: msg.username})}>{msg.username}</span>
                              <span className="text-[11px] text-[#191c1e]/40 dark:text-white/40 font-medium tracking-wide">{formatTime(msg.created_at)}</span>
                            </div>
                          )}
                          
                          <div className={`text-[14px] text-[#191c1e]/80 dark:text-white/80 leading-relaxed max-w-[85%]`}>
                              {msg.file_url && msg.file_type?.startsWith("image/") && (
                                <div onClick={() => setLightboxImage(msg.file_url!)} className="cursor-pointer inline-block">
                                  <img src={msg.file_url} alt={msg.file_name ?? "image"}
                                    className="max-w-[300px] max-h-72 object-cover rounded-2xl border border-transparent dark:border-white/5 shadow-md mb-2 block hover:brightness-110 transition-all" />
                                </div>
                              )}
                              {msg.file_url && !msg.file_type?.startsWith("image/") && (
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-3 px-4 py-3.5 bg-[#f2f4f6] dark:bg-[#1a1b22] border border-transparent dark:border-white/5 rounded-[1rem] hover:bg-[#f2f4f6] dark:bg-[#1a1b22] transition-all mb-2 shadow-sm focus:ring-2 focus:ring-[#0056d2] dark:ring-[#d3f55b]/50">
                                  <div className="p-2.5 bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38]/10 text-[#0056d2] dark:text-[#d3f55b] rounded-[12px]"><FileText className="w-5 h-5 flex-shrink-0" /></div>
                                  <div className="min-w-0 max-w-[200px]">
                                    <span className="text-[13px] font-bold truncate block pr-2 text-[#191c1e] dark:text-white">{msg.file_name ?? "File attachment"}</span>
                                    <span className="text-[11px] text-[#191c1e]/50 dark:text-white/50 font-medium">Click to open</span>
                                  </div>
                                </a>
                              )}
                              {msg.content && (
                                <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                              )}
                          </div>
                        </div>

                        {msg.user_id === myProfile.id && (
                          <div className="flex items-start opacity-0 group-hover:opacity-100 transition-opacity pr-2 pt-1">
                            <button onClick={() => handleDelete(msg)} className="p-2 hover:bg-red-500/10 text-red-400/50 hover:text-red-400 rounded-xl transition-colors border border-transparent dark:border-white/5 hover:border-red-500/20">
                                <Trash2 className="w-[15px] h-[15px]" />
                            </button>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} className="h-2" />
             </div>
             
             {/* Typing Indicator */}
             {typingUsers[selectedChat] && typingUsers[selectedChat].size > 0 && (
                <div className="px-10 py-1 bg-gradient-to-t from-[#16171d] via-[#16171d] to-transparent absolute bottom-[90px] w-full z-10 pointer-events-none">
                  <span className="text-[12px] text-[#0056d2] dark:text-[#d3f55b] font-bold animate-pulse flex items-center gap-1.5 drop-shadow-md">
                    <span className="flex gap-0.5">
                      <span className="w-[5px] h-[5px] bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-[5px] h-[5px] bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-[5px] h-[5px] bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] rounded-full animate-bounce" />
                    </span>
                    <span className="text-[#191c1e]/80 dark:text-white/80 font-medium ml-1">
                      {Array.from(typingUsers[selectedChat]).join(", ")} {typingUsers[selectedChat].size === 1 ? "is" : "are"} typing...
                    </span>
                  </span>
                </div>
             )}

             {/* Input Container */}
             <div className="p-5 z-20 pb-5">
                {attachFile && (
                  <div className="mx-2 mb-3 flex items-center gap-4 bg-[#f2f4f6] dark:bg-[#1a1b22] border border-transparent dark:border-white/5 rounded-2xl px-5 py-3 shadow-lg w-max max-w-[80%]">
                    {attachPreview
                      ? <img onClick={() => setLightboxImage(attachPreview)} src={attachPreview} alt="preview" className="w-[42px] h-[42px] object-cover rounded-[12px] flex-shrink-0 shadow-sm cursor-pointer hover:brightness-110" />
                      : <div className="p-2.5 bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38]/20 text-[#0056d2] dark:text-[#d3f55b] rounded-[12px]"><FileText className="w-5 h-5 flex-shrink-0" /></div>}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-[13px] font-bold text-[#191c1e] dark:text-white truncate">{attachFile.name}</p>
                      <p className="text-[11px] text-[#191c1e]/50 dark:text-white/50 font-medium">{(attachFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={clearAttach} className="text-[#191c1e]/50 dark:text-white/50 hover:text-[#191c1e] dark:text-white p-1.5 hover:bg-white/10 rounded-full transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-1 md:gap-2 bg-[#f2f4f6] dark:bg-[#1a1b22] border border-transparent dark:border-white/5 rounded-full px-2 py-2 shadow-inner transition-all hover:bg-[#e0e3e5] dark:bg-[#18191e] focus-within:ring-1 focus-within:ring-[#0056d2] dark:ring-[#d3f55b]/50 md:mx-2 focus-within:border-[#d3f55b]/30">
                     <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.zip" onChange={handleFileChange} className="hidden" />
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full text-[#191c1e]/50 dark:text-white/50 hover:text-[#0056d2] dark:text-[#d3f55b] hover:bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38]/10 transition-all flex-shrink-0 ml-1">
                        <Paperclip className="w-[18px] h-[18px]" />
                     </button>
                     <input type="text" value={input} 
                        onChange={e => {
                          const val = e.target.value;
                          setInput(val);
                          if (val.trim() && myProfile) {
                            const channel_id = selectedChat;
                            if (!typingTimeoutRef.current[channel_id]) {
                              client.realtime.publish(GLOBAL_CHANNEL, "typing_start", { user_id: myProfile.id, username: myProfile.username, channel_id });
                            }
                            if (typingTimeoutRef.current[channel_id]) clearTimeout(typingTimeoutRef.current[channel_id]);
                            typingTimeoutRef.current[channel_id] = setTimeout(() => {
                              client.realtime.publish(GLOBAL_CHANNEL, "typing_stop", { username: myProfile.username, channel_id });
                              delete typingTimeoutRef.current[channel_id];
                            }, 2000);
                          }
                        }}
                        placeholder="Write a message..." autoComplete="off"
                        className="flex-1 bg-transparent py-2.5 px-2 text-[#191c1e] dark:text-white placeholder-white/30 focus:outline-none text-[14px] font-medium" />
                     
                     <div className="flex items-center gap-1 pr-1">
                       <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-[#191c1e]/50 dark:text-white/50 hover:text-[#191c1e] dark:text-white transition-all rounded-full hover:bg-white/5"><ImageIcon className="w-[18px] h-[18px]" /></button>
                       <button type="submit" disabled={(!input.trim() && !attachFile) || sendLoading}
                         className="bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] hover:opacity-90 disabled:bg-black/5 disabled:dark:bg-white/5 disabled:text-[#191c1e]/30 dark:disabled:text-white/30 text-white dark:text-black w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-[0_4px_12px_rgba(0,86,210,0.2)] dark:shadow-[0_4px_12px_rgba(211,245,91,0.2)] disabled:shadow-none ml-1 transform active:scale-95 disabled:active:scale-100">
                         {sendLoading ? <Loader2 className="w-[18px] h-[18px] animate-spin text-white dark:text-black" strokeWidth={2.5} /> : <Send className="w-[18px] h-[18px] ml-0.5 text-white dark:text-black" strokeWidth={2.5} />}
                       </button>
                     </div>
                </form>
             </div>
         </div>
         
         {toast && (
           <div className="absolute top-24 right-10 z-[60] animate-in fade-in slide-in-from-right-4 duration-300">
             <button onClick={() => { setSelectedChat(toast.channel); setUnreadCounts(prev => ({ ...prev, [toast.channel]: 0 })); setToast(null); }}
               className="bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 hover:brightness-110 transition-all active:scale-95 group font-bold">
               <div className="bg-[#f7f9fb] dark:bg-[#0a0a0c]/10 p-2 rounded-xl">
                 <MessageSquare className="w-[18px] h-[18px]" />
               </div>
               <div className="text-left pr-4">
                 <p className="text-[11px] font-black uppercase tracking-wider opacity-60">Notification</p>
                 <p className="text-[14px] leading-tight">{toast.msg}</p>
               </div>
             </button>
           </div>
         )}
      </main>

      {/* 4. Right Sidebar */}
      {showRightPanel && (
      <aside className="w-[310px] hidden xl:flex flex-col gap-4 py-2 pr-1 flex-shrink-0 h-full relative z-10 animate-in slide-in-from-right-10 duration-300">
         <div className="flex justify-between items-center px-1 pt-1.5 shrink-0">
            <button onClick={() => setActiveCall(activeCall === 'audio' ? null : 'audio')} className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center shadow-[0_6px_20px_rgba(211,245,91,0.25)] hover:scale-105 transition-all ${activeCall === 'audio' ? 'bg-red-500 text-[#191c1e] dark:text-white shadow-red-500/30' : 'bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white'}`}><Phone className={`w-[20px] h-[20px] ${activeCall === 'audio' ? 'rotate-[135deg]' : ''}`} /></button>
            <button onClick={() => setActiveCall(activeCall === 'video' ? null : 'video')} className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all border shadow-md hover:scale-105 ${activeCall === 'video' ? 'bg-red-500 text-[#191c1e] dark:text-white border-red-500 shadow-red-500/30' : 'bg-[#f2f4f6] dark:bg-[#1a1b22] text-[#191c1e]/80 dark:text-white/80 border-transparent dark:border-white/5 hover:bg-white/10 hover:text-[#191c1e] dark:text-white'}`}><Video className="w-[20px] h-[20px]" /></button>
            <button onClick={togglePin} disabled={selectedChat === "global"} className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all border shadow-md active:scale-95 ${pinnedChats.has(selectedChat) ? 'bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white border-[#d3f55b]/50' : 'bg-[#f2f4f6] dark:bg-[#1a1b22] text-[#191c1e]/80 dark:text-white/80 hover:bg-white/10 hover:text-[#191c1e] dark:text-white border-transparent dark:border-white/5 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Pin className="w-[20px] h-[20px]" /></button>
            <button onClick={() => setShowRightPanel(false)} className="w-[52px] h-[52px] rounded-2xl bg-[#f2f4f6] dark:bg-[#1a1b22] text-[#0056d2] dark:text-[#d3f55b] flex items-center justify-center hover:bg-white/10 transition-all border border-[#d3f55b]/50 shadow-md ring-1 ring-[#0056d2] dark:ring-[#d3f55b]/20 active:scale-95"><UsersIcon className="w-[20px] h-[20px]" /></button>
         </div>
         
         <div className="bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] rounded-3xl p-6 border border-transparent dark:border-white/5 flex-1 overflow-y-auto mt-2 custom-scrollbar shadow-lg">
            <h3 className="text-[#191c1e] dark:text-white font-bold text-[17px] mb-5 tracking-tight flex items-center justify-between">
               Members
               <span className="text-[11px] text-[#191c1e]/50 dark:text-white/50 bg-white/5 px-2 py-0.5 rounded-full font-medium">{onlineUserIds.size + 1} online</span>
            </h3>
            <div className="space-y-4">
               {/* admin */}
               <div className="flex items-center gap-3.5 group cursor-pointer" onClick={() => showToast("Cannot DM Admin right now", "global")}>
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1b22] to-[#0a0a0c] flex items-center justify-center text-xs font-bold text-[#191c1e] dark:text-white relative border border-transparent dark:border-white/5 group-hover:border-[#d3f55b]/50 transition-colors">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" className="w-full h-full p-1 group-hover:scale-110 transition-transform" alt="admin" />
                      <span className="absolute -bottom-[2px] -right-[2px] w-[12px] h-[12px] bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] rounded-full border-[2.5px] border-[#121318]" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[#191c1e] dark:text-white group-hover:text-[#191c1e] dark:text-white transition-colors">Richard Wilson</span>
                      <span className="text-[11px] text-[#191c1e]/50 dark:text-white/50 font-medium">Head of Design</span>
                   </div>
                   <span className="text-[9px] font-black text-[#191c1e] dark:text-white bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] ml-auto px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm group-hover:scale-110 transition-transform">Admin</span>
               </div>
               
               {/* Map online users visually */}
               {Array.from(onlineUserIds).length > 0 ? Array.from(onlineUserIds).map(uid => {
                  const prof = uid === myProfile.id ? myProfile : dmUsers.find(d => d.id === uid) || { username: 'User' };
                  return (
                     <div key={uid} className="flex items-center gap-3.5 group cursor-pointer" onClick={() => uid !== myProfile.id ? openDm({id: uid, username: prof.username}) : showToast("This is you!", "global")}>
                         <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1b22] to-[#0a0a0c] flex items-center justify-center text-xs font-bold text-[#191c1e] dark:text-white relative border border-transparent dark:border-white/5 group-hover:border-[#d3f55b]/50 transition-colors overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${prof.username}`} className="w-full h-full scale-110 group-hover:scale-125 transition-transform" alt="avatar" />
                            <span className="absolute -bottom-[2px] -right-[2px] w-[12px] h-[12px] bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] rounded-full border-[2.5px] border-[#121318]" />
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[14px] font-bold text-[#191c1e] dark:text-white group-hover:underline">{prof.username} {uid === myProfile.id && <span className="text-[#191c1e]/40 dark:text-white/40 font-medium ml-1 no-underline">(You)</span>}</span>
                           <span className="text-[11px] text-[#191c1e]/50 dark:text-white/50 font-medium text-ellipsis overflow-hidden whitespace-nowrap max-w-[120px]">
                              {messages[uid]?.[messages[uid].length-1]?.content || 'Online now'}
                           </span>
                         </div>
                     </div>
                  )
               }) : (
                 <div className="flex items-center gap-3.5 group cursor-pointer" onClick={() => showToast("This is you!", "global")}>
                     <div className="w-10 h-10 rounded-full bg-[#f2f4f6] dark:bg-[#1a1b22] flex items-center justify-center text-xs font-bold text-[#191c1e] dark:text-white relative border border-transparent dark:border-white/5">
                        {myProfile.username[0].toUpperCase()}
                        <span className="absolute -bottom-[2px] -right-[2px] w-[12px] h-[12px] bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] rounded-full border-[2.5px] border-[#121318]" />
                     </div>
                     <span className="text-[14px] font-bold text-[#191c1e] dark:text-white">{myProfile.username} <span className="text-[#191c1e]/40 dark:text-white/40 font-medium ml-1">(You)</span></span>
                 </div>
               )}
               {/* Some mocked offline users for styling */}
               <div className="flex items-center gap-3.5 group cursor-pointer opacity-50 hover:opacity-100 transition-opacity" onClick={() => showToast("User is offline. Cannot message right now.", "global")}>
                   <div className="w-10 h-10 rounded-full bg-[#f2f4f6] dark:bg-[#1a1b22] flex items-center justify-center text-xs font-bold text-[#191c1e] dark:text-white relative border border-transparent dark:border-white/5 overflow-hidden">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" className="w-full h-full scale-110" alt="sarah" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[#191c1e] dark:text-white">Sarah Parker</span>
                      <span className="text-[11px] text-[#191c1e]/50 dark:text-white/50 font-medium">Offline</span>
                   </div>
               </div>
            </div>
         </div>
         
         <div className="bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] rounded-3xl p-6 border border-transparent dark:border-white/5 shrink-0 shadow-lg">
            <h3 className="text-[#191c1e] dark:text-white font-bold text-[17px] mb-4 tracking-tight flex justify-between items-center group cursor-pointer" onClick={() => showToast("Opening Files Explorer", "global")}>
              Files 
              <ChevronRight className="w-4 h-4 text-[#191c1e]/40 dark:text-white/40 group-hover:translate-x-1 group-hover:text-[#0056d2] dark:text-[#d3f55b] transition-all" />
            </h3>
            <div onClick={() => showToast("Loading gallery...", "global")} className="flex items-center gap-2 cursor-pointer hover:bg-[#f2f4f6] dark:bg-[#1a1b22] p-2 -mx-2 rounded-xl transition-colors text-[#191c1e]/80 dark:text-white/80 font-medium text-[13px] mb-3 group">
               <div className="p-2 bg-[#f2f4f6] dark:bg-[#1a1b22] group-hover:bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] group-hover:text-[black] rounded-[10px] transition-colors"><ImageIcon className="w-4 h-4 text-[#191c1e]/80 dark:text-white/80 group-hover:text-black" /></div>
               <span className="flex-1 text-[#191c1e] dark:text-white">115 photos</span>
               <ChevronRight className="w-4 h-4 text-[#191c1e]/40 dark:text-white/40" />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
               <div onClick={() => setLightboxImage("https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2000&auto=format&fit=crop")} className="h-20 bg-[#f2f4f6] dark:bg-[#1a1b22] rounded-2xl overflow-hidden shrink-0 border border-transparent dark:border-white/5 cursor-zoom-in hover:border-[#d3f55b]/50 transition-all"><img src="https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=300&auto=format&fit=crop" className="w-full h-full object-cover hover:scale-110 transition-transform" alt="file" /></div>
               <div onClick={() => setLightboxImage("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop")} className="h-20 bg-[#f2f4f6] dark:bg-[#1a1b22] rounded-2xl overflow-hidden shrink-0 border border-transparent dark:border-white/5 cursor-zoom-in hover:border-[#d3f55b]/50 transition-all"><img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=300&auto=format&fit=crop" className="w-full h-full object-cover hover:scale-110 transition-transform" alt="file" /></div>
            </div>
            
            <div className="h-px bg-white/5 my-4" />
            
            <div onClick={() => showToast("Loading documents...", "global")} className="flex items-center gap-2 cursor-pointer hover:bg-[#f2f4f6] dark:bg-[#1a1b22] p-2 -mx-2 rounded-xl transition-colors text-[#191c1e]/80 dark:text-white/80 font-medium text-[13px] group">
               <div className="p-2 bg-[#f2f4f6] dark:bg-[#1a1b22] group-hover:bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] group-hover:text-black rounded-[10px] transition-colors"><FileText className="w-4 h-4 text-[#191c1e]/80 dark:text-white/80 group-hover:text-black" /></div>
               <span className="flex-1 text-[#191c1e] dark:text-white">208 files</span>
               <ChevronRight className="w-4 h-4 text-[#191c1e]/40 dark:text-white/40" />
            </div>
         </div>
      </aside>
      )}

      {/* Global Overlays & Modals */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxImage(null)}>
            <img src={lightboxImage} alt="Fullscreen" className="max-w-[90vw] max-h-[90vh] rounded-3xl border border-transparent dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] object-contain" onClick={e => e.stopPropagation()} />
            <button className="absolute top-8 right-8 p-3 bg-white/10 rounded-full hover:bg-white/20 hover:scale-110 transition-all text-[#191c1e] dark:text-white backdrop-blur-lg"><X className="w-6 h-6" /></button>
        </div>
      )}

      {activeCall && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[80] bg-[#f2f4f6] dark:bg-[#1a1b22]/90 backdrop-blur-xl border border-[#d3f55b]/30 pl-4 pr-6 py-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-6 animate-in slide-in-from-top-10 duration-500">
            <div className="flex -space-x-3 items-center">
                <div className="w-[50px] h-[50px] rounded-full border-4 border-[#1a1b22] overflow-hidden bg-gray-800 z-20"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${myProfile.username}`} className="w-full h-full object-cover scale-110" /></div>
                <div className="w-[50px] h-[50px] rounded-full border-4 border-[#1a1b22] overflow-hidden bg-gray-800 z-10"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Admin`} className="w-full h-full object-cover scale-110 p-1" /></div>
            </div>
            <div>
               <p className="text-[#191c1e] dark:text-white font-bold text-[15px]">{activeCall === 'video' ? 'Video' : 'Audio'} Call in progress</p>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] animate-pulse" />
                  <p className="text-[#0056d2] dark:text-[#d3f55b]/80 text-[13px] font-mono font-bold tracking-widest">00:12</p>
               </div>
            </div>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <button onClick={() => setActiveCall(null)} className="w-[45px] h-[45px] rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-[#191c1e] dark:text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-transform hover:scale-110 transform">
               <Phone className="w-[20px] h-[20px] rotate-[135deg]" />
            </button>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#ffffff] dark:bg-[#121318] shadow-[0_24px_40px_rgba(25,28,30,0.04)] dark:shadow-[0_24px_40px_rgba(0,0,0,0.4)] border border-transparent dark:border-white/5 rounded-3xl w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
               <div className="p-6 border-transparent dark:border-white/5 flex justify-between items-center">
                  <h3 className="font-bold text-xl text-[#191c1e] dark:text-white">Settings</h3>
                  <button onClick={() => setShowSettingsModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5 text-[#191c1e]/60 dark:text-white/60" /></button>
               </div>
               <div className="p-8 pb-10 flex flex-col items-center gap-4 text-center">
                  <Settings className="w-16 h-16 text-[#0056d2] dark:text-[#d3f55b]/50 animate-spin-slow mb-2" style={{ animationDuration: '4s' }} />
                  <p className="text-lg font-bold text-[#191c1e] dark:text-white">Full Settings Dashboard</p>
                  <p className="text-[#191c1e]/50 dark:text-white/50 text-sm">Theme customization, notification preferences, and account management are coming in v2.0!</p>
                  <button onClick={() => setShowSettingsModal(false)} className="mt-4 bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] hover:bg-[#c6ef38] text-[#191c1e] dark:text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95">Got it</button>
               </div>
            </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(25,28,30,0.1); border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(25,28,30,0.2); }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-[11px] font-black text-[#191c1e]/60 dark:text-white/60 mb-1.5 ml-1 block uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
        className="w-full px-4 py-3.5 bg-[#e0e3e5] dark:bg-[#18191e] border border-transparent dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0056d2] dark:ring-[#d3f55b]/50 text-[#191c1e] dark:text-white placeholder-white/30 text-sm shadow-inner transition-all hover:bg-[#1c1d22]" />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-sm font-medium">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><p>{msg}</p>
    </div>
  );
}

function AuthBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] hover:bg-[#c6ef38] text-[#191c1e] dark:text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center shadow-[0_0_20px_rgba(211,245,91,0.2)] hover:shadow-[0_0_25px_rgba(211,245,91,0.3)] disabled:opacity-50 text-[15px] transform active:scale-[0.98]">
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
    </button>
  );
}

function Divider() {
  return (
    <div className="relative flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-white/5" /><span className="text-[#191c1e]/40 dark:text-white/40 text-[11px] font-bold uppercase tracking-wider">or</span><div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function NavItem({ icon, label, active, unread, onClick, subtitle }: { icon: React.ReactNode; label: string; active: boolean; unread?: number; onClick: () => void; subtitle?: string }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl transition-all text-left group ${active ? 'bg-[#f2f4f6] dark:bg-[#1a1b22] shadow-sm' : 'hover:bg-[#f2f4f6] dark:bg-[#1a1b22]/50 border border-transparent dark:border-white/5'}`}>
       <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${active ? 'bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white shadow-[0_8px_16px_rgba(0,86,210,0.15)] dark:shadow-[0_8px_16px_rgba(211,245,91,0.15)]' : 'bg-[#f2f4f6] dark:bg-[#1a1b22] border border-transparent dark:border-white/5 text-[#191c1e]/80 dark:text-white/80 group-hover:bg-[#e0e3e5] dark:bg-[#18191e] group-hover:text-[#191c1e] dark:text-white group-hover:shadow-sm'}`}>
          {icon}
       </div>
       <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className={`text-[14px] font-bold truncate ${active ? 'text-[#191c1e] dark:text-white' : 'text-[#191c1e]/80 dark:text-white/80'}`}>{label}</p>
          <p className="text-[11px] font-medium text-[#191c1e]/50 dark:text-white/50 truncate mt-0.5">{subtitle || 'Tap to chat...'}</p>
       </div>
       {unread ? (
         <span className="bg-gradient-to-br from-[#0040a1] to-[#0056d2] dark:from-[#d3f55b] dark:to-[#c6ef38] text-[#191c1e] dark:text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[22px] text-center shadow-md group-hover:scale-110 transition-transform">
           {unread > 9 ? "9+" : unread}
         </span>
       ) : null}
    </button>
  );
}
