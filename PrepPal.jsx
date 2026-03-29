import { useState, useEffect, useRef, useCallback } from "react";

function ask(sys, text, maxT) {
  return Promise.race([
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxT || 1024,
        system: sys,
        messages: [{ role: "user", content: text }]
      })
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.error) throw new Error(d.error.message);
      var out = "";
      for (var i = 0; i < (d.content || []).length; i++) {
        if (d.content[i].type === "text") out += d.content[i].text;
      }
      return out || "No response.";
    }),
    new Promise(function(_, rej) { setTimeout(function() { rej(new Error("timeout")); }, 25000); })
  ]);
}

var PRICE = "$4.99/mo";
var STRIPE = "https://buy.stripe.com/aFadR82Ne1Lp9fCdbA9R604";
var PRO = ["himc798@gmail.com"];
var TABS = ["⚡ Flash", "🎯 Quiz", "✍️ Summary", "📚 HW Help", "🎨 Poster", "⏱ Focus"];
var TN = function() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };

var SMART_SYS = "You are PrepPal, an elite AI study assistant. You are incredibly smart, thorough, and helpful — like the best tutor a student could ever have. You explain things clearly with real examples, show all your work for math, use step-by-step breakdowns, and give detailed educational content. Never give vague or placeholder answers. Always provide REAL, specific, factual information. Be encouraging but direct.";

var LT = { bg: "#fdfcfb", card: "#fff", bdr: "#e8e3dc", tx: "#1a1a2e", tx2: "#636e72", tx3: "#b2bec3", ac: "#9b7dff", ac2: "#7c5ce0", abg: "#f0ebff", ibg: "#fdfcfb", cbg: "#f5f0ea", ub: "#9b7dff", ut: "#fff", ab: "#fff", at: "#1a1a2e" };
var DK = { bg: "#0f0e17", card: "#1e1d2f", bdr: "#2a2945", tx: "#e8e6f0", tx2: "#9896a8", tx3: "#5c5a6e", ac: "#9b7dff", ac2: "#7c5ce0", abg: "rgba(155,125,255,.12)", ibg: "#1a1932", cbg: "#151425", ub: "#9b7dff", ut: "#fff", ab: "#1e1d2f", at: "#e8e6f0" };

function Dots({ t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: t.ab, border: "1px solid " + t.bdr, borderRadius: "16px 16px 16px 4px", maxWidth: "80%", alignSelf: "flex-start" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.ac, animation: "dp 1.4s ease 0s infinite" }} />
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.ac, animation: "dp 1.4s ease .2s infinite" }} />
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.ac, animation: "dp 1.4s ease .4s infinite" }} />
      <span style={{ fontSize: 13, color: t.tx2, marginLeft: 4 }}>Thinking...</span>
    </div>
  );
}

function Msg({ m, t }) {
  var u = m.role === "user";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: u ? "flex-end" : "flex-start" }}>
      {m.time && <span style={{ fontSize: 10, color: t.tx3, marginBottom: 2 }}>{m.time}</span>}
      <div style={{ padding: "12px 16px", maxWidth: "88%", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", wordWrap: "break-word", borderRadius: u ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: u ? t.ub : t.ab, color: u ? t.ut : t.at, border: u ? "none" : "1px solid " + t.bdr }}>
        {m.text}
      </div>
    </div>
  );
}

function ChatArea({ msgs, ld, t }) {
  var end = useRef(null);
  useEffect(function() { if (end.current) end.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, ld]);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, background: t.cbg }}>
      {msgs.map(function(m, i) { return <Msg key={i} m={m} t={t} />; })}
      {ld && <Dots t={t} />}
      <div ref={end} />
    </div>
  );
}

function InputBar({ onSend, ld, ph, t }) {
  var ref = useState(""), v = ref[0], setV = ref[1];
  var go = function() { if (v.trim() && !ld) { onSend(v.trim()); setV(""); } };
  return (
    <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid " + t.bdr, background: t.bg }}>
      <input value={v} onChange={function(e) { setV(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") go(); }} placeholder={ph || "Type a message..."} style={{ flex: 1, padding: "12px 14px", border: "1.5px solid " + t.bdr, borderRadius: 12, fontSize: 14, fontFamily: "inherit", color: t.tx, background: t.ibg }} />
      <button onClick={go} disabled={ld || !v.trim()} style={{ padding: "12px 20px", background: "linear-gradient(135deg," + t.ac + "," + t.ac2 + ")", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", opacity: (ld || !v.trim()) ? 0.5 : 1, cursor: "pointer" }}>
        {ld ? "..." : "Send"}
      </button>
    </div>
  );
}

function ChatTab({ gate, t, greeting, sysExtra, ph }) {
  var ref = useState([{ role: "ai", text: greeting, time: TN() }]), msgs = ref[0], setMsgs = ref[1];
  var ref2 = useState(false), ld = ref2[0], setLd = ref2[1];
  var send = async function(text) {
    setMsgs(function(p) { return p.concat([{ role: "user", text: text, time: TN() }]); });
    if (!(await gate())) return;
    setLd(true);
    try {
      var result = await ask(SMART_SYS + "\n\n" + (sysExtra || ""), text, 2048);
      setMsgs(function(p) { return p.concat([{ role: "ai", text: result, time: TN() }]); });
    } catch(e) {
      var errMsg = e && e.message ? e.message : "Unknown error";
      setMsgs(function(p) { return p.concat([{ role: "ai", text: "Error: " + errMsg + " — try again! 🔄", time: TN() }]); });
    }
    setLd(false);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <ChatArea msgs={msgs} ld={ld} t={t} />
      <InputBar onSend={send} ld={ld} ph={ph} t={t} />
    </div>
  );
}

function TimerTab({ t }) {
  var ref = useState(25), m = ref[0], setM = ref[1];
  var ref2 = useState(0), s = ref2[0], setS = ref2[1];
  var ref3 = useState(false), run = ref3[0], setRun = ref3[1];
  var ref4 = useState("focus"), mode = ref4[0], setMode = ref4[1];
  var iv = useRef();
  var rst = function(md) { clearInterval(iv.current); setRun(false); setMode(md); setM(md === "focus" ? 25 : md === "short" ? 5 : 15); setS(0); };
  useEffect(function() {
    if (!run) return;
    iv.current = setInterval(function() {
      setS(function(s) {
        if (s === 0) { setM(function(m) { if (m === 0) { clearInterval(iv.current); setRun(false); return 0; } return m - 1; }); return 59; }
        return s - 1;
      });
    }, 1000);
    return function() { clearInterval(iv.current); };
  }, [run]);
  var tot = mode === "focus" ? 1500 : mode === "short" ? 300 : 900;
  var pct = (tot - (m * 60 + s)) / tot;
  var cv = 2 * Math.PI * 88;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 32 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[["focus", "🎯 Focus"], ["short", "☕ Break"], ["long", "🌿 Long"]].map(function(arr) {
          return <button key={arr[0]} onClick={function() { rst(arr[0]); }} style={{ padding: "8px 16px", border: "1.5px solid " + (mode === arr[0] ? t.ac : t.bdr), borderRadius: 20, background: mode === arr[0] ? t.abg : "transparent", color: mode === arr[0] ? t.ac : t.tx2, fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: mode === arr[0] ? 700 : 500 }}>{arr[1]}</button>;
        })}
      </div>
      <div style={{ position: "relative", width: 210, height: 210 }}>
        <svg width="210" height="210" viewBox="0 0 210 210">
          <circle cx="105" cy="105" r="88" fill="none" stroke={t.bdr} strokeWidth="6" />
          <circle cx="105" cy="105" r="88" fill="none" stroke={t.ac} strokeWidth="6" strokeLinecap="round" strokeDasharray={cv} strokeDashoffset={cv * (1 - pct)} transform="rotate(-90 105 105)" style={{ transition: "stroke-dashoffset .5s" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 44, fontWeight: 600, color: t.tx }}>{String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0")}</span>
          <span style={{ fontSize: 11, color: t.tx3 }}>{mode === "focus" ? "stay focused" : "relax"}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={function() { setRun(!run); }} style={{ padding: "12px 24px", background: "linear-gradient(135deg," + t.ac + "," + t.ac2 + ")", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>{run ? "⏸ Pause" : "▶ Start"}</button>
        <button onClick={function() { rst(mode); }} style={{ padding: "12px 24px", background: "transparent", border: "1.5px solid " + t.bdr, borderRadius: 12, color: t.tx2, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>↺ Reset</button>
      </div>
    </div>
  );
}

function Auth({ onEnter, t }) {
  var ref = useState("login"), mode = ref[0], setMode = ref[1];
  var ref2 = useState(""), nm = ref2[0], setNm = ref2[1];
  var ref3 = useState(""), em = ref3[0], setEm = ref3[1];
  var ref4 = useState(""), pw = ref4[0], setPw = ref4[1];
  var ref5 = useState(""), pw2 = ref5[0], setPw2 = ref5[1];
  var ref6 = useState(""), err = ref6[0], setErr = ref6[1];
  var go = function() {
    setErr("");
    var e = em.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return setErr("Valid email needed.");
    if (!pw || pw.length < 6) return setErr("Password: 6+ chars.");
    if (mode === "signup") { if (!nm.trim()) return setErr("Enter name."); if (pw !== pw2) return setErr("Passwords don't match."); }
    var isPro = PRO.indexOf(e) >= 0;
    onEnter({ name: nm.trim() || "Student", email: e, isPro: isPro, usesLeft: isPro ? 999 : 3 });
  };
  var inp = { width: "100%", padding: "13px 15px", border: "1.5px solid " + t.bdr, borderRadius: 12, fontSize: 15, fontFamily: "inherit", color: t.tx, background: t.ibg };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg, fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: t.card, borderRadius: 24, padding: "36px 28px", boxShadow: "0 4px 40px rgba(0,0,0,.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg," + t.ac + "," + t.ac2 + ")", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 22, color: "#fff" }}>P</div>
          <span style={{ fontWeight: 800, fontSize: 26, color: t.tx }}>PrepPal</span>
        </div>
        <p style={{ fontSize: 13, color: t.tx2, textAlign: "center", margin: 0 }}>Your study prep pal</p>
        <div style={{ display: "flex", background: t.cbg, borderRadius: 12, padding: 4, width: "100%" }}>
          <button onClick={function() { setMode("login"); setErr(""); }} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, background: mode === "login" ? t.card : "transparent", color: mode === "login" ? t.tx : t.tx2, fontFamily: "inherit", fontSize: 14, fontWeight: mode === "login" ? 700 : 500, cursor: "pointer" }}>Sign In</button>
          <button onClick={function() { setMode("signup"); setErr(""); }} style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 10, background: mode === "signup" ? t.card : "transparent", color: mode === "signup" ? t.tx : t.tx2, fontFamily: "inherit", fontSize: 14, fontWeight: mode === "signup" ? 700 : 500, cursor: "pointer" }}>Sign Up</button>
        </div>
        {mode === "signup" && <input value={nm} onChange={function(e) { setNm(e.target.value); }} placeholder="Full name" style={inp} />}
        <input value={em} onChange={function(e) { setEm(e.target.value); }} placeholder="Email" type="email" style={inp} />
        <input value={pw} onChange={function(e) { setPw(e.target.value); }} placeholder="Password" type="password" style={inp} onKeyDown={function(e) { if (e.key === "Enter" && mode === "login") go(); }} />
        {mode === "signup" && <input value={pw2} onChange={function(e) { setPw2(e.target.value); }} placeholder="Confirm password" type="password" style={inp} onKeyDown={function(e) { if (e.key === "Enter") go(); }} />}
        {err && <div style={{ width: "100%", padding: "9px 13px", borderRadius: 10, background: "rgba(235,87,87,.1)", color: "#eb5757", fontSize: 13 }}>{err}</div>}
        <button onClick={go} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg," + t.ac + "," + t.ac2 + ")", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>{mode === "login" ? "Sign In →" : "Create Account →"}</button>
      </div>
    </div>
  );
}

export default function PrepPal() {
  var ref = useState(null), user = ref[0], setUser = ref[1];
  var ref2 = useState(0), tab = ref2[0], setTab = ref2[1];
  var ref3 = useState(false), pw = ref3[0], setPw = ref3[1];
  var ref4 = useState(false), dark = ref4[0], setDark = ref4[1];
  var t = dark ? DK : LT;

  var gate = useCallback(async function() {
    if (user.isPro) return true;
    if (user.usesLeft > 0) { setUser(function(u) { return Object.assign({}, u, { usesLeft: u.usesLeft - 1 }); }); return true; }
    setPw(true); return false;
  }, [user]);

  if (!user) return <Auth onEnter={setUser} t={t} />;

  var tabContent = null;
  if (tab === 0) tabContent = <ChatTab gate={gate} t={t} greeting="Hey! 👋 Paste your notes and I'll create flashcards. Or ask me anything about studying!" sysExtra="When the student pastes notes, create flashcards in a clear format. For each card write 'Q: question' and 'A: answer' on separate lines. Create 6-10 high quality cards that test real understanding." ph="Paste notes or chat..." />;
  if (tab === 1) tabContent = <ChatTab gate={gate} t={t} greeting="Ready to test yourself? 🧠 Paste notes and tell me how many questions!" sysExtra="Create multiple choice quiz questions. Format each as: numbered question, then A) B) C) D) options, then 'Answer: X' and 'Explanation: ...' on the next lines. Make questions that test real understanding with plausible wrong answers." ph="Paste notes for a quiz..." />;
  if (tab === 2) tabContent = <ChatTab gate={gate} t={t} greeting="Paste your notes! ✍️ I'll organize them perfectly. Say 'outline', 'cornell', or 'eli5'." sysExtra="Summarize the student's notes thoroughly. Use bullet points with clear headers. Highlight key terms. Be comprehensive — don't miss important concepts. If they say 'outline' use numbered format, 'cornell' use Cornell note method, 'eli5' explain simply with analogies." ph="Paste notes..." />;
  if (tab === 3) tabContent = <ChatTab gate={gate} t={t} greeting="Ask me anything! 📚 Math, science, writing — I'll solve it step by step." sysExtra="Help with homework. For math: show EVERY step (Step 1, Step 2, etc). For science: explain the concept then apply it. For writing: give specific guidance with examples. Always show your complete work. End with a key takeaway." ph="Ask a homework question..." />;
  if (tab === 4) tabContent = <ChatTab gate={gate} t={t} greeting="Tell me a poster topic! 🎨 I'll write detailed content for each section." sysExtra="Create detailed poster content. Write a proper TITLE, then 3-4 sections each with a heading and 2-3 sentences of REAL educational content with specific facts. This is for an academic poster — be thorough and factual." ph="Poster topic..." />;
  if (tab === 5) tabContent = <TimerTab t={t} />;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: t.bg, fontFamily: "'DM Sans',sans-serif", color: t.tx }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{"@keyframes dp{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}*{box-sizing:border-box}input:focus{outline:none;border-color:" + t.ac + "!important}button{transition:all .12s}button:disabled{opacity:.5;cursor:not-allowed}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(155,125,255,.2);border-radius:3px}"}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid " + t.bdr, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg," + t.ac + "," + t.ac2 + ")", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: "#fff" }}>P</div>
          <span style={{ fontWeight: 800, fontSize: 17, color: t.tx }}>PrepPal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={function() { setDark(!dark); }} style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer" }}>{dark ? "☀️" : "🌙"}</button>
          {user.isPro ? <span style={{ fontSize: 10, padding: "3px 8px", background: "linear-gradient(135deg," + t.ac + "," + t.ac2 + ")", borderRadius: 20, color: "#fff", fontWeight: 700 }}>PRO</span> : <span style={{ fontSize: 10, padding: "3px 8px", background: t.cbg, borderRadius: 20, color: t.tx2, fontWeight: 700 }}>{user.usesLeft + " left"}</span>}
          <span style={{ fontSize: 12, color: t.tx2 }}>{user.name}</span>
          <button onClick={function() { setUser(null); }} style={{ border: "none", background: "transparent", color: t.tx3, fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}>Out</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 2, padding: "6px 8px", overflowX: "auto", borderBottom: "1px solid " + t.bdr, flexShrink: 0 }}>
        {TABS.map(function(label, i) {
          return <button key={i} onClick={function() { setTab(i); }} style={{ padding: "6px 10px", border: "none", borderRadius: 9, background: tab === i ? t.abg : "transparent", color: tab === i ? t.ac : t.tx3, fontFamily: "inherit", fontWeight: tab === i ? 700 : 500, fontSize: 11, whiteSpace: "nowrap", cursor: "pointer" }}>{label}</button>;
        })}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tabContent}
      </div>

      {pw && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={function() { setPw(false); }}>
          <div style={{ width: "100%", maxWidth: 380, background: t.card, borderRadius: 24, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }} onClick={function(e) { e.stopPropagation(); }}>
            <div style={{ fontSize: 36 }}>🔓</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: t.tx, margin: 0 }}>Free tries used!</h2>
            <div style={{ fontSize: 32, fontWeight: 800, color: t.ac, marginTop: 8 }}>{PRICE}</div>
            <a href={STRIPE} target="_blank" rel="noopener noreferrer" onClick={function() { setUser(function(u) { return Object.assign({}, u, { isPro: true, usesLeft: 999 }); }); setPw(false); }} style={{ width: "100%", padding: 14, background: "#1a1a2e", border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", marginTop: 8, textDecoration: "none", textAlign: "center", display: "block" }}>Subscribe</a>
          </div>
        </div>
      )}
    </div>
  );
}
