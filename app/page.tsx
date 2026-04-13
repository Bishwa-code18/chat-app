"use client";

import { useEffect, useState, useRef } from "react";
import { client } from "@/utils/insforge";
import {
  Send, LogOut, Loader2, Sparkles, AlertCircle,
  Hash, Search, X, MessageSquare, Circle,
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

  // ── Users ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [dmUsers, setDmUsers] = useState<Profile[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // ── Connection status (visible to user) ───────────────────────────────────
  const [connStatus, setConnStatus] = useState<"connecting" | "connected" | "error">("connecting");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myProfileRef = useRef<Profile | null>(null);
  const realtimeStarted = useRef(false);

  useEffect(() => { myProfileRef.current = myProfile; }, [myProfile]);

  // ── Scroll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat]);

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
      if (data) setMyProfile(data as Profile);
    });
  }, [user]);

  // ── Realtime setup — ONE channel, client-side filtering ───────────────────
  useEffect(() => {
    if (!myProfile || realtimeStarted.current) return;
    realtimeStarted.current = true;

    const start = async () => {
      // Handle connection events
      client.realtime.on("connect", () => setConnStatus("connected"));
      client.realtime.on("connect_error", () => setConnStatus("error"));
      client.realtime.on("disconnect", () => setConnStatus("connecting"));
      client.realtime.on("error", ({ code, message }: any) => console.warn("RT error", code, message));

      await client.realtime.connect();
      setConnStatus("connected");

      // ── Subscribe to the ONE global channel ──────────────────────────────
      const subResult = await client.realtime.subscribe(GLOBAL_CHANNEL);
      if (!subResult.ok) {
        console.error("Failed to subscribe to chat_room:", subResult.error);
        setConnStatus("error");
        return;
      }
      console.log("✅ Subscribed to chat_room");

      // ── Global messages ──────────────────────────────────────────────────
      client.realtime.on("new_global_message", (payload: any) => {
        const msg = payload as Message;
        if (!msg?.id) return;
        setMessages(prev => {
          if ((prev.global ?? []).find(m => m.id === msg.id)) return prev;
          return { ...prev, global: [...(prev.global ?? []), msg] };
        });
      });

      // ── DM messages — filtered client-side ───────────────────────────────
      client.realtime.on("new_dm_message", (payload: any) => {
        const msg = payload as Message;
        if (!msg?.id) return;
        const me = myProfileRef.current;
        if (!me) return;

        // Only process if I'm sender or recipient
        const amSender = msg.user_id === me.id;
        const amRecipient = msg.recipient_id === me.id;
        if (!amSender && !amRecipient) return;

        // The chat key is the OTHER person's ID
        const otherPersonId = amSender ? (msg.recipient_id ?? "") : msg.user_id;
        if (!otherPersonId) return;

        // Auto-add sender to DM list if I'm the recipient
        if (amRecipient) {
          const senderProfile: Profile = { id: msg.user_id, username: msg.username };
          setDmUsers(prev => prev.find(u => u.id === msg.user_id) ? prev : [...prev, senderProfile]);
        }

        setMessages(prev => {
          if ((prev[otherPersonId] ?? []).find(m => m.id === msg.id)) return prev;
          return { ...prev, [otherPersonId]: [...(prev[otherPersonId] ?? []), msg] };
        });
      });

      // ── Presence ─────────────────────────────────────────────────────────
      client.realtime.on("user_online", (payload: any) => {
        if (payload?.user_id) setOnlineUserIds(prev => new Set(prev).add(payload.user_id));
      });
      client.realtime.on("user_offline", (payload: any) => {
        if (payload?.user_id) setOnlineUserIds(prev => { const s = new Set(prev); s.delete(payload.user_id); return s; });
      });

      // Announce self as online
      await client.realtime.publish(GLOBAL_CHANNEL, "user_online", {
        user_id: myProfile.id,
        username: myProfile.username,
      });

      // Load global history
      const { data: hist } = await client.database
        .from("messages")
        .select("*")
        .eq("channel", "global")
        .order("created_at", { ascending: true })
        .limit(80);
      if (hist) setMessages(prev => ({ ...prev, global: hist as Message[] }));
    };

    start().catch(err => { console.error("Realtime start failed:", err); setConnStatus("error"); });

    return () => {
      const me = myProfileRef.current;
      if (me) client.realtime.publish(GLOBAL_CHANNEL, "user_offline", { user_id: me.id }).catch(() => {});
      client.realtime.disconnect();
      realtimeStarted.current = false;
    };
  }, [myProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open DM ───────────────────────────────────────────────────────────────
  const openDm = async (profile: Profile) => {
    setSelectedChat(profile.id);
    setDmUsers(prev => prev.find(u => u.id === profile.id) ? prev : [...prev, profile]);
    setSearchQuery("");
    setSearchResults([]);

    // Load DM history if not already loaded
    if (!messages[profile.id]) {
      const me = myProfileRef.current;
      if (!me) return;
      // History: messages where (user_id=me AND recipient_id=them) OR (user_id=them AND recipient_id=me)
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

  // ── Search ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await client.database.from("profiles").select("id, username")
        .ilike("username", `%${searchQuery.trim()}%`).limit(8);
      setSearchResults(((data as Profile[] | null) ?? []).filter(p => p.id !== myProfile?.id));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery, myProfile]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const me = myProfileRef.current;
    if (!input.trim() || !me || sendLoading) return;
    setSendLoading(true);

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();

    if (selectedChat === "global") {
      const msg: Message = {
        id: msgId, user_id: me.id, username: me.username,
        content: input.trim(), created_at: now, channel: "global", recipient_id: null,
      };
      setInput("");
      setMessages(prev => ({ ...prev, global: [...(prev.global ?? []), msg] }));
      await client.database.from("messages").insert([msg]);
      await client.realtime.publish(GLOBAL_CHANNEL, "new_global_message", msg);
    } else {
      const recipientId = selectedChat;
      const msg: Message = {
        id: msgId, user_id: me.id, username: me.username,
        content: input.trim(), created_at: now, channel: "dm", recipient_id: recipientId,
      };
      setInput("");
      // Optimistic add
      setMessages(prev => ({ ...prev, [recipientId]: [...(prev[recipientId] ?? []), msg] }));
      // Persist
      await client.database.from("messages").insert([msg]);
      // Broadcast on global channel — all clients filter client-side
      await client.realtime.publish(GLOBAL_CHANNEL, "new_dm_message", msg);
    }

    setSendLoading(false);
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
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
    if (error || !data?.user) { setAuthError("Guest login failed — please sign up manually."); setAuthLoading(false); return; }
    await client.database.from("profiles").insert([{ id: data.user.id, username: gUname }]);
    setUser({ id: data.user.id, email: data.user.email });
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    const me = myProfileRef.current;
    if (me) await client.realtime.publish(GLOBAL_CHANNEL, "user_offline", { user_id: me.id }).catch(() => {});
    await client.auth.signOut();
    client.realtime.disconnect();
    realtimeStarted.current = false;
    setUser(null); setMyProfile(null); setMessages({ global: [] });
    setDmUsers([]); setOnlineUserIds(new Set()); setConnStatus("connecting");
  };

  // ─── Auth Screen ──────────────────────────────────────────────────────────
  if (!user || !myProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508] p-4 font-sans text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-indigo-700/20 blur-[140px] rounded-full" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-purple-700/20 blur-[140px] rounded-full" />
        </div>
        <div className="w-full max-w-md z-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">InsForge Chat</h1>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {!verifyStep && (
              <div className="flex bg-black/30 rounded-xl p-1 mb-6">
                {(["signin", "signup"] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => { setAuthMode(mode); setAuthError(""); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === mode ? "bg-indigo-600 text-white shadow-md" : "text-white/50 hover:text-white"}`}>
                    {mode === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>
            )}
            {verifyStep ? (
              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <p className="text-white/70 text-sm text-center">Enter the 6-digit code sent to <strong>{email}</strong></p>
                <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white text-center text-2xl tracking-widest" />
                {authError && <ErrorBox msg={authError} />}
                <AuthBtn loading={authLoading} label="Verify Email" />
              </form>
            ) : authMode === "signin" ? (
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
                {authError && <ErrorBox msg={authError} />}
                <AuthBtn loading={authLoading} label="Sign In" />
                <Divider />
                <button type="button" onClick={handleGuestLogin} disabled={authLoading}
                  className="w-full border border-dashed border-white/20 hover:bg-white/5 text-white/50 hover:text-white py-3 rounded-xl font-medium transition-all">
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Continue as Guest"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
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

  // ─── Chat Screen ──────────────────────────────────────────────────────────
  const activeMsgs = messages[selectedChat] ?? [];
  const selectedDmUser = dmUsers.find(u => u.id === selectedChat);
  const chatTitle = selectedChat === "global" ? "# Global Room" : `@ ${selectedDmUser?.username ?? "Direct Message"}`;

  return (
    <div className="flex h-screen bg-[#050508] text-white font-sans overflow-hidden">

      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 bg-white/[0.02] border-r border-white/5 flex flex-col">
        {/* Logo + status */}
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-1.5 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base flex-1">InsForge Chat</span>
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${connStatus === "connected" ? "bg-emerald-500/20 text-emerald-400" : connStatus === "error" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400 animate-pulse"}`}>
            {connStatus === "connected" ? "Live" : connStatus === "error" ? "Error" : "…"}
          </span>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5 relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-white/30" />
            <input type="text" placeholder="Search username…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute right-3 top-3 text-white/30 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="absolute left-4 right-4 top-[calc(100%-0.5rem)] bg-[#0f101a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {searchResults.length > 0 ? searchResults.map(p => (
                <button key={p.id} onClick={() => openDm(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-500/20 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-700 to-purple-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {p.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.username}</p>
                    <p className="text-xs">{onlineUserIds.has(p.id) ? <span className="text-emerald-400">● Online</span> : <span className="text-white/30">Offline</span>}</p>
                  </div>
                  <span className="ml-auto text-xs text-indigo-400 flex-shrink-0">Message →</span>
                </button>
              )) : (
                <p className="px-4 py-3 text-sm text-white/40">No users found for "{searchQuery}"</p>
              )}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-2">Channels</p>
          <NavItem icon={<Hash className="w-4 h-4" />} label="Global Room" active={selectedChat === "global"} onClick={() => setSelectedChat("global")} />

          {dmUsers.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mt-5 mb-2">Direct Messages</p>
              {dmUsers.map(u => (
                <NavItem key={u.id}
                  icon={
                    <div className="relative">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-[10px] font-bold">
                        {u.username[0].toUpperCase()}
                      </div>
                      {onlineUserIds.has(u.id) && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-[#050508]" />}
                    </div>
                  }
                  label={u.username} active={selectedChat === u.id} onClick={() => openDm(u)}
                />
              ))}
            </>
          )}
        </nav>

        {/* Self */}
        <div className="p-4 border-t border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {myProfile.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{myProfile.username}</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1"><Circle className="w-2 h-2 fill-current" />Online</p>
          </div>
          <button onClick={handleSignOut} title="Sign out" className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-700/10 blur-[120px] rounded-full" />
        </div>

        <header className="px-6 py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl z-10 flex items-center gap-3">
          {selectedChat === "global" ? <Hash className="w-5 h-5 text-indigo-400" /> : <MessageSquare className="w-5 h-5 text-purple-400" />}
          <h2 className="font-bold text-lg">{chatTitle}</h2>
          {selectedChat !== "global" && (
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${onlineUserIds.has(selectedChat) ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"}`}>
              {onlineUserIds.has(selectedChat) ? "Online" : "Offline"}
            </span>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1 z-10 custom-scrollbar">
          {activeMsgs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/20 gap-3">
              <Sparkles className="w-10 h-10 opacity-40" />
              <p className="text-base">No messages yet — say hello!</p>
            </div>
          ) : activeMsgs.map((msg, idx) => {
            const isMe = msg.user_id === myProfile.id;
            const prev = activeMsgs[idx - 1];
            const grouped = prev && prev.user_id === msg.user_id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-5"}`}>
                {!isMe && (
                  <div className="w-8 mr-2 flex-shrink-0 self-end">
                    {!grouped && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-bold">
                        {msg.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                )}
                <div className="max-w-[70%]">
                  {!isMe && !grouped && <p className="text-xs text-white/40 mb-1 ml-0.5">{msg.username}</p>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${isMe
                    ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-tr-sm shadow-lg shadow-indigo-500/20"
                    : "bg-white/8 border border-white/8 text-white/90 rounded-tl-sm"}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 md:p-6 z-10">
          <form onSubmit={handleSend}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 max-w-4xl mx-auto focus-within:border-indigo-500/50 transition-all shadow-xl">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder={selectedChat === "global" ? "Message the room…" : `Message @${selectedDmUser?.username ?? "…"}`}
              className="flex-1 bg-transparent py-2 text-white placeholder-white/30 focus:outline-none text-sm" autoComplete="off" />
            <button type="submit" disabled={!input.trim() || sendLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white p-2.5 rounded-xl transition-all flex-shrink-0">
              {sendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 9999px; }
        .bg-white\/8 { background-color: rgba(255,255,255,0.08); }
        .border-white\/8 { border-color: rgba(255,255,255,0.08); }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-white/50 mb-1 ml-0.5 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
        className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-white/30 text-sm" />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-sm">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><p>{msg}</p>
    </div>
  );
}

function AuthBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3 rounded-xl font-semibold transition-all flex items-center justify-center shadow-lg shadow-indigo-500/25">
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
    </button>
  );
}

function Divider() {
  return (
    <div className="relative flex items-center gap-2">
      <div className="flex-1 h-px bg-white/10" /><span className="text-white/30 text-xs">or</span><div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${active ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300" : "text-white/60 hover:bg-white/5 hover:text-white border border-transparent"}`}>
      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">{icon}</span>
      <span className="text-sm font-medium truncate">{label}</span>
    </button>
  );
}
