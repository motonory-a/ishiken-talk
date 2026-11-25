import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CHARS from "./src/chars";

// 中継サーバーのアドレス。空のままだと「お試しモード」（AIを使わない仮の返事）で動く
const API_URL = "https://ishiken-talk.motonory.workers.dev";
const SITE = "https://motonory-a.github.io/ishiken369/";
const LINE_URL = "https://lin.ee/zapyKLV";
const BY = new Map(CHARS.map(c => [c.n, c]));
const COLOR = { "緑": "#79c99a", "茶": "#b88a5a", "ピンク": "#f4a5c4", "赤": "#df5f6c", "黒": "#4b4a59", "白": "#d9d2e6", "青": "#4f6fd8", "黄": "#f1cf55", "透明": "#bcd6ec", "水色": "#86d0e8", "虹": "#c9a7f0", "紫": "#a07ae0", "橙": "#f2a057", "金銀": "#d4bf78" };
const colorOf = c => COLOR[c.color] || "#c9b2ff";
const face = c => `${SITE}img/bust/${c.n}.webp`;
const C = { bg: "#FAF7FF", card: "#FFFFFF", ink: "#3E3566", sub: "#7C7398", line: "#E7DEF8", pri: "#8E6AD8", pink: "#E66F9B" };

const store = {
  async get(k, d) { try { const v = await AsyncStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  async set(k, v) { try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const STYLES = [["senpai", "先輩"], ["san", "さん"], ["kun", "くん"], ["chan", "ちゃん"], ["none", "呼び捨て"]];
const callOf = u => { const n = (u.name || "").trim(); const f = { senpai: "先輩", san: "さん", kun: "くん", chan: "ちゃん", none: "" }[u.style] ?? "先輩"; return n ? n + f : (u.style === "senpai" ? "先輩" : "あなた"); };
const newId = () => "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36);

async function api(path, body) {
  const r = await fetch(API_URL + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const d = await r.json();
  return { ok: r.ok, code: r.status, ...d };
}
// お試しモード：無料10回・推し1人の決まりだけ手元でまねる
const demo = { used: 0, oshi: null };
async function send(userId, charNo, messages, user) {
  if (API_URL) return api("/chat", { userId, charNo, messages, user });
  if (demo.oshi && demo.oshi !== charNo) return { ok: false, error: "pass_required" };
  if (demo.used >= 10) return { ok: false, error: "limit" };
  demo.oshi = demo.oshi || charNo; demo.used++;
  const c = BY.get(charNo);
  return { ok: true, reply: `（お試しモード）${callOf(user)}、${c.name}だよ。サーバーにつなぐと、ここに本物の返事が届くよ。`, status: { left: 10 - demo.used, limit: 10, pass: false, oshi: demo.oshi } };
}

export default function App() {
  const [userId, setUserId] = useState(null);
  const [screen, setScreen] = useState("home");
  const [oshi, setOshi] = useState(null);
  const [talk, setTalk] = useState(null);
  const [status, setStatus] = useState({ left: 10, limit: 10, pass: false });
  const [user, setUser] = useState({ name: "", style: "senpai" });

  useEffect(() => { (async () => {
    let id = await store.get("userId", null);
    if (!id) { id = newId(); await store.set("userId", id); }
    setUserId(id);
    setOshi(await store.get("oshi", null));
    setUser(await store.get("user", { name: "", style: "senpai" }));
    if (API_URL) { try { const s = await api(`/status?userId=${id}`); setStatus(s); } catch {} }
  })(); }, []);

  const saveUser = async u => { setUser(u); await store.set("user", u); };
  const choose = async n => { setOshi(n); await store.set("oshi", n); setTalk(n); setScreen("chat"); };

  if (!userId) return <SafeAreaView style={s.wrap} />;
  return (
    <SafeAreaView style={s.wrap}>
      <StatusBar style="dark" />
      {screen === "home" && <Home oshi={oshi} status={status} user={user} onUser={saveUser} onTalk={n => { setTalk(n); setScreen("chat"); }} onPick={() => setScreen("pick")} />}
      {screen === "pick" && <Pick status={status} oshi={oshi} onBack={() => setScreen("home")} onChoose={choose} />}
      {screen === "chat" && talk && <Chat userId={userId} user={user} char={BY.get(talk)} status={status} setStatus={setStatus} onBack={() => setScreen("home")} />}
    </SafeAreaView>
  );
}

function Header({ title, onBack }) {
  return (
    <View style={s.header}>
      {onBack ? <Pressable onPress={onBack} style={s.backBtn} accessibilityLabel="もどる"><Text style={s.back}>‹</Text></Pressable> : <View style={s.backBtn} />}
      <Text style={s.title}>{title}</Text>
      <View style={s.backBtn} />
    </View>
  );
}

function Home({ oshi, status, user, onUser, onTalk, onPick }) {
  const c = oshi && BY.get(oshi);
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <Text style={s.logo}>いしけん！</Text>
      <Text style={s.lead}>天然石研究部の369人と、おしゃべりしよう。</Text>
      {c ? (
        <View style={[s.card, { borderTopColor: colorOf(c), borderTopWidth: 6 }]}>
          <Image source={{ uri: face(c) }} style={s.bigFace} />
          <Text style={s.kicker}>あなたの推し</Text>
          <Text style={s.name}>{c.name}</Text>
          <Text style={s.stone}>{c.stone}の子</Text>
          <Pressable style={[s.btn, { backgroundColor: C.pink }]} onPress={() => onTalk(c.n)}><Text style={s.btnTx}>{c.name}と話す</Text></Pressable>
          <Text style={s.left}>今日の残り {status.left} / {status.limit} 回</Text>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.kicker}>まずは推しを決めよう</Text>
          <Text style={s.body}>最初に選んだ子と、毎日10回まで無料で話せます。</Text>
          <Pressable style={s.btn} onPress={onPick}><Text style={s.btnTx}>推しを選ぶ</Text></Pressable>
        </View>
      )}
      <View style={s.card}>
        <Text style={s.kicker}>あなたの呼ばれ方</Text>
        <TextInput value={user.name} onChangeText={t => onUser({ ...user, name: t.slice(0, 12) })} placeholder="呼び名（例：あっきー）" style={s.nameInput} placeholderTextColor={C.sub} maxLength={12} />
        <View style={s.chips}>{STYLES.map(([k, label]) => (
          <Pressable key={k} onPress={() => onUser({ ...user, style: k })} style={[s.chip, user.style === k && s.chipOn]} accessibilityState={{ selected: user.style === k }}>
            <Text style={[s.chipTx, user.style === k && { color: "#fff" }]}>{label}</Text>
          </Pressable>))}</View>
        <Text style={s.left}>部員から「{callOf(user)}」と呼ばれます</Text>
      </View>
      <View style={s.card}>
        <Text style={s.kicker}>部員パス（月480円）</Text>
        <Text style={s.body}>369人の誰とでも、1日300回まで話せます。</Text>
        <Pressable style={[s.btn, s.btnGhost]} onPress={onPick}><Text style={[s.btnTx, { color: C.pri }]}>369人を見る</Text></Pressable>
        <Text style={s.note}>お支払いはストア公開のときにつなぎます。</Text>
      </View>
      <View style={s.card}>
        <Text style={s.kicker}>推しのグッズ・ブレスレット</Text>
        <Pressable style={[s.btn, { backgroundColor: "#06C755" }]} onPress={() => Linking.openURL(LINE_URL)}><Text style={s.btnTx}>推しの石でブレスレットを相談（LINE）</Text></Pressable>
        <Pressable style={[s.btn, s.btnGhost]} onPress={() => Linking.openURL(SITE)}><Text style={[s.btnTx, { color: C.pri }]}>いしけん！公式サイト</Text></Pressable>
      </View>
      <Text style={s.note}>登場人物はすべて架空の人物で、会話はAIが演じています。</Text>
    </ScrollView>
  );
}

function Pick({ status, oshi, onBack, onChoose }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => CHARS.filter(c => !q || c.name.includes(q) || c.stone.includes(q)), [q]);
  return (
    <View style={{ flex: 1 }}>
      <Header title="369人から選ぶ" onBack={onBack} />
      <TextInput value={q} onChangeText={setQ} placeholder="名前や石で探す（例：水晶）" style={s.search} placeholderTextColor={C.sub} />
      {!status.pass && oshi ? <Text style={s.notice}>無料で話せるのは推しの子だけです。ほかの子とは部員パスで話せます。</Text> : null}
      <FlatList data={list} numColumns={3} keyExtractor={c => String(c.n)} contentContainerStyle={{ padding: 8 }}
        renderItem={({ item: c }) => {
          const locked = !status.pass && oshi && oshi !== c.n;
          return (
            <Pressable style={[s.cell, locked && { opacity: 0.45 }]} onPress={() => !locked && onChoose(c.n)} accessibilityLabel={`${c.name}、${c.stone}`}>
              <Image source={{ uri: face(c) }} style={[s.cellFace, { borderColor: colorOf(c) }]} />
              <Text style={s.cellName}>{c.name}</Text>
              <Text style={s.cellStone} numberOfLines={1}>{c.stone}</Text>
            </Pressable>
          );
        }} />
    </View>
  );
}

// 声で入力（Safari などブラウザの音声認識。使えない環境ではボタンを出さない）
const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
function useVoiceInput(onText) {
  const [on, setOn] = useState(false);
  const ref = useRef(null);
  const start = () => {
    if (!SR || on) return;
    try {
      const r = new SR(); r.lang = "ja-JP"; r.interimResults = false; r.continuous = false;
      r.onresult = e => { const t = Array.from(e.results).map(x => x[0].transcript).join(""); if (t) onText(t); };
      r.onend = () => setOn(false); r.onerror = () => setOn(false);
      ref.current = r; r.start(); setOn(true);
    } catch { setOn(false); }
  };
  const stop = () => { try { ref.current && ref.current.stop(); } catch {} setOn(false); };
  return { can: !!SR, on, start, stop };
}

function Chat({ userId, user, char: c, status, setStatus, onBack }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const listRef = useRef(null);
  const key = `talk:${c.n}`;
  const voice = useVoiceInput(t => setText(prev => (prev ? prev + " " : "") + t));

  useEffect(() => { (async () => setMsgs(await store.get(key, [{ role: "assistant", content: `${c.name}です。来てくれてありがとう！` }])))(); }, [c.n]);
  useEffect(() => { store.set(key, msgs.slice(-60)); setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50); }, [msgs]);

  const go = async () => {
    const t = text.trim(); if (!t || busy) return;
    const next = [...msgs, { role: "user", content: t }];
    setMsgs(next); setText(""); setBusy(true); setInfo("");
    try {
      const r = await send(userId, c.n, next, user);
      if (r.ok) { setMsgs([...next, { role: "assistant", content: r.reply }]); if (r.status) setStatus(r.status); }
      else if (r.error === "limit") setInfo("今日はここまで。また明日話そうね！（部員パスなら1日300回）");
      else if (r.error === "pass_required") setInfo("無料で話せるのは推しの子だけです。部員パスで誰とでも話せます。");
      else setInfo("うまく届きませんでした。少し待ってからもう一度送ってください。");
    } catch { setInfo("通信できませんでした。電波のよい所でもう一度送ってください。"); }
    setBusy(false);
  };
  const report = async m => {
    if (API_URL) { try { await api("/report", { userId, charNo: c.n, text: m.content }); } catch {} }
    setInfo("報告を受け付けました。内容を確認します。");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={c.name} onBack={onBack} />
      <Text style={s.aiNote}>AIが演じる{c.name}と話しています · 残り {status.left}/{status.limit} 回</Text>
      <FlatList ref={listRef} data={msgs} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ padding: 12 }}
        renderItem={({ item: m }) => m.role === "user"
          ? <View style={[s.bubble, s.me]}><Text style={s.meTx}>{m.content}</Text></View>
          : <Pressable onLongPress={() => report(m)} style={s.row}>
              <Image source={{ uri: face(c) }} style={s.avatar} />
              <View style={[s.bubble, s.her, { borderColor: colorOf(c) }]}><Text style={s.herTx}>{m.content}</Text></View>
            </Pressable>} />
      {busy ? <Text style={s.typing}>{c.name}が入力中…</Text> : null}
      {info ? <Text style={s.notice}>{info}</Text> : null}
      <View style={s.inputRow}>
        {voice.can ? <Pressable onPress={voice.on ? voice.stop : voice.start} style={[s.micBtn, voice.on && { backgroundColor: C.pink }]} accessibilityLabel={voice.on ? "声の入力を止める" : "声で入力する"}><Text style={[s.micTx, voice.on && { color: "#fff" }]}>{voice.on ? "■" : "🎤"}</Text></Pressable> : null}
        <TextInput value={text} onChangeText={setText} placeholder={voice.on ? "聞いています…" : "メッセージ"} style={s.input} maxLength={400} multiline placeholderTextColor={C.sub} />
        <Pressable style={[s.sendBtn, (!text.trim() || busy) && { opacity: 0.4 }]} onPress={go} accessibilityLabel="送る"><Text style={s.btnTx}>送る</Text></Pressable>
      </View>
      <Text style={s.noteSmall}>気になる返事は長押しで報告できます</Text>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, paddingBottom: 40 },
  logo: { fontSize: 34, fontWeight: "800", color: C.pri, textAlign: "center", marginTop: 8 },
  lead: { textAlign: "center", color: C.sub, marginBottom: 12 },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 14, borderWidth: 1, borderColor: C.line, alignItems: "stretch" },
  bigFace: { width: 180, height: 216, borderRadius: 18, alignSelf: "center", backgroundColor: "#eee" },
  kicker: { color: C.sub, fontWeight: "700", marginTop: 10, textAlign: "center" },
  name: { fontSize: 32, fontWeight: "800", color: C.ink, textAlign: "center" },
  stone: { color: "#6b5aa0", fontWeight: "700", textAlign: "center", marginBottom: 6 },
  body: { color: C.ink, textAlign: "center", marginVertical: 8 },
  btn: { backgroundColor: C.pri, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 16, marginTop: 10, alignItems: "center" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 2, borderColor: C.pri },
  btnTx: { color: "#fff", fontWeight: "800", fontSize: 16 },
  left: { textAlign: "center", color: C.sub, marginTop: 8 },
  note: { color: C.sub, fontSize: 12, textAlign: "center", marginTop: 10 },
  noteSmall: { color: C.sub, fontSize: 11, textAlign: "center", paddingBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.card },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  back: { fontSize: 32, color: C.pri, lineHeight: 34 },
  title: { fontSize: 18, fontWeight: "800", color: C.ink },
  search: { margin: 12, marginBottom: 4, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, height: 46, fontSize: 16, color: C.ink },
  notice: { marginHorizontal: 12, marginVertical: 6, padding: 10, borderRadius: 12, backgroundColor: "#F4EDFF", color: C.ink, fontSize: 13 },
  cell: { flex: 1 / 3, alignItems: "center", padding: 6 },
  cellFace: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, backgroundColor: "#eee" },
  cellName: { marginTop: 4, fontWeight: "800", color: C.ink },
  cellStone: { fontSize: 11, color: C.sub, maxWidth: 100 },
  aiNote: { textAlign: "center", fontSize: 12, color: C.sub, paddingVertical: 6, backgroundColor: "#F4EDFF" },
  row: { flexDirection: "row", alignItems: "flex-end", marginVertical: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 6, backgroundColor: "#eee" },
  bubble: { maxWidth: "78%", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  her: { backgroundColor: C.card, borderWidth: 1.5, borderBottomLeftRadius: 4 },
  me: { alignSelf: "flex-end", backgroundColor: C.pri, borderBottomRightRadius: 4, marginVertical: 4 },
  herTx: { color: C.ink, fontSize: 15, lineHeight: 22 },
  meTx: { color: "#fff", fontSize: 15, lineHeight: 22 },
  typing: { marginLeft: 16, color: C.sub, fontSize: 12 },
  inputRow: { flexDirection: "row", padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: C.ink },
  nameInput: { marginTop: 10, backgroundColor: C.bg, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, height: 46, fontSize: 16, color: C.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, justifyContent: "center" },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: "center", borderRadius: 999, borderWidth: 1.5, borderColor: C.pri },
  chipOn: { backgroundColor: C.pri },
  chipTx: { color: C.pri, fontWeight: "800" },
  micBtn: { width: 44, minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.pri, alignItems: "center", justifyContent: "center" },
  micTx: { fontSize: 18, color: C.pri },
  sendBtn: { backgroundColor: C.pink, borderRadius: 22, paddingHorizontal: 18, justifyContent: "center", minHeight: 44 }
});
