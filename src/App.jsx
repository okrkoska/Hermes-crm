import { useState, useEffect, useCallback, useRef } from "react";

// ─── Supabase Client ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://nfbewqzmgbidzshuhgga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mYmV3cXptZ2JpZHpzaHVoZ2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDk3NzAsImV4cCI6MjA5NzMyNTc3MH0.JZE_qTqlB1jNKcirOGEXiKZy2MFRCKOt5atY60IzXUs";

const sb = {
  headers: {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  },
  async query(table, params = "") {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, { headers: this.headers });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: this.headers, body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async update(table, id, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH", headers: this.headers, body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async delete(table, id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE", headers: this.headers
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
  async uploadFile(path, file) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/attachments/${path}`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
      body: file
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  fileUrl(path) {
    return `${SUPABASE_URL}/storage/v1/object/sign/attachments/${path}`;
  },
  async signedUrl(path) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/attachments/${path}`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 3600 })
    });
    if (!r.ok) throw new Error(await r.text());
    const d = await r.json();
    return `${SUPABASE_URL}/storage/v1${d.signedURL}`;
  },
  async deleteFile(path) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/attachments/${path}`, {
      method: "DELETE",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    return r.ok;
  }
};

// DB row → app deal
const rowToDeal = (r) => ({
  id: r.id, name: r.name, company: r.company, value: Number(r.value),
  stage: r.stage, owner: r.owner, probability: r.probability,
  source: r.source||"", notes: r.notes||"", goLive: r.go_live||"",
  lostReason: r.lost_reason||"", created: r.created_at, updated: r.updated_at,
});

// App deal → DB row
const dealToRow = (d, location) => ({
  location, name: d.name, company: d.company, value: d.value,
  stage: d.stage, owner: d.owner, probability: d.probability,
  source: d.source||"", notes: d.notes||"", go_live: d.goLive||"",
  lost_reason: d.lostReason||"", updated_at: today(),
});


// ─── Locations ────────────────────────────────────────────────────────────────
const LOCATIONS = ["Altenkundstadt", "Sonnefeld", "Otelfingen", "Valdengo", "Pilsen", "Jacksonville"];
const LOCATION_FLAGS = { Altenkundstadt: "🇩🇪", Sonnefeld: "🇩🇪", Otelfingen: "🇨🇭", Valdengo: "🇮🇹", "Pilsen": "🇨🇿", Jacksonville: "🇺🇸" };


// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    bg:       "#F0F4F8",
    surface:  "#FFFFFF",
    surface2: "#F8FAFC",
    border:   "#CBD5E1",
    border2:  "#E2E8F0",
    text:     "#0F172A",
    text2:    "#475569",
    muted:    "#94A3B8",
    inputBg:  "#FFFFFF",
    headerBg: "#FFFFFF",
    navActive:"#EFF6FF",
    toastBg:  "#1E293B",
  },
  dark: {
    bg:       "#0B1525",
    surface:  "#111C2D",
    surface2: "#0F1B2D",
    border:   "#1E3A5F",
    border2:  "#1E3A5F",
    text:     "#E2E8F0",
    text2:    "#94A3B8",
    muted:    "#64748B",
    inputBg:  "#0B1525",
    headerBg: "#111C2D",
    navActive:"#1E3A5F",
    toastBg:  "#1E3A5F",
  },
};
// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    appName: "CRMflow", login: "Sign In", selectLocation: "Select your location",
    yourName: "Your name", pin: "PIN (4 digits)", pinPlaceholder: "Enter 4-digit PIN",
    unlock: "Unlock →", wrongPin: "Incorrect PIN. Try again.", nameRequired: "Please enter your name.",
    leads: "Leads", dashboard: "Dashboard", settings: "Settings",
    newLead: "New Lead", exportCsv: "Export CSV", search: "Search leads or companies…",
    allStages: "All stages", allOwners: "All owners", showing: "Showing",
    totalValue: "Total value", weighted: "Weighted",
    edit: "Edit", delete: "Delete", cancel: "Cancel", save: "Save lead",
    dealName: "Deal name", company: "Company", value: "Value (€)", stage: "Stage",
    owner: "Owner", probability: "Probability", notes: "Notes",
    markWon: "✓ Mark Won", markLost: "✕ Mark Lost",
    created: "Created", updated: "Updated", noLeads: "No leads match your filters.",
    clearFilters: "Clear filters", editLead: "Edit lead", addLead: "Add new lead",
    activePipeline: "Active Pipeline", revenueWon: "Revenue Won",
    weightedForecast: "Weighted Forecast", conversionRate: "Conversion Rate",
    totalLeads: "Total Leads", openLeads: "open leads", closedDeals: "closed deals",
    byProbability: "by probability", wonSlashLost: "won / lost", acrossAllStages: "across all stages",
    valueByStage: "Value by Stage", valueByOwner: "Value by Owner",
    pipelineFunnel: "Pipeline Funnel", recentLeads: "Recent Leads",
    changePin: "Change PIN", currentPin: "Current PIN", newPin: "New PIN (4 digits)",
    confirmPin: "Confirm new PIN", pinChanged: "PIN changed successfully.",
    pinMismatch: "New PINs do not match.", pinWrong: "Current PIN is incorrect.",
    pinInvalid: "PIN must be exactly 4 digits.",
    language: "Language", locationLabel: "Location",
    signOut: "Sign out", loggedInAs: "Logged in as", themeLabel: "Appearance", themeLight: "☀️ Light (Day)", themeDark: "🌙 Dark (Night)", groupDash: "Group", groupTitle: "Group Dashboard", groupSub: "All locations combined", loading: "Loading data…", noData: "No data yet", goLive: "Go Live", timeline: "Timeline", noGoLive: "No date", source: "Lead Source", bySource: "Leads by Source", lostReason: "Lost Reason", lostReasonPlaceholder: "Why was this deal lost?",
    likelyLabel: "likely", successCloseMsg: "Successfully closed!",
    stagesShort: ["New", "Qual.", "Prop.", "Neg."],
  },
  de: {
    appName: "CRMflow", login: "Anmelden", selectLocation: "Standort wählen",
    yourName: "Ihr Name", pin: "PIN (4 Stellen)", pinPlaceholder: "4-stelligen PIN eingeben",
    unlock: "Entsperren →", wrongPin: "Falscher PIN. Erneut versuchen.", nameRequired: "Bitte Namen eingeben.",
    leads: "Leads", dashboard: "Dashboard", settings: "Einstellungen",
    newLead: "Neuer Lead", exportCsv: "CSV Export", search: "Leads oder Firmen suchen…",
    allStages: "Alle Phasen", allOwners: "Alle Mitarbeiter", showing: "Angezeigt",
    totalValue: "Gesamtwert", weighted: "Gewichtet",
    edit: "Bearbeiten", delete: "Löschen", cancel: "Abbrechen", save: "Lead speichern",
    dealName: "Deal-Name", company: "Unternehmen", value: "Wert (€)", stage: "Phase",
    owner: "Verantwortlich", probability: "Wahrscheinlichkeit", notes: "Notizen",
    markWon: "✓ Als gewonnen", markLost: "✕ Als verloren",
    created: "Erstellt", updated: "Aktualisiert", noLeads: "Keine Leads gefunden.",
    clearFilters: "Filter zurücksetzen", editLead: "Lead bearbeiten", addLead: "Neuer Lead",
    activePipeline: "Active Pipeline", revenueWon: "Revenue Won",
    weightedForecast: "Weighted Forecast", conversionRate: "Conversion Rate",
    totalLeads: "Total Leads", openLeads: "offene Leads", closedDeals: "abgeschl. Deals",
    byProbability: "nach Wahrscheinlichkeit", wonSlashLost: "gewonnen / verloren", acrossAllStages: "alle Phasen",
    valueByStage: "Value by Stage", valueByOwner: "Value by Owner",
    pipelineFunnel: "Pipeline Funnel", recentLeads: "Recent Leads",
    changePin: "PIN ändern", currentPin: "Aktueller PIN", newPin: "Neuer PIN (4 Stellen)",
    confirmPin: "Neuen PIN bestätigen", pinChanged: "PIN erfolgreich geändert.",
    pinMismatch: "Neue PINs stimmen nicht überein.", pinWrong: "Aktueller PIN ist falsch.",
    pinInvalid: "PIN muss genau 4 Ziffern haben.",
    language: "Sprache", locationLabel: "Standort",
    signOut: "Abmelden", loggedInAs: "Angemeldet als", themeLabel: "Darstellung", themeLight: "☀️ Hell (Tag)", themeDark: "🌙 Dunkel (Nacht)", groupDash: "Gruppe", groupTitle: "Group Dashboard", groupSub: "Alle Standorte zusammen", loading: "Daten werden geladen…", noData: "Noch keine Daten", goLive: "Go Live", timeline: "Zeitachse", noGoLive: "Kein Datum", source: "Lead-Quelle", bySource: "Leads nach Quelle", lostReason: "Verlustgrund", lostReasonPlaceholder: "Warum wurde dieser Deal verloren?",
    likelyLabel: "wahrsch.", successCloseMsg: "Erfolgreich abgeschlossen!",
    stagesShort: ["Neu", "Qual.", "Ang.", "Verh."],
  }
};


// ─── Lead Sources ─────────────────────────────────────────────────────────────
const SOURCES = ["Website / Web Form", "Email Campaign", "Social Media", "Cold Call", "Networking / Event", "Trade Show / Exhibition", "Partner Referral", "Customer Referral", "PR / Media", "Existing Account", "Unknown / Other"];
const SOURCE_LABELS = {
  en: ["Website / Web Form", "Email Campaign", "Social Media", "Cold Call", "Networking / Event", "Trade Show / Exhibition", "Partner Referral", "Customer Referral", "PR / Media", "Existing Account", "Unknown / Other"],
  de: ["Website / Webformular", "E-Mail Kampagne", "Social Media", "Kaltakquise", "Networking / Event", "Messe / Ausstellung", "Partner-Empfehlung", "Kunden-Empfehlung", "PR / Medien", "Bestandskunde", "Unbekannt / Sonstiges"],
};
const SOURCE_ICONS = ["🌐", "📧", "📣", "📞", "🤝", "🏛️", "🔗", "👥", "📰", "🏢", "❓"];
const SOURCE_COLORS = ["#3B82F6", "#6366F1", "#EC4899", "#F59E0B", "#10B981", "#F97316", "#8B5CF6", "#14B8A6", "#64748B", "#0EA5E9", "#94A3B8"];
// ─── Stages (always EN keys, display translated) ──────────────────────────────
const STAGES = ["New Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];
const STAGE_META = [
  { color: "#6366F1", bg: "#6366F115" },
  { color: "#3B82F6", bg: "#3B82F615" },
  { color: "#F59E0B", bg: "#F59E0B15" },
  { color: "#EC4899", bg: "#EC489915" },
  { color: "#10B981", bg: "#10B98115" },
  { color: "#EF4444", bg: "#EF444415" },
];
const STAGE_LABELS = {
  en: ["New Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
  de: ["Neuer Lead", "Qualifiziert", "Angebot", "Verhandlung", "Gewonnen", "Verloren"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtM = (n) => n >= 1e6 ? (n/1e6).toFixed(2)+" M" : n >= 1e3 ? (n/1e3).toFixed(0)+" k" : String(Math.round(n));
const today = () => new Date().toISOString().split("T")[0];
const stageIdx = (s) => STAGES.indexOf(s);
const stageMeta = (s) => STAGE_META[stageIdx(s)] ?? STAGE_META[0];
const stageLabel = (s, lang) => { const i = stageIdx(s); return i >= 0 ? STAGE_LABELS[lang][i] : s; };

const SAMPLE_DEALS = (loc) => [
  { id: 1, name: "Office Renovation", company: "BuildCorp GmbH", value: 45000, stage: "Negotiation", owner: "Jana N.", created: "2026-04-10", updated: "2026-06-01", probability: 70, notes: "Waiting for contract.", goLive: "2026-09", source: "Customer Referral" },
  { id: 2, name: "IT Infrastructure", company: "TechCorp AG", value: 82000, stage: "Proposal", owner: "Tom K.", created: "2026-05-02", updated: "2026-06-05", probability: 45, notes: "Send revised quote.", goLive: "2026-11", source: "Cold Outreach" },
  { id: 3, name: "Q3 Marketing", company: "Brand Studio", value: 12000, stage: "Qualified", owner: "Alex R.", created: "2026-05-20", updated: "2026-06-08", probability: 30, notes: "", goLive: "2026-08", source: "Website / Inbound" },
  { id: 4, name: "Packaging Line", company: "Pack EU", value: 29000, stage: "Won", owner: "Petra M.", created: "2026-03-15", updated: "2026-05-28", probability: 100, notes: "Successfully closed!", goLive: "2026-07", source: "Existing Account" },
  { id: 5, name: "Cloud Migration", company: "FinServe Inc.", value: 31000, stage: "New Lead", owner: "Jana N.", created: "2026-06-12", updated: "2026-06-12", probability: 10, notes: "Inbound inquiry.", goLive: "2026-12", source: "Trade Show / Exhibition" },
];

// ─── CSV Export (always EN) ───────────────────────────────────────────────────
function exportCSV(deals, location) {
  const headers = ["ID","Name","Company","Value (EUR)","Stage","Owner","Probability (%)","Source","Go Live","Lost Reason","Location","Created","Updated","Notes"];
  const rows = deals.map(d => [d.id, `"${d.name}"`, `"${d.company}"`, d.value, d.stage, d.owner, d.probability, d.source||"", d.goLive||"", `"${(d.lostReason||"").replace(/"/g,'""')} "`, location, d.created, d.updated, `"${(d.notes||"").replace(/"/g,'""')}"`]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `leads-${location.replace(/\s/g,"-")}-${today()}.csv`; a.click();
}

// ─── PIN Pad ──────────────────────────────────────────────────────────────────
function PinPad({ value, onChange }) {
  const press = (d) => { if (value.length < 4) onChange(value + d); };
  const del = () => onChange(value.slice(0, -1));

  return (
    <div style={{ userSelect:"none" }}>
      {/* Dots display */}
      <div style={{ display:"flex", gap:12, justifyContent:"center", margin:"16px 0 20px" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width:48, height:56, borderRadius:10,
            border:`2px solid ${value.length > i ? "#3B82F6" : "#1E3A5F"}`,
            background: value.length > i ? "#3B82F622" : "#0B1525",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:28, color:"#3B82F6", transition:"all .15s"
          }}>
            {value.length > i ? "●" : ""}
          </div>
        ))}
      </div>
      {/* Number grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(String(n))}
            style={{ padding:"14px 0", borderRadius:10, border:"1px solid #1E3A5F", background:"#0B1525", color:"#E2E8F0", fontSize:20, fontWeight:600, cursor:"pointer", transition:"all .1s" }}
            onMouseEnter={e => e.currentTarget.style.background="#1E3A5F"}
            onMouseLeave={e => e.currentTarget.style.background="#0B1525"}>
            {n}
          </button>
        ))}
        {/* Bottom row: empty, 0, delete */}
        <div />
        <button onClick={() => press("0")}
          style={{ padding:"14px 0", borderRadius:10, border:"1px solid #1E3A5F", background:"#0B1525", color:"#E2E8F0", fontSize:20, fontWeight:600, cursor:"pointer", transition:"all .1s" }}
          onMouseEnter={e => e.currentTarget.style.background="#1E3A5F"}
          onMouseLeave={e => e.currentTarget.style.background="#0B1525"}>
          0
        </button>
        <button onClick={del}
          style={{ padding:"14px 0", borderRadius:10, border:"1px solid #1E3A5F", background:"#0B1525", color:"#94A3B8", fontSize:18, cursor:"pointer", transition:"all .1s" }}
          onMouseEnter={e => e.currentTarget.style.background="#1E3A5F"}
          onMouseLeave={e => e.currentTarget.style.background="#0B1525"}>
          ⌫
        </button>
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, lang, setLang }) {
  const t = T[lang];
  const [step, setStep] = useState("location"); // location | name | pin
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const submitLocation = () => { if (location) setStep("name"); };
  const submitName = () => { if (name.trim()) setStep("pin"); else setErr(t.nameRequired); };
  const submitPin = async () => {
    if (pin.length !== 4) { setErr(t.pinInvalid); doShake(); return; }
    let stored = "2026";
    try {
      const rows = await sb.query("location_pins", `?location=eq.${encodeURIComponent(location)}&select=pin`);
      if (rows && rows.length > 0) stored = rows[0].pin;
    } catch { stored = "2026"; }
    if (pin === stored) { onLogin({ location, name: name.trim(), lang }); }
    else { setErr(t.wrongPin); doShake(); setPin(""); }
  };

  useEffect(() => { if (pin.length === 4) submitPin(); }, [pin]);

  return (
    <div style={{ minHeight:"100vh", background:"#0B1525", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
      <div style={{ width:380, background:"#111C2D", borderRadius:16, border:"1px solid #1E3A5F", boxShadow:"0 24px 60px rgba(0,0,0,.5)", overflow:"hidden", animation: shake ? "shake .4s" : "none" }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1E3A5F,#0F2744)", padding:"28px 28px 22px", textAlign:"center", borderBottom:"1px solid #1E3A5F" }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#3B82F6,#6366F1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 12px" }}>⬡</div>
          <div style={{ fontSize:24, fontWeight:800, color:"#E2E8F0", letterSpacing:"-.03em" }}>CRM<span style={{color:"#3B82F6"}}>flow</span></div>
          {/* Lang toggle */}
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:12 }}>
            {["en","de"].map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding:"3px 12px", borderRadius:6, border:`1px solid ${lang===l?"#3B82F6":"#1E3A5F"}`, background: lang===l?"#3B82F622":"transparent", color: lang===l?"#3B82F6":"#64748B", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                {l === "en" ? "🇬🇧 EN" : "🇩🇪 DE"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:"24px 28px 28px" }}>
          {/* Step indicator */}
          <div style={{ display:"flex", gap:6, marginBottom:22 }}>
            {["location","name","pin"].map((s,i) => (
              <div key={s} style={{ flex:1, height:3, borderRadius:2, background: ["location","name","pin"].indexOf(step) >= i ? "#3B82F6" : "#1E3A5F", transition:"background .3s" }} />
            ))}
          </div>

          {/* STEP 1: Location */}
          {step === "location" && (
            <>
              <div style={{ fontSize:13, color:"#64748B", marginBottom:14, textAlign:"center" }}>{t.selectLocation}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:18 }}>
                {LOCATIONS.map(loc => (
                  <button key={loc} onClick={() => { setLocation(loc); setErr(""); }}
                    style={{ padding:"10px 8px", borderRadius:8, border:`2px solid ${location===loc?"#3B82F6":"#1E3A5F"}`, background: location===loc?"#1E3A5F22":"#0B1525", color: location===loc?"#E2E8F0":"#64748B", fontSize:12, fontWeight: location===loc?700:400, cursor:"pointer", transition:"all .15s", textAlign:"left" }}>
                    <span style={{ fontSize:16, marginRight:6 }}>{LOCATION_FLAGS[loc]}</span>{loc}
                  </button>
                ))}
              </div>
              <button onClick={submitLocation} disabled={!location}
                style={{ width:"100%", padding:"12px 0", borderRadius:8, border:"none", background: location?"linear-gradient(135deg,#3B82F6,#6366F1)":"#1E3A5F", color: location?"#fff":"#334155", fontSize:15, fontWeight:700, cursor: location?"pointer":"default" }}>
                {t.unlock.replace("→","").trim()} →
              </button>
            </>
          )}

          {/* STEP 2: Name */}
          {step === "name" && (
            <>
              <div style={{ fontSize:13, color:"#64748B", marginBottom:6, textAlign:"center" }}>
                {LOCATION_FLAGS[location]} <strong style={{color:"#94A3B8"}}>{location}</strong>
              </div>
              <div style={{ fontSize:13, color:"#64748B", marginBottom:14, textAlign:"center" }}>{t.yourName}</div>
              <input value={name} onChange={e => { setName(e.target.value); setErr(""); }}
                onKeyDown={e => e.key==="Enter" && submitName()}
                placeholder={t.yourName} autoFocus
                style={{ width:"100%", padding:"12px 14px", borderRadius:8, border:`1px solid ${err?"#EF4444":"#1E3A5F"}`, background:"#0B1525", color:"#E2E8F0", fontSize:15, boxSizing:"border-box", outline:"none", marginBottom:8 }} />
              {err && <div style={{ fontSize:12, color:"#EF4444", marginBottom:8 }}>{err}</div>}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={() => setStep("location")} style={{ flex:1, padding:"11px 0", borderRadius:8, border:"1px solid #1E3A5F", background:"none", color:"#64748B", fontSize:14, cursor:"pointer" }}>←</button>
                <button onClick={submitName} style={{ flex:3, padding:"11px 0", borderRadius:8, border:"none", background:"linear-gradient(135deg,#3B82F6,#6366F1)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>{t.unlock.replace("→","").trim()} →</button>
              </div>
            </>
          )}

          {/* STEP 3: PIN */}
          {step === "pin" && (
            <>
              <div style={{ fontSize:13, color:"#64748B", marginBottom:2, textAlign:"center" }}>
                {LOCATION_FLAGS[location]} <strong style={{color:"#94A3B8"}}>{location}</strong> · <span style={{color:"#3B82F6"}}>{name}</span>
              </div>
              <div style={{ fontSize:13, color:"#64748B", marginTop:10, marginBottom:2, textAlign:"center" }}>{t.pin}</div>
              <PinPad value={pin} onChange={v => { setPin(v); setErr(""); }} />
              {err && <div style={{ fontSize:12, color:"#EF4444", textAlign:"center", marginBottom:6 }}>{err}</div>}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { setStep("name"); setPin(""); setErr(""); }} style={{ flex:1, padding:"11px 0", borderRadius:8, border:"1px solid #1E3A5F", background:"none", color:"#64748B", fontSize:14, cursor:"pointer" }}>←</button>
                <button onClick={submitPin} style={{ flex:3, padding:"11px 0", borderRadius:8, border:"none", background:"linear-gradient(135deg,#3B82F6,#6366F1)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>{t.unlock}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stage Progress ───────────────────────────────────────────────────────────
function StageProgress({ stage, onChange, lang, th }) {
  const t = T[lang];
  const idx = stageIdx(stage);
  const isTerminal = stage === "Won" || stage === "Lost";
  const meta = stageMeta(stage);
  const mainStages = STAGES.slice(0,4);

  return (
    <div style={{ width:"100%" }}>
      <div style={{ display:"flex", alignItems:"center" }}>
        {mainStages.map((s, i) => {
          const sm = STAGE_META[i];
          const done = !isTerminal && i <= idx;
          const now = !isTerminal && i === idx;
          return (
            <div key={s} style={{ display:"flex", alignItems:"center", flex: i < 3 ? 1 : "none" }}>
              <button onClick={() => onChange(s)} title={stageLabel(s,lang)}
                style={{ width:26, height:26, borderRadius:"50%", border:`2px solid ${now ? sm.color : done ? sm.color : th.border}`,
                  background: done ? sm.color : th.surface2, color: done ? "#fff" : th.muted,
                  cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:700, flexShrink:0,
                  boxShadow: now ? `0 0 0 3px ${sm.color}33` : "none", transition:"all .2s" }}>
                {done ? "✓" : i+1}
              </button>
              {i < 3 && <div style={{ flex:1, height:2, background: !isTerminal && i < idx ? sm.color : th.border, transition:"background .3s" }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
        {t.stagesShort.map((s,i) => (
          <span key={i} style={{ fontSize:9, color: !isTerminal && i === idx ? STAGE_META[i].color : th.text2, textTransform:"uppercase", letterSpacing:".04em", fontWeight: i === idx ? 800 : 400, flex:1, textAlign: i===0?"left":i===3?"right":"center" }}>{s}</span>
        ))}
      </div>
      {isTerminal && (
        <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:5, padding:"2px 10px", borderRadius:10, background:meta.bg, color:meta.color, fontSize:11, fontWeight:700 }}>
          {stage === "Won" ? "✓" : "✕"} {stageLabel(stage, lang)}
        </div>
      )}
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ deal, onEdit, onStageChange, onDelete, lang, th }) {
  const t = T[lang];
  const meta = stageMeta(deal.stage);
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ background:th.surface, border:`1px solid ${th.border}`, borderRadius:10, overflow:"hidden", transition:"box-shadow .2s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow=`0 4px 20px ${meta.color}22`}
      onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
      <div style={{ height:3, background:`linear-gradient(90deg,${meta.color},${meta.color}44)` }} />
      <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:th.text, marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{deal.name}</div>
            <div style={{ fontSize:12, color:th.muted }}>{deal.company}</div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
            <div style={{ fontSize:16, fontWeight:800, color:meta.color, letterSpacing:"-.02em" }}>{fmtM(deal.value)}</div>
            <div style={{ fontSize:10, color:"#334155" }}>EUR</div>
          </div>
        </div>
        <div style={{ marginBottom:10 }}>
          <StageProgress stage={deal.stage} onChange={s => onStageChange(deal.id, s)} lang={lang} th={th} />
        </div>
        {/* Date strip — Design B */}
        {(() => {
          const created = deal.created ? new Date(deal.created).toLocaleDateString("en-US",{month:"short",year:"numeric"}) : null;
          const goLiveDate = deal.goLive ? new Date(deal.goLive+"-01") : null;
          const goLiveStr = goLiveDate ? goLiveDate.toLocaleDateString("en-US",{month:"short",year:"numeric"}) : null;
          const createdDate = deal.created ? new Date(deal.created) : null;
          const monthsDiff = (goLiveDate && createdDate) ? Math.round((goLiveDate - createdDate)/(1000*60*60*24*30)) : null;
          const si = SOURCES.indexOf(deal.source||"");
          const srcColor = si>=0 ? SOURCE_COLORS[si] : "#64748B";
          const srcIcon = si>=0 ? SOURCE_ICONS[si] : "❓";
          const srcLabel = si>=0 ? SOURCE_LABELS[lang][si] : (deal.source||"");
          return (
            <>
              {(created || goLiveStr) && (
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8, padding:"5px 10px", background:th.surface2, borderRadius:7, border:`1px solid ${th.border}`, fontSize:12 }}>
                  <span style={{ color:th.muted }}>📅 {created||"—"}</span>
                  <span style={{ color:th.muted, fontSize:10 }}>→</span>
                  <span style={{ color:"#3B82F6", fontWeight:600 }}>🚀 {goLiveStr||t.noGoLive}</span>
                  {monthsDiff!==null && <span style={{ marginLeft:"auto", fontSize:11, color:th.muted }}>{monthsDiff}m</span>}
                </div>
              )}
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:11, padding:"2px 8px", borderRadius:8, background:th.border, color:th.text2 }}>{deal.owner}</span>
                {deal.source && (
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:8, background:srcColor+"18", color:srcColor, border:`1px solid ${srcColor}33`, fontWeight:600 }}>{srcIcon} {srcLabel}</span>
                )}
                <span style={{ marginLeft:"auto", fontSize:11, color:th.muted }}>{deal.probability}%</span>
                <button onClick={() => setExpanded(e=>!e)} style={{ background:"none", border:"none", color:th.muted, fontSize:13, cursor:"pointer", padding:"0 2px" }}>{expanded?"▲":"▼"}</button>
              </div>
            </>
          );
        })()}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => onEdit(deal)}
            style={{ flex:1, padding:"8px 0", borderRadius:7, border:"1px solid #3B82F6", background:"#3B82F611", color:"#3B82F6", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            ✏️ {t.edit}
          </button>
          <button onClick={() => onDelete(deal.id)}
            style={{ flex:1, padding:"8px 0", borderRadius:7, border:"1px solid #EF444466", background:"#EF444411", color:"#EF4444", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            🗑 {t.delete}
          </button>
        </div>
        {expanded && (
          <div style={{ borderTop:`1px solid ${th.border}`, paddingTop:10, marginTop:10 }}>
            <div style={{ display:"flex", gap:16, marginBottom:8, fontSize:11 }}>
              <span style={{ color:th.muted }}>{t.created}: <span style={{color:th.text2}}>{deal.created}</span></span>
              <span style={{ color:th.muted }}>{t.updated}: <span style={{color:th.text2}}>{deal.updated}</span></span>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom: deal.notes ? 8 : 0 }}>
              <button onClick={() => onStageChange(deal.id,"Won")} style={{ flex:1, padding:"5px 0", borderRadius:6, border:"1px solid #10B98144", background: deal.stage==="Won"?"#10B98122":"none", color:"#10B981", fontSize:11, fontWeight:600, cursor:"pointer" }}>{t.markWon}</button>
              <button onClick={() => onStageChange(deal.id,"Lost")} style={{ flex:1, padding:"5px 0", borderRadius:6, border:"1px solid #EF444444", background: deal.stage==="Lost"?"#EF444422":"none", color:"#EF4444", fontSize:11, fontWeight:600, cursor:"pointer" }}>{t.markLost}</button>
            </div>
            {deal.stage === "Lost" && deal.lostReason && (
              <div style={{ padding:"8px 10px", borderRadius:7, background:"#EF444408", border:"1px solid #EF444433", marginBottom:6 }}>
                <div style={{ fontSize:10, color:"#EF4444", textTransform:"uppercase", letterSpacing:".05em", marginBottom:3, fontWeight:600 }}>❌ {t.lostReason}</div>
                <div style={{ fontSize:12, color:th.text }}>{deal.lostReason}</div>
              </div>
            )}
            {deal.notes && <div style={{ fontSize:12, color:th.muted, fontStyle:"italic", marginBottom:4 }}>"{deal.notes}"</div>}
            <AttachmentsPanel dealId={deal.id} th={th} t={t} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Deal Modal ───────────────────────────────────────────────────────────────
function DealModal({ deal, onSave, onClose, lang, owners, th }) {
  const t = T[lang];
  const blank = { id:null, name:"", company:"", value:"", stage:"New Lead", owner:owners[0]||"", probability:20, notes:"", goLive:"", source:"Website / Web Form", lostReason:"" };
  const [form, setForm] = useState(deal ?? blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const field = (label, key, type="text") => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
        style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1px solid ${th.border}`, background:th.inputBg, color:th.text, fontSize:14, boxSizing:"border-box", outline:"none" }} />
    </div>
  );

  return (
    <div onClick={e => e.target===e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:th.surface, borderRadius:12, padding:"28px", width:460, maxWidth:"96vw", maxHeight:"90vh", overflowY:"auto", border:`1px solid ${th.border}`, boxShadow:"0 24px 60px rgba(0,0,0,.4)" }}>
        <h3 style={{ margin:"0 0 22px", color:th.text, fontSize:18, fontWeight:700 }}>{deal ? t.editLead : t.addLead}</h3>
        {field(t.dealName, "name")}
        {field(t.company, "company")}
        {field(t.value, "value", "number")}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, color:"#4B6280", textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{t.stage}</label>
          <select value={form.stage} onChange={e => set("stage", e.target.value)}
            style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1px solid ${th.border}`, background:th.inputBg, color:th.text, fontSize:14 }}>
            {STAGES.map((s,i) => <option key={s} value={s}>{STAGE_LABELS[lang][i]}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, color:"#4B6280", textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{t.owner}</label>
          <select value={form.owner} onChange={e => set("owner", e.target.value)}
            style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1px solid ${th.border}`, background:th.inputBg, color:th.text, fontSize:14 }}>
            {owners.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{t.probability} — {form.probability}%</label>
          <input type="range" min={0} max={100} value={form.probability} onChange={e => set("probability",+e.target.value)} style={{ width:"100%", accentColor:"#3B82F6" }} />
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ display:"block", fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{t.notes}</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
            style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1px solid ${th.border}`, background:th.inputBg, color:th.text, fontSize:14, resize:"vertical", boxSizing:"border-box" }} />
        </div>
        {form.stage === "Lost" && (
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, color:"#EF4444", textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>❌ {t.lostReason}</label>
            <textarea value={form.lostReason||""} onChange={e => set("lostReason", e.target.value)} rows={2}
              placeholder={t.lostReasonPlaceholder}
              style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:"1px solid #EF444466", background:"#EF444408", color:th.text, fontSize:14, resize:"vertical", boxSizing:"border-box", outline:"none" }} />
          </div>
        )}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{t.goLive} 📅</label>
          <input type="month" value={form.goLive||""} onChange={e => set("goLive", e.target.value)}
            style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:`1px solid ${th.border}`, background:th.inputBg, color:th.text, fontSize:14, boxSizing:"border-box", outline:"none" }} />
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ display:"block", fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{t.source}</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            {SOURCES.map((s,i) => (
              <button key={s} onClick={() => set("source", s)}
                style={{ padding:"8px 10px", borderRadius:7, border:`2px solid ${form.source===s ? SOURCE_COLORS[i] : th.border}`, background: form.source===s ? SOURCE_COLORS[i]+"18" : th.inputBg, color: form.source===s ? SOURCE_COLORS[i] : th.muted, fontSize:12, fontWeight: form.source===s ? 700 : 400, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:6 }}>
                <span>{SOURCE_ICONS[i]}</span>
                <span>{SOURCE_LABELS[lang][i]}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:7, border:`1px solid ${th.border}`, background:"none", color:th.muted, fontSize:14, cursor:"pointer" }}>{t.cancel}</button>
          <button onClick={() => onSave({...form, value:+form.value})}
            style={{ padding:"8px 22px", borderRadius:7, border:"none", background:"linear-gradient(135deg,#3B82F6,#6366F1)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>{t.save}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ session, lang, setLang, onSignOut, t, theme, setTheme, th }) {
  const [curPin, setCurPin] = useState("");
  const [newPin1, setNewPin1] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [msg, setMsg] = useState(null); // {text, ok}

  const changePin = async () => {
    if (!/^\d{4}$/.test(newPin1)) { setMsg({text:t.pinInvalid, ok:false}); return; }
    if (newPin1 !== newPin2) { setMsg({text:t.pinMismatch, ok:false}); return; }
    let stored = "2026";
    try {
      const rows = await sb.query("location_pins", `?location=eq.${encodeURIComponent(session.location)}&select=pin`);
      if (rows && rows.length > 0) stored = rows[0].pin;
    } catch {}
    if (curPin !== stored) { setMsg({text:t.pinWrong, ok:false}); return; }
    try {
      await sb.update("location_pins", null, { pin: newPin1, updated_at: new Date().toISOString() });
      // Use upsert via insert with onConflict
      await fetch(`${SUPABASE_URL}/rest/v1/location_pins?location=eq.${encodeURIComponent(session.location)}`, {
        method: "PATCH",
        headers: { ...sb.headers },
        body: JSON.stringify({ pin: newPin1 })
      });
    } catch {}
    setMsg({text:t.pinChanged, ok:true}); setCurPin(""); setNewPin1(""); setNewPin2("");
  };

  const inp = (label, val, set) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{label}</label>
      <div style={{ display:"flex", gap:8 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex:1, height:48, borderRadius:8, border:`2px solid ${val.length > i ? "#3B82F6" : th.border}`, background:th.inputBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:"#3B82F6" }}>
            {val.length > i ? "●" : ""}
          </div>
        ))}
      </div>
      <input type="password" value={val} onChange={e => { set(e.target.value.replace(/\D/g,"").slice(0,4)); setMsg(null); }}
        maxLength={4} placeholder="enter PIN"
        style={{ width:"100%", marginTop:8, padding:"9px 12px", borderRadius:7, border:`1px solid ${th.border}`, background:th.inputBg, color:th.text, fontSize:16, boxSizing:"border-box", outline:"none" }} />
    </div>
  );

  return (
    <div style={{ maxWidth:480 }}>
      {/* Profile card */}
      <div style={{ background:th.surface, borderRadius:10, padding:"20px", border:`1px solid ${th.border}`, marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>{t.loggedInAs}</div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,#3B82F6,#6366F1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff" }}>
            {session.name[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:th.text }}>{session.name}</div>
            <div style={{ fontSize:13, color:th.muted }}>{LOCATION_FLAGS[session.location]} {session.location}</div>
          </div>
        </div>
        <button onClick={onSignOut} style={{ marginTop:16, padding:"7px 16px", borderRadius:7, border:"1px solid #EF444433", background:"none", color:"#EF4444", fontSize:13, cursor:"pointer" }}>{t.signOut}</button>
      </div>

      {/* Language */}
      <div style={{ background:th.surface, borderRadius:10, padding:"20px", border:`1px solid ${th.border}`, marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>{t.language}</div>
        <div style={{ display:"flex", gap:8 }}>
          {["en","de"].map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ padding:"8px 20px", borderRadius:7, border:`1px solid ${lang===l?"#3B82F6":th.border}`, background: lang===l?"#3B82F622":"none", color: lang===l?"#3B82F6":th.muted, fontSize:14, cursor:"pointer", fontWeight: lang===l?700:400 }}>
              {l === "en" ? "🇬🇧 English" : "🇩🇪 Deutsch"}
            </button>
          ))}
        </div>
      </div>

      {/* Theme toggle */}
      <div style={{ background:th.surface, borderRadius:10, padding:"20px", border:`1px solid ${th.border}`, marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>{t.themeLabel}</div>
        <div style={{ display:"flex", gap:8 }}>
          {["light","dark"].map(m => (
            <button key={m} onClick={() => setTheme(m)}
              style={{ flex:1, padding:"12px 0", borderRadius:8, border:`2px solid ${theme===m?"#3B82F6":th.border}`, background: theme===m?"#3B82F622":th.surface2, color: theme===m?"#3B82F6":th.muted, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all .15s" }}>
              {m === "light" ? t.themeLight : t.themeDark}
            </button>
          ))}
        </div>
      </div>

      {/* Change PIN */}
      <div style={{ background:th.surface, borderRadius:10, padding:"20px", border:`1px solid ${th.border}` }}>
        <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:16 }}>{t.changePin}</div>
        {inp(t.currentPin, curPin, setCurPin)}
        {inp(t.newPin, newPin1, setNewPin1)}
        {inp(t.confirmPin, newPin2, setNewPin2)}
        {msg && <div style={{ fontSize:12, color: msg.ok?"#10B981":"#EF4444", marginBottom:10 }}>{msg.text}</div>}
        <button onClick={changePin}
          style={{ padding:"9px 22px", borderRadius:7, border:"none", background:"linear-gradient(135deg,#3B82F6,#6366F1)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>{t.changePin}</button>
      </div>
    </div>
  );
}



// ─── Timeline View ────────────────────────────────────────────────────────────
function TimelineView({ deals, th, t, lang }) {
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();

  // Build 18-month window: 2 past + current + 15 future
  const months = [];
  for (let i = -2; i <= 15; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label: MONTH_NAMES[d.getMonth()],
      year: d.getFullYear(),
      isCurrent: i === 0,
      isPast: i < 0,
    });
  }

  // Group deals by goLive month
  const withDate = deals.filter(d => d.goLive);
  const withoutDate = deals.filter(d => !d.goLive);

  const byMonth = {};
  months.forEach(m => { byMonth[m.key] = []; });
  withDate.forEach(d => {
    if (byMonth[d.goLive] !== undefined) byMonth[d.goLive].push(d);
  });

  // Outside window
  const outside = withDate.filter(d => !byMonth.hasOwnProperty(d.goLive));

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:"linear-gradient(180deg,#3B82F6,#10B981)" }} />
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:th.text }}>📅 {t.timeline}</div>
          <div style={{ fontSize:12, color:th.muted }}>{withDate.length} leads with Go Live date · {withoutDate.length} without</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position:"relative" }}>
        {/* Vertical line */}
        <div style={{ position:"absolute", left:90, top:0, bottom:0, width:2, background:th.border, zIndex:0 }} />

        {months.map((m, mi) => {
          const items = byMonth[m.key] || [];
          const isNow = m.isCurrent;
          return (
            <div key={m.key} style={{ display:"flex", gap:0, marginBottom: items.length > 0 ? 16 : 4, position:"relative", zIndex:1 }}>
              {/* Month label */}
              <div style={{ width:90, flexShrink:0, paddingTop:items.length>0?4:0, paddingRight:16, textAlign:"right" }}>
                <div style={{ fontSize: isNow ? 13 : 11, fontWeight: isNow ? 800 : 500, color: isNow ? "#3B82F6" : m.isPast ? th.muted : th.text2 }}>
                  {m.label}
                </div>
                {(mi === 0 || m.label === "Jan") && (
                  <div style={{ fontSize:9, color:th.muted }}>{m.year}</div>
                )}
              </div>

              {/* Dot */}
              <div style={{ width:12, height:12, borderRadius:"50%", flexShrink:0, marginTop: items.length>0?6:4,
                background: isNow ? "#3B82F6" : items.length > 0 ? "#10B981" : th.border,
                border: isNow ? "3px solid #3B82F644" : "2px solid " + (items.length>0?"#10B98166":th.border),
                boxShadow: isNow ? "0 0 0 4px #3B82F622" : "none",
                zIndex:2, position:"relative" }} />

              {/* Cards */}
              <div style={{ flex:1, paddingLeft:14 }}>
                {isNow && items.length === 0 && (
                  <div style={{ fontSize:11, color:"#3B82F6", fontWeight:600, paddingTop:4 }}>← Today</div>
                )}
                {items.map(d => {
                  const meta = STAGE_META[STAGES.indexOf(d.stage)] || STAGE_META[0];
                  return (
                    <div key={d.id} style={{ background:th.surface, borderRadius:8, padding:"10px 14px", marginBottom:6, border:`1px solid ${meta.color}44`, borderLeft:`3px solid ${meta.color}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:th.text, marginBottom:1 }}>{d.name}</div>
                          <div style={{ fontSize:11, color:th.muted }}>{d.company}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0, marginLeft:10 }}>
                          <div style={{ fontSize:13, fontWeight:800, color:meta.color }}>{fmtM(d.value)} EUR</div>
                          <span style={{ fontSize:10, padding:"1px 6px", borderRadius:6, background:meta.bg, color:meta.color, fontWeight:600 }}>{STAGE_LABELS["en"][STAGES.indexOf(d.stage)]}</span>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, marginTop:6, alignItems:"center" }}>
                        <span style={{ fontSize:10, padding:"1px 7px", borderRadius:6, background:th.border, color:th.text2 }}>{d.owner}</span>
                        <span style={{ fontSize:10, color:th.muted }}>{d.probability}% likely</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Without date */}
      {withoutDate.length > 0 && (
        <div style={{ marginTop:24, background:th.surface, borderRadius:10, padding:"16px 18px", border:`1px solid ${th.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:12 }}>⚠️ No Go Live date set ({withoutDate.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {withoutDate.map(d => {
              const meta = STAGE_META[STAGES.indexOf(d.stage)] || STAGE_META[0];
              return (
                <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:7, background:th.surface2, border:`1px solid ${th.border}` }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:meta.color, flexShrink:0 }} />
                  <div style={{ flex:1, fontSize:13, color:th.text, fontWeight:500 }}>{d.name}</div>
                  <div style={{ fontSize:11, color:th.muted }}>{d.company}</div>
                  <span style={{ fontSize:10, padding:"1px 7px", borderRadius:6, background:meta.bg, color:meta.color, fontWeight:600 }}>{STAGE_LABELS["en"][STAGES.indexOf(d.stage)]}</span>
                  <div style={{ fontSize:12, fontWeight:700, color:meta.color }}>{fmtM(d.value)} EUR</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outside window */}
      {outside.length > 0 && (
        <div style={{ marginTop:12, background:th.surface, borderRadius:10, padding:"16px 18px", border:`1px solid ${th.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:12 }}>📆 Beyond 15 months ({outside.length})</div>
          {outside.map(d => {
            const meta = STAGE_META[STAGES.indexOf(d.stage)] || STAGE_META[0];
            return (
              <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:7, background:th.surface2, border:`1px solid ${th.border}`, marginBottom:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:meta.color, flexShrink:0 }} />
                <div style={{ flex:1, fontSize:13, color:th.text, fontWeight:500 }}>{d.name}</div>
                <div style={{ fontSize:11, color:"#3B82F6", fontWeight:600 }}>📅 {new Date(d.goLive+"-01").toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>
                <div style={{ fontSize:12, fontWeight:700, color:meta.color }}>{fmtM(d.value)} EUR</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Group Dashboard ──────────────────────────────────────────────────────────
function GroupDashboard({ th, t, lang }) {
  const [allData, setAllData] = useState({});
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [trendMetric, setTrendMetric] = useState("pipeline"); // pipeline | won | leads
  const [trendScope, setTrendScope] = useState("global");     // global | <location>

  useEffect(() => {
    (async () => {
      const result = {};
      for (const loc of LOCATIONS) {
        try {
          const rows = await sb.query("deals", `?location=eq.${encodeURIComponent(loc)}&order=updated_at.desc`);
          result[loc] = rows.map(rowToDeal);
        } catch { result[loc] = []; }
      }
      setAllData(result);
      setLoadingGroup(false);
    })();
  }, []);

  if (loadingGroup) return (
    <div style={{ textAlign:"center", padding:"60px 0", color:th.muted, fontSize:14 }}>⏳ {t.loading}</div>
  );

  const allDeals = Object.values(allData).flat();
  const LOC_COLORS = ["#3B82F6","#10B981","#F59E0B","#6366F1","#EC4899","#EF4444"];

  // ── Month helpers ────────────────────────────────────────────────────────────
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // Build last 12 months list
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, short: MONTH_NAMES[d.getMonth()] });
  }

  const getMonthKey = (dateStr) => dateStr ? dateStr.slice(0,7) : "";

  // For a set of deals, compute monthly series value
  const monthSeries = (deals, metric) => months.map(m => {
    const md = deals.filter(d => getMonthKey(d.updated) === m.key);
    if (metric === "pipeline") return md.filter(d=>d.stage!=="Won"&&d.stage!=="Lost").reduce((s,d)=>s+d.value,0);
    if (metric === "won") return md.filter(d=>d.stage==="Won").reduce((s,d)=>s+d.value,0);
    if (metric === "leads") return md.length;
    return 0;
  });

  // ── SVG Line Chart ───────────────────────────────────────────────────────────
  const LineChart = ({ series, th, metric }) => {
    // series: [{label, color, values:[]}]
    const W = 600, H = 160, PL = 54, PR = 12, PT = 12, PB = 32;
    const chartW = W - PL - PR, chartH = H - PT - PB;
    const allVals = series.flatMap(s => s.values);
    const maxV = Math.max(...allVals, 1);
    const minV = 0;
    const xStep = chartW / (months.length - 1);

    const toX = (i) => PL + i * xStep;
    const toY = (v) => PT + chartH - ((v - minV) / (maxV - minV)) * chartH;

    const pathD = (values) => values.map((v,i) => `${i===0?"M":"L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
    const areaD = (values) => pathD(values) + ` L${toX(values.length-1).toFixed(1)},${(PT+chartH).toFixed(1)} L${PL},${(PT+chartH).toFixed(1)} Z`;

    // Y grid lines
    const gridCount = 4;
    const gridVals = Array.from({length:gridCount+1},(_,i)=>Math.round(maxV*i/gridCount));

    const fmtV = (v) => metric==="leads" ? v : (v>=1000?Math.round(v/1000)+"k":v);

    return (
      <div style={{ overflowX:"auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", minWidth:320, height:"auto", display:"block" }}>
          {/* Grid lines */}
          {gridVals.map((v,i)=>(
            <g key={i}>
              <line x1={PL} y1={toY(v)} x2={W-PR} y2={toY(v)} stroke={th.border} strokeWidth={1} strokeDasharray="3,4" />
              <text x={PL-6} y={toY(v)+4} textAnchor="end" fontSize={9} fill={th.muted}>{fmtV(v)}</text>
            </g>
          ))}
          {/* X axis labels — every other month */}
          {months.map((m,i)=> i%2===0 && (
            <text key={i} x={toX(i)} y={H-6} textAnchor="middle" fontSize={9} fill={th.muted}>{m.short}</text>
          ))}
          {/* Area fills */}
          {series.map((s,si)=>(
            <path key={si+"a"} d={areaD(s.values)} fill={s.color} opacity={0.08} />
          ))}
          {/* Lines */}
          {series.map((s,si)=>(
            <path key={si+"l"} d={pathD(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {/* Dots on last point */}
          {series.map((s,si)=>{
            const lastV = s.values[s.values.length-1];
            return <circle key={si+"d"} cx={toX(s.values.length-1)} cy={toY(lastV)} r={4} fill={s.color} stroke={th.surface} strokeWidth={2} />;
          })}
        </svg>
      </div>
    );
  };

  // ── Compute stats ────────────────────────────────────────────────────────────
  const locStats = LOCATIONS.map((loc,li) => {
    const ds = allData[loc] || [];
    const active = ds.filter(d => d.stage !== "Won" && d.stage !== "Lost");
    const won = ds.filter(d => d.stage === "Won");
    const lost = ds.filter(d => d.stage === "Lost");
    return {
      loc, li,
      total: ds.length,
      pipeline: active.reduce((s,d)=>s+d.value,0),
      wonVal: won.reduce((s,d)=>s+d.value,0),
      weighted: active.reduce((s,d)=>s+d.value*d.probability/100,0),
      convRate: (won.length+lost.length) > 0 ? Math.round(won.length/(won.length+lost.length)*100) : 0,
      byStage: STAGES.map(s => ds.filter(d=>d.stage===s).length),
      monthlySeries: monthSeries(ds, trendMetric),
    };
  });

  const gActive = allDeals.filter(d=>d.stage!=="Won"&&d.stage!=="Lost");
  const gWon = allDeals.filter(d=>d.stage==="Won");
  const gLost = allDeals.filter(d=>d.stage==="Lost");
  const gPipeline = gActive.reduce((s,d)=>s+d.value,0);
  const gWonVal = gWon.reduce((s,d)=>s+d.value,0);
  const gWeighted = gActive.reduce((s,d)=>s+d.value*d.probability/100,0);
  const gConv = (gWon.length+gLost.length)>0 ? Math.round(gWon.length/(gWon.length+gLost.length)*100) : 0;
  const gByStage = STAGES.map(s => allDeals.filter(d=>d.stage===s).length);
  const maxPipeline = Math.max(...locStats.map(l=>l.pipeline),1);

  // Trend series to show
  const globalSeries = [{ label:"All Locations", color:"#3B82F6", values: monthSeries(allDeals, trendMetric) }];
  const allLocSeries = locStats.map((ls,i) => ({ label:ls.loc, color:LOC_COLORS[i], values:ls.monthlySeries }));
  const selectedSeries = trendScope === "global" ? globalSeries
    : allLocSeries.filter(s => s.label === trendScope);

  const METRIC_OPTS = [
    { id:"pipeline", label:"Active Pipeline" },
    { id:"won", label:"Won Value" },
    { id:"leads", label:"Lead Count" },
  ];

  const card = (label, val, sub, color) => (
    <div style={{ background:th.surface, borderRadius:10, padding:"16px 18px", border:`1px solid ${color}30`, flex:"1 1 150px" }}>
      <div style={{ fontSize:10, color:th.muted, textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color, letterSpacing:"-.02em", marginBottom:3 }}>{val}</div>
      <div style={{ fontSize:11, color:th.muted }}>{sub}</div>
    </div>
  );

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:"linear-gradient(180deg,#3B82F6,#6366F1)" }} />
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:th.text, letterSpacing:"-.02em" }}>🌍 {t.groupTitle}</div>
          <div style={{ fontSize:12, color:th.muted }}>{t.groupSub} · {allDeals.length} leads total</div>
        </div>
      </div>

      {/* ── Global KPIs ── */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
        {card("Active Pipeline", `${fmtM(gPipeline)} EUR`, `${gActive.length} open leads`, "#3B82F6")}
        {card("Revenue Won", `${fmtM(gWonVal)} EUR`, `${gWon.length} deals`, "#10B981")}
        {card("Weighted Forecast", `${fmtM(Math.round(gWeighted))} EUR`, "by probability", "#F59E0B")}
        {card("Conversion Rate", `${gConv}%`, `${gWon.length} won / ${gLost.length} lost`, "#6366F1")}
        {card("Total Leads", allDeals.length, `${LOCATIONS.length} locations`, "#EC4899")}
      </div>

      {/* ── Global Stage Counts ── */}
      <div style={{ background:th.surface, borderRadius:10, padding:"18px", border:`1px solid ${th.border}`, marginBottom:18 }}>
        <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>Global Stage Distribution</div>
        <div style={{ display:"flex", gap:6 }}>
          {STAGES.map((s,i) => (
            <div key={s} style={{ flex:1, textAlign:"center", padding:"10px 4px", borderRadius:8, background:STAGE_META[i].bg, border:`1px solid ${STAGE_META[i].color}33` }}>
              <div style={{ fontSize:20, fontWeight:800, color:STAGE_META[i].color }}>{gByStage[i]}</div>
              <div style={{ fontSize:9, color:STAGE_META[i].color, textTransform:"uppercase", marginTop:3, fontWeight:600 }}>{STAGE_LABELS["en"][i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Monthly Trend Chart ── */}
      <div style={{ background:th.surface, borderRadius:12, border:`1px solid ${th.border}`, marginBottom:18, overflow:"hidden" }}>
        {/* Chart header */}
        <div style={{ padding:"16px 18px 12px", borderBottom:`1px solid ${th.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:4, height:20, borderRadius:2, background:"linear-gradient(180deg,#3B82F6,#10B981)" }} />
            <span style={{ fontSize:14, fontWeight:700, color:th.text }}>Monthly Trend</span>
            <span style={{ fontSize:11, color:th.muted }}>— last 12 months</span>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {/* Metric selector */}
            <div style={{ display:"flex", borderRadius:7, overflow:"hidden", border:`1px solid ${th.border}` }}>
              {METRIC_OPTS.map(m => (
                <button key={m.id} onClick={() => setTrendMetric(m.id)}
                  style={{ padding:"5px 11px", border:"none", background: trendMetric===m.id?"#3B82F6":th.surface2, color: trendMetric===m.id?"#fff":th.muted, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scope selector */}
        <div style={{ padding:"10px 18px", borderBottom:`1px solid ${th.border}`, display:"flex", gap:6, flexWrap:"wrap" }}>
          <button onClick={()=>setTrendScope("global")}
            style={{ padding:"4px 12px", borderRadius:6, border:`1px solid ${trendScope==="global"?"#3B82F6":th.border}`, background:trendScope==="global"?"#3B82F622":th.surface2, color:trendScope==="global"?"#3B82F6":th.muted, fontSize:11, fontWeight:600, cursor:"pointer" }}>
            🌍 All
          </button>
          {LOCATIONS.map((loc,i) => (
            <button key={loc} onClick={()=>setTrendScope(loc)}
              style={{ padding:"4px 12px", borderRadius:6, border:`1px solid ${trendScope===loc?LOC_COLORS[i]:th.border}`, background:trendScope===loc?LOC_COLORS[i]+"22":th.surface2, color:trendScope===loc?LOC_COLORS[i]:th.muted, fontSize:11, fontWeight:600, cursor:"pointer" }}>
              {LOCATION_FLAGS[loc]} {loc}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div style={{ padding:"16px 18px 8px" }}>
          <LineChart series={selectedSeries} th={th} metric={trendMetric} />
        </div>

        {/* Legend */}
        <div style={{ padding:"8px 18px 16px", display:"flex", gap:14, flexWrap:"wrap" }}>
          {selectedSeries.map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:20, height:3, borderRadius:2, background:s.color }} />
              <span style={{ fontSize:11, color:th.text2 }}>{LOCATION_FLAGS[s.label] || ""} {s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:"linear-gradient(180deg,#F59E0B,#EC4899)" }} />
        <div style={{ fontSize:15, fontWeight:700, color:th.text }}>Breakdown by Location</div>
      </div>

      {/* ── Per-location cards ── */}
      {locStats.map((ls) => {
        const locColor = LOC_COLORS[ls.li];
        return (
          <div key={ls.loc} style={{ background:th.surface, borderRadius:12, border:`1px solid ${th.border}`, marginBottom:14, overflow:"hidden" }}>
            {/* Header */}
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${th.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:th.surface2 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:22 }}>{LOCATION_FLAGS[ls.loc]}</span>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:th.text }}>{ls.loc}</div>
                  <div style={{ fontSize:11, color:th.muted }}>{ls.total} leads</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:14 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:th.muted }}>Pipeline</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#3B82F6" }}>{fmtM(ls.pipeline)} EUR</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:th.muted }}>Won</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#10B981" }}>{fmtM(ls.wonVal)} EUR</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:th.muted }}>Conv.</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#6366F1" }}>{ls.convRate}%</div>
                </div>
              </div>
            </div>

            <div style={{ padding:"14px 18px" }}>
              {/* Mini monthly sparkline for this location */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:th.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Monthly {METRIC_OPTS.find(m=>m.id===trendMetric)?.label} (last 12 months)</div>
                <LineChart series={[{label:ls.loc, color:locColor, values:ls.monthlySeries}]} th={th} metric={trendMetric} />
              </div>

              {/* Pipeline share bar */}
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:th.muted, marginBottom:3 }}>
                  <span>Pipeline share of global</span>
                  <span>{gPipeline>0?Math.round(ls.pipeline/gPipeline*100):0}%</span>
                </div>
                <div style={{ height:6, borderRadius:3, background:th.border }}>
                  <div style={{ height:"100%", width: gPipeline>0?(ls.pipeline/gPipeline*100)+"%":"0%", borderRadius:3, background:`linear-gradient(90deg,${locColor},${locColor}88)`, transition:"width .6s ease" }} />
                </div>
              </div>

              {/* Stage pills */}
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {STAGES.map((s,i) => ls.byStage[i] > 0 && (
                  <span key={s} style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:STAGE_META[i].bg, color:STAGE_META[i].color, fontWeight:600 }}>
                    {ls.byStage[i]} {STAGE_LABELS["en"][i]}
                  </span>
                ))}
                {ls.total === 0 && <span style={{ fontSize:11, color:th.muted }}>{t.noData}</span>}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Pipeline Ranking ── */}
      <div style={{ background:th.surface, borderRadius:10, padding:"18px", border:`1px solid ${th.border}`, marginTop:4 }}>
        <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>Pipeline Ranking</div>
        {[...locStats].sort((a,b)=>b.pipeline-a.pipeline).map((ls,i) => (
          <div key={ls.loc} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:22, fontSize:12, color:th.muted, textAlign:"center", fontWeight:700 }}>#{i+1}</div>
            <span style={{ fontSize:16 }}>{LOCATION_FLAGS[ls.loc]}</span>
            <div style={{ width:110, fontSize:12, color:th.text, fontWeight:500, flexShrink:0 }}>{ls.loc}</div>
            <div style={{ flex:1, height:18, borderRadius:4, background:th.border, overflow:"hidden", position:"relative" }}>
              <div style={{ height:"100%", width:maxPipeline>0?(ls.pipeline/maxPipeline*100)+"%":"0%", background:LOC_COLORS[LOCATIONS.indexOf(ls.loc)]+"BB", borderRadius:4, transition:"width .6s ease" }} />
              <span style={{ position:"absolute", left:8, top:2, fontSize:10, color:th.text, fontWeight:600 }}>{fmtM(ls.pipeline)} EUR</span>
            </div>
            <div style={{ width:36, textAlign:"right", fontSize:11, color:th.muted }}>{ls.total}×</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Attachments Panel ────────────────────────────────────────────────────────
function AttachmentsPanel({ dealId, th, t }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);

  const load = async () => {
    if (!dealId) return;
    try {
      const rows = await sb.query("attachments", `?deal_id=eq.${dealId}&order=uploaded_at.desc`);
      setFiles(rows || []);
    } catch(e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, [dealId]);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setErr("Max file size is 10 MB"); return; }
    setUploading(true); setErr(null);
    try {
      const path = `${dealId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      await sb.uploadFile(path, file);
      await sb.insert("attachments", {
        deal_id: dealId, file_name: file.name,
        file_size: file.size, file_type: file.type, storage_path: path
      });
      await load();
    } catch(e) { setErr("Upload failed: "+e.message); }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const open = async (att) => {
    try {
      const url = await sb.signedUrl(att.storage_path);
      window.open(url, "_blank");
    } catch(e) { setErr("Cannot open file: "+e.message); }
  };

  const remove = async (att) => {
    if (!confirm(`Delete "${att.file_name}"?`)) return;
    try {
      await sb.deleteFile(att.storage_path);
      await sb.delete("attachments", att.id);
      setFiles(f => f.filter(x => x.id !== att.id));
    } catch(e) { setErr(e.message); }
  };

  const fmtSize = (b) => b > 1024*1024 ? (b/1024/1024).toFixed(1)+" MB" : b > 1024 ? (b/1024).toFixed(0)+" KB" : b+" B";
  const fileIcon = (type) => {
    if (type?.includes("pdf")) return "📄";
    if (type?.includes("sheet") || type?.includes("excel") || type?.includes("csv")) return "📊";
    if (type?.includes("image")) return "🖼️";
    if (type?.includes("word")) return "📝";
    return "📎";
  };

  return (
    <div style={{ marginTop:10, borderTop:`1px solid ${th.border}`, paddingTop:10 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:11, color:th.muted, textTransform:"uppercase", letterSpacing:".05em", fontWeight:600 }}>
          📎 Attachments {files.length > 0 ? `(${files.length})` : ""}
        </span>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          style={{ fontSize:11, padding:"3px 10px", borderRadius:6, border:`1px solid ${th.border}`, background:"none", color:"#3B82F6", cursor:"pointer", fontWeight:600 }}>
          {uploading ? "⏳ Uploading…" : "+ Add file"}
        </button>
        <input ref={inputRef} type="file" onChange={upload} style={{ display:"none" }}
          accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg" />
      </div>
      {err && <div style={{ fontSize:11, color:"#EF4444", marginBottom:6 }}>{err}</div>}
      {files.length === 0 && !uploading && (
        <div style={{ fontSize:12, color:th.muted, fontStyle:"italic" }}>No attachments yet</div>
      )}
      {files.map(att => (
        <div key={att.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:7, background:th.surface2, border:`1px solid ${th.border}`, marginBottom:5 }}>
          <span style={{ fontSize:16 }}>{fileIcon(att.file_type)}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:th.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{att.file_name}</div>
            <div style={{ fontSize:10, color:th.muted }}>{fmtSize(att.file_size)} · {new Date(att.uploaded_at).toLocaleDateString()}</div>
          </div>
          <button onClick={() => open(att)}
            style={{ fontSize:11, padding:"3px 9px", borderRadius:5, border:`1px solid #3B82F644`, background:"#3B82F611", color:"#3B82F6", cursor:"pointer", fontWeight:600, flexShrink:0 }}>
            Open
          </button>
          <button onClick={() => remove(att)}
            style={{ fontSize:11, padding:"3px 8px", borderRadius:5, border:`1px solid #EF444433`, background:"none", color:"#EF4444", cursor:"pointer", flexShrink:0 }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── SparkBar ─────────────────────────────────────────────────────────────────
function SparkBar({ values, colors, maxVal }) {
  return (
    <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:52 }}>
      {values.map((v,i) => (
        <div key={i} title={`${STAGES[i]}: ${fmtM(v)} EUR`}
          style={{ flex:1, borderRadius:"3px 3px 0 0", background:colors[i], height: maxVal>0 ? Math.max(4,(v/maxVal)*52) : 4, transition:"height .5s ease" }} />
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null); // { location, name, lang }
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("light");
  const th = THEMES[theme];
  const [deals, setDeals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("leads");
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("All");
  const [filterOwner, setFilterOwner] = useState("All");
  const [toast, setToast] = useState(null);

  const t = T[lang];

  // ── Supabase data loading ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    setLoaded(false);
    (async () => {
      try {
        const rows = await sb.query("deals", `?location=eq.${encodeURIComponent(session.location)}&order=updated_at.desc`);
        setDeals(rows.length > 0 ? rows.map(rowToDeal) : []);
      } catch (e) {
        console.error("Load error:", e);
        setDeals([]);
      }
      setLoaded(true);
    })();
  }, [session]);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); };

  const saveDeal = useCallback(async (form) => {
    try {
      if (form.id) {
        const row = dealToRow(form, session.location);
        await sb.update("deals", form.id, row);
        setDeals(ds => ds.map(d => d.id===form.id ? {...form, updated:today()} : d));
        showToast(t.edit+" ✓");
      } else {
        const row = { ...dealToRow(form, session.location), created_at: today() };
        const result = await sb.insert("deals", row);
        const newDeal = rowToDeal(result[0]);
        setDeals(ds => [newDeal, ...ds]);
        showToast(t.newLead+" ✓");
      }
    } catch(e) { showToast("Error saving: "+e.message); }
    setModal(null);
  }, [session, lang]);

  const changeStage = useCallback(async (id, stage) => {
    const prob = stage==="Won"?100:stage==="Lost"?0:undefined;
    const update = { stage, updated_at: today(), ...(prob!==undefined ? {probability:prob} : {}) };
    try {
      await sb.update("deals", id, update);
      setDeals(ds => ds.map(d => d.id===id ? {...d, stage, updated:today(), ...(prob!==undefined?{probability:prob}:{})} : d));
      showToast(`→ ${stageLabel(stage, lang)}`);
    } catch(e) { showToast("Error: "+e.message); }
  }, [lang]);

  const deleteDeal = useCallback(async (id) => {
    if (!confirm(t.delete + "?")) return;
    try {
      await sb.delete("deals", id);
      setDeals(ds => ds.filter(d => d.id!==id));
    } catch(e) { showToast("Error: "+e.message); }
  }, [lang]);

  const owners = session ? [...new Set([session.name, ...deals.map(d=>d.owner).filter(Boolean)])] : [session?.name||''].filter(Boolean);

  // Filtered
  const filtered = deals.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.name.toLowerCase().includes(q) || d.company.toLowerCase().includes(q))
      && (filterStage === "All" || d.stage === filterStage)
      && (filterOwner === "All" || d.owner === filterOwner);
  });

  // Dashboard (always EN labels)
  const active = deals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
  const won = deals.filter(d => d.stage === "Won");
  const lost = deals.filter(d => d.stage === "Lost");
  const totalPipeline = active.reduce((s,d)=>s+d.value,0);
  const totalWon = won.reduce((s,d)=>s+d.value,0);
  const weighted = active.reduce((s,d)=>s+d.value*d.probability/100,0);
  const convRate = (won.length+lost.length) > 0 ? Math.round(won.length/(won.length+lost.length)*100) : 0;
  const byStageVal = STAGES.map(s => deals.filter(d=>d.stage===s).reduce((sum,d)=>sum+d.value,0));
  const maxStageVal = Math.max(...byStageVal,1);
  const ownerNames = [...new Set(deals.map(d=>d.owner))];
  const byOwner = ownerNames.map(o=>({ name:o, value:deals.filter(d=>d.owner===o).reduce((s,d)=>s+d.value,0) })).sort((a,b)=>b.value-a.value);
  const maxOwnerVal = Math.max(...byOwner.map(o=>o.value),1);

  if (!session) return <LoginScreen onLogin={s=>{setSession(s); setLang(s.lang);}} lang={lang} setLang={setLang} />;

  const NAV = [
    { id:"leads", label: t.leads },
    { id:"dashboard", label: t.dashboard },
    { id:"timeline", label: t.timeline },
    { id:"group", label: t.groupDash },
    { id:"settings", label: t.settings },
  ];

  return (
    <div style={{ minHeight:"100vh", background:th.bg, color:th.text, fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* Toast */}
      {toast && <div style={{ position:"fixed", bottom:24, right:24, background:th.toastBg, color:"#E2E8F0", padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:500, zIndex:999, boxShadow:"0 8px 24px rgba(0,0,0,.4)", border:"1px solid #3B82F6" }}>{toast}</div>}

      {/* Header */}
      <header style={{ background:th.headerBg, borderBottom:`1px solid ${th.border}`, padding:"0 20px", display:"flex", alignItems:"center", gap:16, height:52, position:"sticky", top:0, zIndex:50, boxShadow: theme==="light"?"0 1px 3px rgba(0,0,0,.08)":"none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg,#3B82F6,#6366F1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⬡</div>
          <span style={{ fontWeight:800, fontSize:15, letterSpacing:"-.03em" }}>CRM<span style={{color:"#3B82F6"}}>flow</span></span>
        </div>
        <div style={{ fontSize:12, color:th.muted, borderLeft:`1px solid ${th.border}`, paddingLeft:12 }}>
          {LOCATION_FLAGS[session.location]} <span style={{color:th.text2}}>{session.location}</span>
        </div>
        <nav style={{ display:"flex", gap:2 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setView(n.id)}
              style={{ padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:12, fontWeight:500,
                background: view===n.id?th.navActive:"none", color: view===n.id?"#3B82F6":th.muted }}>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ flex:1 }} />
        {/* Lang toggle */}
        <div style={{ display:"flex", gap:4 }}>
          {["en","de"].map(l=>(
            <button key={l} onClick={()=>setLang(l)}
              style={{ padding:"3px 9px", borderRadius:5, border:`1px solid ${lang===l?"#3B82F6":th.border}`, background: lang===l?"#3B82F622":"none", color: lang===l?"#3B82F6":th.muted, fontSize:11, cursor:"pointer", fontWeight:600 }}>
              {l==="en"?"EN":"DE"}
            </button>
          ))}
        </div>
        <button onClick={()=>exportCSV(deals,session.location)}
          style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #1E3A5F", background:"none", color:"#64748B", fontSize:12, cursor:"pointer" }}>
          ↓ CSV
        </button>
        <button onClick={()=>setModal("new")}
          style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"linear-gradient(135deg,#3B82F6,#6366F1)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          + {t.newLead}
        </button>
      </header>

      <main style={{ padding:"20px 22px", maxWidth:1280, margin:"0 auto" }}>

        {/* ── LEADS ── */}
        {view === "leads" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}
                style={{ flex:"2 1 180px", padding:"8px 12px", borderRadius:7, border:`1px solid ${th.border}`, background:th.surface, color:th.text, fontSize:13, outline:"none" }} />
              <select value={filterStage} onChange={e=>setFilterStage(e.target.value)}
                style={{ padding:"8px 10px", borderRadius:7, border:`1px solid ${th.border}`, background:th.surface, color:th.text, fontSize:13 }}>
                <option value="All">{t.allStages}</option>
                {STAGES.map((s,i) => <option key={s} value={s}>{STAGE_LABELS[lang][i]}</option>)}
              </select>
              <select value={filterOwner} onChange={e=>setFilterOwner(e.target.value)}
                style={{ padding:"8px 10px", borderRadius:7, border:`1px solid ${th.border}`, background:th.surface, color:th.text, fontSize:13 }}>
                <option value="All">{t.allOwners}</option>
                {[...new Set(deals.map(d=>d.owner))].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            {/* Summary */}
            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
              {[
                {l:t.showing, v:`${filtered.length}`},
                {l:t.totalValue, v:`${fmtM(filtered.reduce((s,d)=>s+d.value,0))} EUR`},
                {l:t.weighted, v:`${fmtM(Math.round(filtered.filter(d=>d.stage!=="Won"&&d.stage!=="Lost").reduce((s,d)=>s+d.value*d.probability/100,0)))} EUR`},
              ].map(k=>(
                <div key={k.l} style={{ padding:"5px 12px", background:th.surface, borderRadius:7, border:`1px solid ${th.border}`, fontSize:12 }}>
                  <span style={{color:th.muted}}>{k.l}: </span><span style={{color:th.text2,fontWeight:600}}>{k.v}</span>
                </div>
              ))}
            </div>
            {/* Big Add Lead button */}
            <button onClick={()=>setModal("new")}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#3B82F6";e.currentTarget.style.background="#3B82F611";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.background=th.surface;}}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, width:"100%", padding:"16px 20px", borderRadius:10, border:`2px dashed ${th.border}`, background:th.surface, color:"#3B82F6", fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:16, transition:"all .2s", boxSizing:"border-box" }}>
              <span style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg,#3B82F6,#6366F1)", display:"inline-flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:20, fontWeight:800, lineHeight:1 }}>+</span>
              {t.newLead}
            </button>
            {filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:th.muted, fontSize:15 }}>
                {t.noLeads} <button onClick={()=>{setSearch("");setFilterStage("All");setFilterOwner("All");}} style={{ background:"none", border:"none", color:"#3B82F6", cursor:"pointer", fontSize:15 }}>{t.clearFilters}</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
                {filtered.map(d=><LeadCard key={d.id} deal={d} onEdit={setModal} onStageChange={changeStage} onDelete={deleteDeal} lang={lang} th={th} />)}
              </div>
            )}
          </>
        )}

        {/* ── DASHBOARD (always EN) ── */}
        {view === "dashboard" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12, marginBottom:18 }}>
              {[
                {label:"Active Pipeline", val:`${fmtM(totalPipeline)} EUR`, sub:`${active.length} open leads`, color:"#3B82F6"},
                {label:"Revenue Won", val:`${fmtM(totalWon)} EUR`, sub:`${won.length} closed deals`, color:"#10B981"},
                {label:"Weighted Forecast", val:`${fmtM(Math.round(weighted))} EUR`, sub:"by probability", color:"#F59E0B"},
                {label:"Conversion Rate", val:`${convRate}%`, sub:`${won.length} won / ${lost.length} lost`, color:"#6366F1"},
                {label:"Total Leads", val:deals.length, sub:"all stages", color:"#EC4899"},
              ].map(k=>(
                <div key={k.label} style={{ background:th.surface, borderRadius:10, padding:"16px 18px", border:`1px solid ${k.color}30` }}>
                  <div style={{ fontSize:10, color:th.muted, textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 }}>{k.label}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:k.color, letterSpacing:"-.02em", marginBottom:4 }}>{k.val}</div>
                  <div style={{ fontSize:11, color:th.muted }}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div style={{ background:th.surface, borderRadius:10, padding:"18px", border:`1px solid ${th.border}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>Value by Stage</div>
                <SparkBar values={byStageVal} colors={STAGE_META.map(m=>m.color)} maxVal={maxStageVal} />
                <div style={{ display:"flex", marginTop:6 }}>
                  {STAGES.map((s,i)=>(
                    <div key={s} style={{ flex:1, textAlign:"center" }}>
                      <div style={{ fontSize:8, color:STAGE_META[i].color, textTransform:"uppercase" }}>{s.split(" ")[0]}</div>
                      <div style={{ fontSize:10, color:th.muted }}>{deals.filter(d=>d.stage===s).length}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:th.surface, borderRadius:10, padding:"18px", border:`1px solid ${th.border}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>Value by Owner</div>
                {byOwner.map((o,i)=>(
                  <div key={o.name} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:12 }}>
                      <span style={{color:th.text2}}>{o.name}</span>
                      <span style={{color:th.text,fontWeight:600}}>{fmtM(o.value)} EUR</span>
                    </div>
                    <div style={{ height:5, borderRadius:3, background:th.border }}>
                      <div style={{ height:"100%", width:(o.value/maxOwnerVal*100)+"%", borderRadius:3, background:["#3B82F6","#10B981","#F59E0B","#6366F1","#EC4899"][i%5], transition:"width .5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:th.surface, borderRadius:10, padding:"18px", border:`1px solid ${th.border}`, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>Pipeline Funnel</div>
              {STAGES.map((s,i)=>{
                const val=byStageVal[i], cnt=deals.filter(d=>d.stage===s).length;
                return (
                  <div key={s} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:9 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:STAGE_META[i].color, flexShrink:0 }} />
                    <div style={{ width:90, fontSize:11, color:STAGE_META[i].color, flexShrink:0 }}>{STAGE_LABELS["en"][i]}</div>
                    <div style={{ flex:1, height:18, borderRadius:4, background:th.border, overflow:"hidden", position:"relative" }}>
                      <div style={{ height:"100%", width:maxStageVal>0?(val/maxStageVal*100)+"%":"0%", background:STAGE_META[i].color+"88", borderRadius:4, transition:"width .6s" }} />
                      <span style={{ position:"absolute", left:8, top:1, fontSize:10, color:"#E2E8F0", fontWeight:600 }}>{fmtM(val)} EUR</span>
                    </div>
                    <div style={{ width:24, textAlign:"right", fontSize:11, color:"#334155" }}>{cnt}×</div>
                  </div>
                );
              })}
            </div>
            <div style={{ background:th.surface, borderRadius:10, padding:"18px", border:`1px solid ${th.border}` }}>
              <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:12 }}>Recent Leads</div>
              {[...deals].sort((a,b)=>b.updated.localeCompare(a.updated)).slice(0,6).map(d=>{
                const meta=stageMeta(d.stage);
                return (
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:`1px solid ${th.border2}` }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:meta.color, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontSize:13, color:th.text, fontWeight:500 }}>{d.name}</span>
                      <span style={{ fontSize:11, color:th.muted, marginLeft:8 }}>{d.company}</span>
                    </div>
                    <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8, background:meta.bg, color:meta.color }}>{STAGE_LABELS["en"][stageIdx(d.stage)]}</span>
                    <span style={{ fontSize:12, color:meta.color, fontWeight:600, minWidth:70, textAlign:"right" }}>{fmtM(d.value)} EUR</span>
                  </div>
                );
              })}

            {/* By Source report */}
            <div style={{ background:th.surface, borderRadius:10, padding:"18px", border:`1px solid ${th.border}`, marginTop:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:th.muted, marginBottom:14 }}>{t.bySource}</div>
              {SOURCES.map((s,i) => {
                const sDeals = deals.filter(d => (d.source||"Other") === s);
                const sVal = sDeals.reduce((sum,d)=>sum+d.value,0);
                const maxVal = Math.max(...SOURCES.map(ss => deals.filter(d=>(d.source||"Other")===ss).reduce((sum,d)=>sum+d.value,0)),1);
                return (
                  <div key={s} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:th.text }}>{SOURCE_ICONS[i]} {SOURCE_LABELS["en"][i]}</span>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ fontSize:11, padding:"1px 7px", borderRadius:8, background:SOURCE_COLORS[i]+"18", color:SOURCE_COLORS[i], fontWeight:600 }}>{sDeals.length} leads</span>
                        <span style={{ fontSize:12, fontWeight:600, color:th.text, minWidth:80, textAlign:"right" }}>{fmtM(sVal)} EUR</span>
                      </div>
                    </div>
                    <div style={{ height:6, borderRadius:3, background:th.border }}>
                      <div style={{ height:"100%", width:(sVal/maxVal*100)+"%", borderRadius:3, background:SOURCE_COLORS[i], transition:"width .5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </>
        )}

        {/* ── TIMELINE ── */}
        {view === "timeline" && (
          <TimelineView deals={deals} th={th} t={t} lang={lang} />
        )}

        {/* ── GROUP DASHBOARD ── */}
        {view === "group" && (
          <GroupDashboard th={th} t={t} lang={lang} />
        )}

        {/* ── SETTINGS ── */}
        {view === "settings" && (
          <SettingsPanel session={session} lang={lang} setLang={setLang} onSignOut={()=>{setSession(null);setDeals([]);setLoaded(false);}} t={t} theme={theme} setTheme={setTheme} th={th} />
        )}
      </main>

      {modal && <DealModal deal={modal==="new"?null:modal} onSave={saveDeal} onClose={()=>setModal(null)} lang={lang} owners={owners} th={th} />}
    </div>
  );
}
