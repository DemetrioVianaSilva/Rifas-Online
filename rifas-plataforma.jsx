import { useState, useEffect, useRef } from "react";

// ====== PLATFORM CONFIG (Admin only) ======
const PLATFORM = {
  name: "Rifas Online",
  subtitle: "Plataforma de Rifas Digital",
  adminHash: "", // set on first login
  feePercent: 5,
  feeMode: "creation",
  pixKey: "",
  pixName: "",
  initialized: false,
};

// Simple hash for password storage (not exposed in source)
async function hashPass(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str + "rifas_salt_2026"));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function checkPass(input, hash) { return (await hashPass(input)) === hash; }

// Generate unique rifa code (ex: RF-A3K7)
function genRifaCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RF-";
  for (let i = 0; i < 4; i++) code += chars[secureRandom(chars.length)];
  return code;
}

const T = {
  bg: "#0a0f1a", card: "#111827", cardAlt: "#0d1321", gold: "#D4A843", goldL: "#F5DEB3",
  accent: "#22D3EE", ok: "#34D399", warn: "#FBBF24", err: "#F87171", txt: "#E5E7EB",
  mut: "#9CA3AF", bdr: "#1E293B", inp: "#1a2332", purp: "#A78BFA",
};

const gid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtD = (d) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
function secureRandom(max) { const a = new Uint32Array(4); crypto.getRandomValues(a); return ((a[0] ^ a[1] ^ a[2] ^ a[3]) >>> 0) % max; }
function useIsMobile() { const [m, s] = useState(window.innerWidth < 768); useEffect(() => { const h = () => s(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []); return m; }

// ====== INITIAL DATA ======
function initData() {
  return {
    organizers: [],
    rifas: [],
    feeHistory: [],
  };
}

// ====== UI COMPONENTS ======
function Input({ label, type = "text", value, onChange, placeholder, prefix, suffix, textarea, disabled, error, required }) {
  const C = textarea ? "textarea" : "input";
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: error ? T.err : T.mut, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}{required && <span style={{ color: T.err }}> *</span>}</label>}
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.mut, fontSize: 13, pointerEvents: "none" }}>{prefix}</span>}
        <C type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{ width: "100%", padding: textarea ? "10px 12px" : "9px 12px", paddingLeft: prefix ? 34 : 12, background: T.inp, border: `1px solid ${error ? T.err : T.bdr}`, borderRadius: 8, color: T.txt, fontSize: 14, outline: "none", resize: textarea ? "vertical" : "none", minHeight: textarea ? 60 : "auto", opacity: disabled ? 0.5 : 1, boxSizing: "border-box" }}
          onFocus={e => { e.target.style.borderColor = T.gold; }} onBlur={e => { e.target.style.borderColor = error ? T.err : T.bdr; }} />
        {suffix && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: T.mut, fontSize: 11 }}>{suffix}</span>}
      </div>
      {error && <span style={{ fontSize: 11, color: T.err, marginTop: 2, display: "block" }}>{error}</span>}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", disabled, block, style: cs }) {
  const vs = { primary: { bg: T.gold, c: T.bg }, secondary: { bg: T.bdr, c: T.txt }, success: { bg: T.ok, c: T.bg }, danger: { bg: "#DC2626", c: "#fff" }, ghost: { bg: "transparent", c: T.mut }, accent: { bg: T.accent, c: T.bg }, purple: { bg: T.purp, c: "#fff" } };
  const sz = { sm: { p: "5px 10px", f: 11 }, md: { p: "9px 16px", f: 13 }, lg: { p: "12px 24px", f: 15 } };
  const v = vs[variant] || vs.primary; const s = sz[size];
  return <button onClick={onClick} disabled={disabled} style={{ padding: s.p, border: "none", borderRadius: 8, background: disabled ? T.bdr : v.bg, color: disabled ? T.mut : v.c, fontSize: s.f, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, width: block ? "100%" : "auto", transition: "all 0.15s", ...cs }}>{children}</button>;
}

function Card({ children, title, subtitle, headerRight, style: cs }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.bdr}`, overflow: "hidden", ...cs }}>
      {title && <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}><div><h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.txt }}>{title}</h3>{subtitle && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.mut }}>{subtitle}</p>}</div>{headerRight}</div>}
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 12, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.bdr}`, width: "100%", maxWidth: wide ? 700 : 480, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.txt }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.mut, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "12px 16px" }}>{children}</div>
      </div>
    </div>
  );
}

function NumSearch({ value, onChange, total }) {
  return (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}>🔍</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={`Buscar nº (1-${total})...`}
        style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: 8, border: `1px solid ${T.bdr}`, background: T.inp, color: T.txt, fontSize: 12, boxSizing: "border-box", outline: "none" }}
        onFocus={e => { e.target.style.borderColor = T.gold; }} onBlur={e => { e.target.style.borderColor = T.bdr; }} />
      {value && <button onClick={() => onChange("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.mut, cursor: "pointer" }}>✕</button>}
    </div>
  );
}

// ====== RECEIPT MODAL ======
function genReceipt(rifa, buyer, nums) {
  return { rifa, buyer, numbers: nums, total: nums.length * rifa.pricePerNumber, isPaid: nums.filter(n => n.paid).length === nums.length };
}

function ReceiptModal({ open, onClose, data }) {
  if (!open || !data) return null;
  const { rifa, buyer, numbers, total, isPaid } = data;
  const pad = rifa.totalNumbers > 99 ? 3 : 2;
  const plain = (wa) => { const b = wa ? "*" : ""; return [`🎟️ ${b}${PLATFORM.name}${b}`, `${b}Rifa:${b} ${rifa.rifaName}`, `${b}Prêmio:${b} ${rifa.prize}`, `${b}Comprador:${b} ${buyer.name}`, `${b}Tel:${b} ${buyer.phone || "—"}`, `${b}Números:${b} ${numbers.map(n => String(n.number).padStart(pad, "0")).join(", ")}`, `${b}Total:${b} ${fmt(total)}`, `${b}Status:${b} ${isPaid ? "✅ PAGO" : "⏳ PENDENTE"}`, !isPaid && rifa.pixKey ? `\n${b}PIX:${b} ${rifa.pixKey}\n${b}Valor:${b} ${fmt(total)}` : ""].filter(Boolean).join("\n"); };
  const dlFile = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprovante</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#fff;color:#222;padding:24px;max-width:520px;margin:0 auto}.h{text-align:center;border-bottom:3px double #D4A843;padding-bottom:14px;margin-bottom:14px}.h h1{font-size:18px;color:#1a1a3e}.r{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #e0d5c0;font-size:11px}.ns{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin:12px 0}.n{width:32px;height:32px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;font-family:monospace}.np{background:#d4edda;color:#155724;border:2px solid #28a745}.nw{background:#fff3cd;color:#856404;border:2px solid #ffc107}.s{text-align:center;padding:8px;border-radius:6px;font-weight:bold;font-size:12px;margin-top:8px}.sp{background:#d4edda;color:#155724}.sw{background:#fff3cd;color:#856404}@media print{body{padding:8px}}</style></head><body><div class="h"><h1>🎟️ ${PLATFORM.name}</h1></div>${[["Rifa", rifa.rifaName], ["Prêmio", rifa.prize], ["Comprador", buyer.name], ["Tel", buyer.phone || "—"], ["Cotas", numbers.length], ["Total", fmt(total)]].map(([l, v]) => `<div class="r"><span>${l}</span><b>${v}</b></div>`).join("")}<div style="text-align:center;margin:10px 0;font-size:10px;color:#888">Números:</div><div class="ns">${numbers.map(n => `<div class="n ${n.paid ? "np" : "nw"}">${String(n.number).padStart(pad, "0")}</div>`).join("")}</div><div class="s ${isPaid ? "sp" : "sw"}">${isPaid ? "✅ CONFIRMADO" : "⏳ PENDENTE"}</div>${!isPaid && rifa.pixKey ? `<div style="background:#f0f7ff;border:1px solid #b3d4fc;border-radius:6px;padding:8px;margin-top:8px;text-align:center"><div style="font-size:10px;color:#555">PIX:</div><div style="font-size:14px;font-weight:bold;color:#1a1a3e">${rifa.pixKey}</div><div style="font-size:11px;font-weight:bold;margin-top:4px">Valor: ${fmt(total)}</div></div>` : ""}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `comprovante-${buyer.name.replace(/\s/g, "_")}.html`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 10, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fefbf3", borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", color: "#222" }}>
        <div style={{ textAlign: "center", padding: "16px 16px 10px", borderBottom: "3px double #D4A843" }}>
          <div style={{ fontSize: 24 }}>🎟️</div>
          <h2 style={{ margin: "2px 0", fontSize: 16, fontWeight: 800, color: "#1a1a3e", fontFamily: "Georgia,serif" }}>{PLATFORM.name}</h2>
        </div>
        <div style={{ padding: "12px 16px" }}>
          {[["Rifa", rifa.rifaName], ["Prêmio", rifa.prize], ["Comprador", buyer.name], ["Tel", buyer.phone || "—"], ["Cotas", numbers.length], ["Unit.", fmt(rifa.pricePerNumber)], ["Total", fmt(total)]].map(([l, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px dashed #e0d5c0", fontSize: 12 }}>
              <span style={{ color: "#888" }}>{l}</span><span style={{ fontWeight: l === "Total" ? 800 : 600, color: l === "Total" ? "#D4A843" : "#222" }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center", margin: "12px 0" }}>
            {numbers.map(n => (<div key={n.number} style={{ width: 32, height: 32, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, fontFamily: "monospace", background: n.paid ? "#d4edda" : "#fff3cd", color: n.paid ? "#155724" : "#856404", border: `2px solid ${n.paid ? "#28a745" : "#ffc107"}` }}>{String(n.number).padStart(pad, "0")}</div>))}
          </div>
          <div style={{ textAlign: "center", padding: 6, borderRadius: 6, fontWeight: 700, fontSize: 12, background: isPaid ? "#d4edda" : "#fff3cd", color: isPaid ? "#155724" : "#856404" }}>{isPaid ? "✅ CONFIRMADO" : "⏳ PENDENTE"}</div>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "8px 14px 14px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => { navigator.clipboard.writeText(plain(false)).then(() => alert("📋 Copiado!")); }} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#D4A843", color: "#1a1a3e", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>📋 Copiar</button>
          <button onClick={() => { window.open(`https://wa.me/${(buyer.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(plain(true))}`, "_blank"); }} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>📱 Zap</button>
          <button onClick={dlFile} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#E74C3C", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>📄 PDF</button>
          <button onClick={onClose} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#666", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ====== PUBLIC VIEW (Buyer) ======
function PublicView({ rifas, onBuy, showReceipt }) {
  const mob = useIsMobile();
  const [selRifa, setSelRifa] = useState(null);
  const [sel, setSel] = useState([]);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [errs, setErrs] = useState({});
  const [step, setStep] = useState("list"); // list, select, confirm, pix
  const [done, setDone] = useState(null);
  const [ns, setNs] = useState("");

  const activeRifas = rifas.filter(r => r.status === "active");
  const [rifaSearch, setRifaSearch] = useState("");
  const filteredRifas = activeRifas.filter(r => {
    if (!rifaSearch) return true;
    const s = rifaSearch.toUpperCase();
    return (r.code || "").includes(s) || r.rifaName.toLowerCase().includes(rifaSearch.toLowerCase());
  });

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Nome obrigatório";
    if (!phone.trim()) e.phone = "WhatsApp obrigatório";
    else if (phone.replace(/\D/g, "").length < 10) e.phone = "Mín 10 dígitos";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "E-mail inválido";
    if (!sel.length) e.numbers = "Selecione números";
    setErrs(e); return !Object.keys(e).length;
  };

  // List of active rifas
  if (step === "list" || !selRifa) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: mob ? "16px 10px" : "24px 20px" }}>
        {activeRifas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}><div style={{ fontSize: 48 }}>🎟️</div><h2 style={{ color: T.txt, fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display',Georgia,serif" }}>Nenhuma rifa ativa</h2><p style={{ color: T.mut, fontSize: 13, marginTop: 6 }}>Volte em breve!</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ color: T.txt, fontSize: 18, fontWeight: 800, fontFamily: "'Playfair Display',Georgia,serif", textAlign: "center", margin: "0 0 4px" }}>🎟️ Rifas Disponíveis</h2>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}>🔍</span>
              <input type="text" value={rifaSearch} onChange={e => setRifaSearch(e.target.value)} placeholder="Buscar por código (RF-XXXX) ou nome..."
                style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8, border: `1px solid ${T.bdr}`, background: T.inp, color: T.txt, fontSize: 13, boxSizing: "border-box", outline: "none" }}
                onFocus={e => { e.target.style.borderColor = T.gold; }} onBlur={e => { e.target.style.borderColor = T.bdr; }} />
            </div>
            {filteredRifas.map(r => {
              const sold = r.numbers.filter(n => n.buyer).length;
              const avail = r.totalNumbers - sold;
              return (
                <div key={r.id} onClick={() => { setSelRifa(r); setStep("select"); setSel([]); setNs(""); }}
                  style={{ padding: 16, borderRadius: 12, background: T.card, border: `1px solid ${T.bdr}`, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; }} onMouseLeave={e => { e.currentTarget.style.borderColor = T.bdr; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {r.code && <span style={{ padding: "2px 6px", borderRadius: 4, background: T.purp + "22", color: T.purp, fontSize: 10, fontWeight: 800, fontFamily: "monospace", letterSpacing: 1 }}>{r.code}</span>}
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.txt }}>{r.rifaName}</h3>
                      </div>
                      <p style={{ margin: "2px 0", fontSize: 12, color: T.gold }}>🏆 {r.prize}</p>
                      {r.description && <p style={{ margin: "4px 0 0", fontSize: 11, color: T.mut }}>{r.description}</p>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: T.gold, fontFamily: "monospace" }}>{fmt(r.pricePerNumber)}</div>
                      <div style={{ fontSize: 10, color: T.mut }}>{avail} disponíveis</div>
                      {r.drawDate && <div style={{ fontSize: 10, color: T.mut }}>Sorteio: {new Date(r.drawDate).toLocaleDateString("pt-BR")}</div>}
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 4, background: T.bdr, borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(sold / r.totalNumbers) * 100}%`, height: "100%", background: `linear-gradient(90deg,${T.gold},${T.ok})`, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const rifa = selRifa;
  const pad = rifa.totalNumbers > 99 ? 3 : 2;
  const avail = rifa.numbers.filter(n => !n.buyer);
  const sold = rifa.numbers.filter(n => n.buyer).length;
  const prog = (sold / rifa.totalNumbers) * 100;
  const total = sel.length * rifa.pricePerNumber;
  const toggle = (n) => { if (rifa.numbers.find(x => x.number === n)?.buyer) return; setSel(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]); };
  const fNums = rifa.numbers.filter(n => !ns || n.number.toString().includes(ns));
  const sNum = ns ? parseInt(ns) : null;

  if (step === "pix" && done) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: mob ? "16px 10px" : "24px 20px" }}>
        <Card>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <h2 style={{ color: T.ok, fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Reservado!</h2>
            <p style={{ color: T.mut, fontSize: 12, marginBottom: 12 }}>Realize o PIX para confirmar.</p>
            <div style={{ background: T.inp, borderRadius: 10, padding: 14, border: `2px dashed ${T.gold}44`, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: T.mut, textTransform: "uppercase", letterSpacing: 1 }}>Chave PIX</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.gold, fontFamily: "monospace", padding: "4px 6px", background: T.gold + "11", borderRadius: 6, wordBreak: "break-all", margin: "4px 0" }}>{rifa.pixKey}</div>
              <div style={{ fontSize: 10, color: T.mut }}>Titular: {rifa.pixName || rifa.organizerName}</div>
              <div style={{ marginTop: 10, padding: 8, background: T.warn + "11", borderRadius: 6, border: `1px solid ${T.warn}33` }}>
                <div style={{ fontSize: 10, color: T.warn, fontWeight: 700 }}>💰 VALOR</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: T.gold }}>{fmt(done.total)}</div>
              </div>
            </div>
            <div style={{ background: T.accent + "0d", borderRadius: 8, padding: 8, border: `1px solid ${T.accent}22`, marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: T.txt, margin: 0 }}>📱 Envie o <strong>comprovante via WhatsApp</strong> após o PIX.</p>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn variant="success" size="sm" onClick={() => showReceipt(done.buyer, done.numbers, rifa)}>🖨️ Comprovante</Btn>
              <Btn variant="secondary" size="sm" onClick={() => { setStep("list"); setSelRifa(null); setSel([]); setDone(null); setName(""); setPhone(""); setEmail(""); }}>← Rifas</Btn>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: mob ? "16px 10px" : "24px 20px" }}>
        <Card title="📋 Confirme">
          <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: T.mut }}>Comprador</div><div style={{ fontSize: 14, fontWeight: 700, color: T.txt }}>{name}</div><div style={{ fontSize: 11, color: T.mut }}>{phone}</div></div>
          <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: T.mut }}>Números ({sel.length})</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{sel.sort((a, b) => a - b).map(n => <span key={n} style={{ padding: "2px 6px", borderRadius: 4, background: T.gold + "22", color: T.gold, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{String(n).padStart(pad, "0")}</span>)}</div></div>
          <div style={{ padding: 10, borderRadius: 8, background: T.gold + "11", border: `1px solid ${T.gold}33`, textAlign: "center", marginBottom: 10 }}><div style={{ fontSize: 10, color: T.mut }}>Total</div><div style={{ fontSize: 24, fontWeight: 900, color: T.gold }}>{fmt(total)}</div></div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn variant="ghost" onClick={() => setStep("select")}>← Voltar</Btn>
            <Btn block onClick={() => {
              const buyer = { name: name.trim(), phone: phone.trim(), email: email.trim(), boughtAt: new Date().toISOString(), purchaseId: gid() };
              onBuy(rifa.id, buyer, sel);
              setDone({ buyer, numbers: sel.map(n => ({ number: n, paid: false })), total });
              setStep("pix");
            }}>✅ Confirmar</Btn>
          </div>
        </Card>
      </div>
    );
  }

  // Select numbers
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: mob ? "14px 10px" : "20px 18px" }}>
      <button onClick={() => { setStep("list"); setSelRifa(null); setSel([]); }} style={{ background: "none", border: "none", color: T.mut, fontSize: 12, cursor: "pointer", marginBottom: 8 }}>← Voltar às rifas</button>
      <div style={{ textAlign: "center", marginBottom: 14, padding: mob ? "14px 10px" : "20px 16px", background: `linear-gradient(135deg,${T.card},${T.cardAlt})`, borderRadius: 12, border: `1px solid ${T.bdr}` }}>
        <h1 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: T.txt, fontFamily: "'Playfair Display',Georgia,serif", margin: 0 }}>{rifa.rifaName}</h1>
        {rifa.code && <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: T.purp + "22", color: T.purp, fontSize: 11, fontWeight: 800, fontFamily: "monospace", letterSpacing: 1, marginTop: 2 }}>{rifa.code}</div>}
        <p style={{ fontSize: 13, color: T.gold, fontWeight: 600, margin: "2px 0" }}>🏆 {rifa.prize}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: mob ? 12 : 22, marginTop: 10, flexWrap: "wrap" }}>
          <div><div style={{ fontSize: 17, fontWeight: 900, color: T.gold, fontFamily: "monospace" }}>{fmt(rifa.pricePerNumber)}</div><div style={{ fontSize: 8, color: T.mut }}>POR Nº</div></div>
          <div><div style={{ fontSize: 17, fontWeight: 900, color: T.accent, fontFamily: "monospace" }}>{avail.length}</div><div style={{ fontSize: 8, color: T.mut }}>LIVRES</div></div>
        </div>
        <div style={{ margin: "8px auto 0", maxWidth: 320, height: 4, background: T.bdr, borderRadius: 2, overflow: "hidden" }}><div style={{ width: `${prog}%`, height: "100%", background: `linear-gradient(90deg,${T.gold},${T.ok})`, borderRadius: 2 }} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1.5fr 1fr", gap: 12 }}>
        <Card title="Escolha números" subtitle={errs.numbers ? `⚠️ ${errs.numbers}` : `${sel.length} selecionado(s)`}>
          <NumSearch value={ns} onChange={setNs} total={rifa.totalNumbers} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(${mob ? 32 : 36}px,1fr))`, gap: 3, maxHeight: mob ? 240 : 360, overflowY: "auto" }}>
            {fNums.map(n => {
              const s = sel.includes(n.number); const tk = !!n.buyer; const sr = sNum === n.number;
              let bg = T.inp, c = T.txt, b = T.bdr;
              if (tk) { bg = T.mut + "15"; c = T.mut + "66"; b = "transparent"; }
              else if (s) { bg = T.gold + "33"; c = T.gold; b = T.gold; }
              if (sr && !tk && !s) { bg = T.accent + "22"; c = T.accent; b = T.accent; }
              return <button key={n.number} onClick={() => toggle(n.number)} disabled={tk} style={{ width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: `1.5px solid ${b}`, background: bg, color: c, fontSize: 9, fontWeight: 700, fontFamily: "monospace", cursor: tk ? "not-allowed" : "pointer", textDecoration: tk ? "line-through" : "none", boxShadow: sr ? `0 0 6px ${T.accent}44` : "none" }}>{String(n.number).padStart(pad, "0")}</button>;
            })}
          </div>
        </Card>
        <Card title="📝 Seus Dados">
          {sel.length > 0 ? (
            <div style={{ padding: 6, borderRadius: 6, marginBottom: 8, background: T.gold + "11", border: `1px solid ${T.gold}33`, textAlign: "center" }}><div style={{ fontSize: 9, color: T.mut }}>Total</div><div style={{ fontSize: 18, fontWeight: 900, color: T.gold }}>{fmt(total)}</div></div>
          ) : (
            <div style={{ padding: 8, borderRadius: 6, marginBottom: 8, background: T.accent + "0d", border: `1px dashed ${T.accent}33`, textAlign: "center" }}><div style={{ fontSize: 14 }}>{mob ? "☝️" : "👈"}</div><div style={{ fontSize: 10, color: T.accent }}>{mob ? "Selecione acima" : "Selecione ao lado"}</div></div>
          )}
          <Input label="Nome" value={name} onChange={v => { setName(v); if (errs.name) setErrs(p => ({ ...p, name: "" })); }} placeholder="Seu nome" required error={errs.name} />
          <Input label="WhatsApp" value={phone} onChange={v => { setPhone(v); if (errs.phone) setErrs(p => ({ ...p, phone: "" })); }} placeholder="(88) 99999-0000" required error={errs.phone} />
          <Input label="E-mail (opcional)" value={email} onChange={v => { setEmail(v); if (errs.email) setErrs(p => ({ ...p, email: "" })); }} error={errs.email} />
          {Object.values(errs).some(Boolean) && <div style={{ padding: 4, borderRadius: 4, marginBottom: 4, background: T.err + "11", fontSize: 10, color: T.err }}>⚠️ {Object.values(errs).find(Boolean)}</div>}
          <Btn block onClick={() => { if (validate()) setStep("confirm"); }}>{sel.length === 0 ? "Selecione números" : `Continuar → ${fmt(total)}`}</Btn>
          {sel.length > 0 && <Btn variant="ghost" block onClick={() => setSel([])} size="sm" style={{ marginTop: 3 }}>Limpar</Btn>}
        </Card>
      </div>
    </div>
  );
}

// ====== ORGANIZER PANEL ======
function OrgLogin({ organizers, onLogin, onRegister }) {
  const [isReg, setIsReg] = useState(false);
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [pix, setPix] = useState("");
  const [err, setErr] = useState("");

  const doLogin = () => {
    const org = organizers.find(o => o.user === user.trim().toLowerCase());
    if (!org) { setErr("Usuário ou senha incorretos"); return; }
    if (org.blocked) { setErr("Conta bloqueada. Contate o admin."); return; }
    hashPass(pass).then(h => { if (h === org.passHash) onLogin(org); else setErr("Usuário ou senha incorretos"); });
  };
  const doReg = () => {
    if (!user.trim() || !pass || !name.trim() || !phone.trim() || !pix.trim()) { setErr("Preencha todos os campos"); return; }
    if (pass.length < 4) { setErr("Senha mín 4 chars"); return; }
    const u2 = user.trim().toLowerCase();
    if (/[^a-z0-9_]/.test(u2)) { setErr("Usuário: só letras, números e _"); return; }
    if (organizers.find(o => o.user === u2)) { setErr("Usuário já existe"); return; }
    hashPass(pass).then(h => {
      onRegister({ id: gid(), user: u2, passHash: h, name: name.trim(), phone: phone.trim(), pixKey: pix.trim(), createdAt: new Date().toISOString(), blocked: false });
      setErr(""); alert("✅ Conta criada! Faça login.");
      setIsReg(false);
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: 16 }}>
      <Card title={isReg ? "📝 Cadastro Organizador" : "🔐 Área do Organizador"} style={{ maxWidth: 380, width: "100%" }}>
        {isReg ? (
          <>
            <Input label="Usuário" value={user} onChange={v => { setUser(v); setErr(""); }} placeholder="seunome" required />
            <Input label="Senha" type="password" value={pass} onChange={v => { setPass(v); setErr(""); }} placeholder="Mín 4 chars" required />
            <Input label="Nome Completo" value={name} onChange={v => setName(v)} required />
            <Input label="WhatsApp" value={phone} onChange={v => setPhone(v)} placeholder="(88) 99999-0000" required />
            <Input label="Chave PIX" value={pix} onChange={v => setPix(v)} placeholder="Sua chave PIX" required />
            {err && <div style={{ padding: 4, borderRadius: 4, marginBottom: 6, background: T.err + "11", fontSize: 10, color: T.err }}>{err}</div>}
            <Btn block onClick={doReg}>Criar Conta</Btn>
            <button onClick={() => { setIsReg(false); setErr(""); }} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: T.accent, fontSize: 11, cursor: "pointer" }}>Já tem conta? Entrar</button>
          </>
        ) : (
          <>
            <Input label="Usuário" value={user} onChange={v => { setUser(v); setErr(""); }} placeholder="seunome" required />
            <Input label="Senha" type="password" value={pass} onChange={v => { setPass(v); setErr(""); }} placeholder="••••" required error={err} />
            <Btn block onClick={doLogin}>Entrar</Btn>
            <button onClick={() => { setIsReg(true); setErr(""); }} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: T.accent, fontSize: 11, cursor: "pointer" }}>Não tem conta? Cadastre-se</button>
          </>
        )}
      </Card>
    </div>
  );
}

function OrgPanel({ org, rifas, onUpdateRifa, onCreateRifa, showReceipt, feePercent }) {
  const mob = useIsMobile();
  const [tab, setTab] = useState("dash");
  const myRifas = rifas.filter(r => r.organizerId === org.id);

  const tabs = [{ id: "dash", l: "📊 Painel" }, { id: "create", l: "➕ Nova Rifa" }, { id: "manage", l: "🎯 Gerenciar" }, { id: "draw", l: "🏆 Sorteio" }];

  // Stats
  const totalSold = myRifas.reduce((a, r) => a + r.numbers.filter(n => n.buyer).length, 0);
  const totalPaid = myRifas.reduce((a, r) => a + r.numbers.filter(n => n.paid).length * r.pricePerNumber, 0);

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${T.bg},#12182d)`, borderBottom: `1px solid ${T.bdr}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "8px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h1 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.gold }}>{PLATFORM.name}</h1><p style={{ margin: 0, fontSize: 9, color: T.mut }}>👤 {org.name}</p></div>
            <div style={{ fontSize: 11, color: T.mut }}>{myRifas.length} rifa(s) • {fmt(totalPaid)} recebido</div>
          </div>
          <nav style={{ display: "flex", gap: 2, marginTop: 6, overflowX: "auto" }}>
            {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "4px 8px", border: "none", borderRadius: "4px 4px 0 0", background: tab === t.id ? T.gold + "18" : "transparent", color: tab === t.id ? T.gold : T.mut, fontSize: 10, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", borderBottom: tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent" }}>{t.l}</button>)}
          </nav>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: mob ? "10px 10px 30px" : "14px 16px 30px" }}>
        {tab === "dash" && <OrgDash rifas={myRifas} setTab={setTab} feePercent={feePercent} />}
        {tab === "create" && <OrgCreateRifa org={org} onCreate={onCreateRifa} feePercent={feePercent} setTab={setTab} />}
        {tab === "manage" && <OrgManage rifas={myRifas} onUpdate={onUpdateRifa} showReceipt={showReceipt} />}
        {tab === "draw" && <OrgDraw rifas={myRifas} />}
      </div>
    </div>
  );
}

function OrgDash({ rifas, setTab, feePercent }) {
  if (!rifas.length) return <Card><div style={{ textAlign: "center", padding: "40px 16px" }}><div style={{ fontSize: 44 }}>🎟️</div><h2 style={{ color: T.txt, fontSize: 16, fontWeight: 800, margin: "8px 0" }}>Crie sua primeira rifa!</h2><Btn onClick={() => setTab("create")}>➕ Criar</Btn></div></Card>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rifas.map(r => {
        const s = r.numbers.filter(n => n.buyer).length; const p = r.numbers.filter(n => n.paid).length;
        const rev = p * r.pricePerNumber; const fee = r.feeAmount || 0;
        return (
          <Card key={r.id} title={<span>{r.code && <span style={{ padding: "1px 5px", borderRadius: 3, background: T.purp + "22", color: T.purp, fontSize: 10, fontWeight: 800, fontFamily: "monospace", marginRight: 6 }}>{r.code}</span>}{r.rifaName}</span>} subtitle={`🏆 ${r.prize} • ${r.status === "pending_fee" ? "⏳ Aguardando tarifa" : r.status === "active" ? "🟢 Ativa" : "🔴 Inativa"}`}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: 6 }}>
              {[["Vendidos", s, T.gold], ["Pagos", p, T.ok], ["Livres", r.totalNumbers - s, T.accent], ["Recebido", fmt(rev), T.ok], ["Tarifa", fmt(fee), T.purp]].map(([l, v, c], i) => (
                <div key={i} style={{ padding: 6, borderRadius: 6, background: T.inp, textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: c, fontFamily: "monospace" }}>{v}</div><div style={{ fontSize: 8, color: T.mut }}>{l}</div></div>
              ))}
            </div>
            {r.status === "pending_fee" && (
              <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: T.warn + "11", border: `1px solid ${T.warn}44` }}>
                <div style={{ fontSize: 12, color: T.warn, fontWeight: 700, marginBottom: 6 }}>⏳ Pague a tarifa para ativar sua rifa</div>
                <div style={{ background: T.bg, borderRadius: 8, padding: 10, border: `1px dashed ${T.gold}44`, marginBottom: 6 }}>
                  <div style={{ fontSize: 9, color: T.mut, textTransform: "uppercase", letterSpacing: 1 }}>Valor da Tarifa</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: T.gold, fontFamily: "monospace" }}>{fmt(r.feeAmount)}</div>
                  <div style={{ fontSize: 9, color: T.mut }}>({r.feePercent}% de {fmt(r.totalNumbers * r.pricePerNumber)})</div>
                </div>
                {PLATFORM.pixKey ? (
                  <div style={{ background: T.bg, borderRadius: 8, padding: 10, border: `1px solid ${T.accent}22` }}>
                    <div style={{ fontSize: 9, color: T.mut, textTransform: "uppercase", letterSpacing: 1 }}>Chave PIX para pagamento</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.accent, fontFamily: "monospace", wordBreak: "break-all", margin: "4px 0" }}>{PLATFORM.pixKey}</div>
                    {PLATFORM.pixName && <div style={{ fontSize: 10, color: T.mut }}>Titular: {PLATFORM.pixName}</div>}
                    <button onClick={() => { navigator.clipboard.writeText(PLATFORM.pixKey).then(() => alert("📋 Chave PIX copiada!")); }} style={{ marginTop: 6, padding: "4px 10px", borderRadius: 5, border: `1px solid ${T.accent}44`, background: T.accent + "11", color: T.accent, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>📋 Copiar Chave PIX</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: T.err }}>⚠️ Chave PIX do admin não configurada. Entre em contato.</div>
                )}
                <div style={{ fontSize: 9, color: T.mut, marginTop: 6 }}>Após pagar, aguarde a confirmação do administrador. Sua rifa será ativada automaticamente.</div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function OrgCreateRifa({ org, onCreate, feePercent, setTab }) {
  const [c, setC] = useState({ rifaName: "", prize: "", prizeValue: "", totalNumbers: 100, pricePerNumber: 10, drawDate: "", description: "" });
  const [created, setCreated] = useState(null);
  const u = (k, v) => setC(p => ({ ...p, [k]: v }));
  const rev = c.totalNumbers * c.pricePerNumber;
  const fee = rev * feePercent / 100;
  const prize = parseFloat(c.prizeValue) || 0;

  // Post-creation: show fee payment screen
  if (created) {
    return (
      <Card title="✅ Rifa Criada com Sucesso!">
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🎟️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.txt }}>{created.rifaName}</div>
          {created.code && <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 5, background: T.purp + "22", color: T.purp, fontSize: 14, fontWeight: 900, fontFamily: "monospace", letterSpacing: 1.5, margin: "4px 0" }}>{created.code}</div>}
          <div style={{ fontSize: 12, color: T.gold }}>🏆 {created.prize}</div>
          <div style={{ fontSize: 10, color: T.mut, marginTop: 2 }}>Use o código acima para divulgar sua rifa</div>
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: T.warn + "0d", border: `2px solid ${T.warn}33`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.warn, textAlign: "center", marginBottom: 8 }}>💎 Pague a tarifa para ativar sua rifa</div>
          <div style={{ background: T.bg, borderRadius: 8, padding: 12, border: `1px dashed ${T.gold}44`, textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: T.mut, textTransform: "uppercase", letterSpacing: 1 }}>Valor da Tarifa ({created.feePercent}%)</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.gold, fontFamily: "monospace" }}>{fmt(created.feeAmount)}</div>
          </div>
          {PLATFORM.pixKey ? (
            <div style={{ background: T.bg, borderRadius: 8, padding: 12, border: `1px solid ${T.accent}22`, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.mut, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Pague via PIX</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.accent, fontFamily: "monospace", wordBreak: "break-all", padding: "6px 8px", background: T.accent + "0d", borderRadius: 6, border: `1px solid ${T.accent}22` }}>{PLATFORM.pixKey}</div>
              {PLATFORM.pixName && <div style={{ fontSize: 11, color: T.mut, marginTop: 4 }}>Titular: {PLATFORM.pixName}</div>}
              <button onClick={() => { navigator.clipboard.writeText(PLATFORM.pixKey).then(() => alert("📋 Chave PIX copiada!")); }}
                style={{ marginTop: 8, padding: "6px 14px", borderRadius: 6, border: `1px solid ${T.accent}`, background: T.accent + "15", color: T.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📋 Copiar Chave PIX</button>
            </div>
          ) : (
            <div style={{ padding: 8, borderRadius: 6, background: T.err + "11", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.err }}>⚠️ Chave PIX do admin não configurada.</div>
              <div style={{ fontSize: 10, color: T.mut }}>Entre em contato com o administrador.</div>
            </div>
          )}
        </div>
        <div style={{ padding: 8, borderRadius: 6, background: T.accent + "0a", border: `1px solid ${T.accent}22`, marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: T.txt, margin: 0, lineHeight: 1.5 }}>📱 Após realizar o PIX, o administrador confirmará o pagamento e sua rifa será <strong>ativada automaticamente</strong> na plataforma.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn block onClick={() => { setCreated(null); setTab("dash"); }}>📊 Ir para Painel</Btn>
          <Btn variant="secondary" onClick={() => { setCreated(null); setC({ rifaName: "", prize: "", prizeValue: "", totalNumbers: 100, pricePerNumber: 10, drawDate: "", description: "" }); }}>➕ Nova Rifa</Btn>
        </div>
      </Card>
    );
  }

  return (
    <Card title="➕ Nova Rifa">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div style={{ gridColumn: "1/-1" }}><Input label="Nome" value={c.rifaName} onChange={v => u("rifaName", v)} placeholder="Ex: Rifa Solidária" required /></div>
        <Input label="Prêmio" value={c.prize} onChange={v => u("prize", v)} placeholder="Smart TV" required />
        <Input label="Valor Prêmio" type="number" value={c.prizeValue} onChange={v => u("prizeValue", v)} prefix="R$" />
        <Input label="Qtd Números" type="number" value={c.totalNumbers} onChange={v => u("totalNumbers", parseInt(v) || 0)} />
        <Input label="Preço/Nº" type="number" value={c.pricePerNumber} onChange={v => u("pricePerNumber", parseFloat(v) || 0)} prefix="R$" />
        <Input label="Data Sorteio" type="date" value={c.drawDate} onChange={v => u("drawDate", v)} />
        <div style={{ gridColumn: "1/-1" }}><Input label="Descrição" value={c.description} onChange={v => u("description", v)} textarea /></div>
      </div>
      <div style={{ padding: 10, borderRadius: 8, background: T.purp + "0d", border: `1px solid ${T.purp}22`, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.purp, marginBottom: 4 }}>💎 Tarifa da Plataforma ({feePercent}%)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          {[["Arrec.", fmt(rev), T.ok], ["Prêmio", fmt(prize), T.err], ["Tarifa", fmt(fee), T.purp], ["Lucro", fmt(rev - prize - fee), T.gold]].map(([l, v, c], i) => (
            <div key={i}><div style={{ fontSize: 8, color: T.mut }}>{l}</div><div style={{ fontSize: 12, fontWeight: 800, color: c, fontFamily: "monospace" }}>{v}</div></div>
          ))}
        </div>
      </div>
      <Btn block onClick={() => {
        if (!c.rifaName || !c.prize) { alert("Preencha nome e prêmio!"); return; }
        const newRifa = {
          ...c, id: gid(), code: genRifaCode(), organizerId: org.id, organizerName: org.name,
          pixKey: org.pixKey, pixName: org.name,
          numbers: Array.from({ length: c.totalNumbers }, (_, i) => ({ number: i + 1, buyer: null, paid: false })),
          createdAt: new Date().toISOString(), status: "pending_fee",
          feePercent: feePercent, feeAmount: fee, feePaid: false,
        };
        onCreate(newRifa);
        setCreated(newRifa);
      }}>🎟️ Criar Rifa ({fmt(fee)} tarifa)</Btn>
    </Card>
  );
}

function OrgManage({ rifas, onUpdate, showReceipt }) {
  const [selId, setSelId] = useState(null);
  const [search, setSearch] = useState(""); const [ns, setNs] = useState("");
  const rifa = rifas.find(r => r.id === selId);

  if (!rifa) {
    return (
      <Card title="🎯 Suas Rifas">
        {rifas.length === 0 ? <p style={{ color: T.mut, fontSize: 12 }}>Nenhuma rifa.</p> : rifas.map(r => (
          <div key={r.id} onClick={() => setSelId(r.id)} style={{ padding: 10, borderRadius: 8, background: T.inp, border: `1px solid ${T.bdr}`, marginBottom: 6, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>{r.rifaName}</div><div style={{ fontSize: 10, color: T.mut }}>🏆 {r.prize}</div></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: r.status === "active" ? T.ok : T.warn }}>{r.status === "active" ? "🟢 Ativa" : "⏳ Pendente"}</div>
            </div>
          </div>
        ))}
      </Card>
    );
  }

  const pad = rifa.totalNumbers > 99 ? 3 : 2;
  const buyers = {};
  rifa.numbers.forEach(n => { if (!n.buyer) return; const k = n.buyer.purchaseId || (n.buyer.name + n.buyer.phone); if (!buyers[k]) buyers[k] = { ...n.buyer, key: k, numbers: [], tp: 0, tpd: 0 }; buyers[k].numbers.push(n); if (n.paid) buyers[k].tp += rifa.pricePerNumber; else buyers[k].tpd += rifa.pricePerNumber; });
  let list = Object.values(buyers);
  if (search) list = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || (b.phone || "").includes(search));

  const togglePay = (k, num) => { const updated = { ...rifa, numbers: rifa.numbers.map(n => { if (n.number === num && n.buyer && (n.buyer.purchaseId || (n.buyer.name + n.buyer.phone)) === k) return { ...n, paid: !n.paid }; return n; }) }; onUpdate(updated); };
  const markAll = (k) => { const updated = { ...rifa, numbers: rifa.numbers.map(n => { if (n.buyer && (n.buyer.purchaseId || (n.buyer.name + n.buyer.phone)) === k) return { ...n, paid: true }; return n; }) }; onUpdate(updated); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Btn variant="ghost" size="sm" onClick={() => setSelId(null)}>← Voltar</Btn>
        <h3 style={{ margin: 0, fontSize: 14, color: T.txt }}>{rifa.rifaName}</h3>
      </div>
      <Card title="👥 Compradores" subtitle={`${list.length} encontrado(s)`}>
        <input type="text" placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${T.bdr}`, background: T.inp, color: T.txt, fontSize: 11, marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 400, overflowY: "auto" }}>
          {list.map(b => (
            <div key={b.key} style={{ padding: 8, borderRadius: 6, background: T.inp, border: `1px solid ${b.tpd > 0 ? T.warn + "33" : T.ok + "33"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <div><div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>{b.name}</div><div style={{ fontSize: 10, color: T.mut }}>{b.phone || "—"}</div></div>
                <div style={{ fontSize: 10, fontWeight: 700, color: b.tpd > 0 ? T.warn : T.ok }}>{b.tpd > 0 ? `⏳ ${fmt(b.tpd)}` : "✅"}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 4 }}>
                {b.numbers.map(n => <button key={n.number} onClick={() => togglePay(b.key, n.number)} style={{ padding: "1px 5px", borderRadius: 3, background: n.paid ? T.ok + "22" : T.warn + "22", border: `1px solid ${n.paid ? T.ok + "44" : T.warn + "44"}`, color: n.paid ? T.ok : T.warn, fontSize: 9, fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>{String(n.number).padStart(pad, "0")} {n.paid ? "✅" : "⏳"}</button>)}
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {b.tpd > 0 && <Btn variant="success" size="sm" onClick={() => markAll(b.key)}>💰 Tudo</Btn>}
                <Btn variant="accent" size="sm" onClick={() => showReceipt(b, b.numbers, rifa)}>🖨️</Btn>
              </div>
            </div>
          ))}
          {!list.length && <div style={{ textAlign: "center", padding: 16, color: T.mut, fontSize: 11 }}>Nenhum comprador</div>}
        </div>
      </Card>
    </div>
  );
}

function OrgDraw({ rifas }) {
  const [selId, setSelId] = useState(null);
  const [winner, setWinner] = useState(null); const [drawing, setDrawing] = useState(false); const [anim, setAnim] = useState(null);
  const rifa = rifas.find(r => r.id === selId);

  if (!rifa) {
    return (
      <Card title="🏆 Sorteio">
        {rifas.filter(r => r.status === "active").length === 0 ? <p style={{ color: T.mut, fontSize: 12 }}>Nenhuma rifa ativa.</p> : rifas.filter(r => r.status === "active").map(r => (
          <div key={r.id} onClick={() => setSelId(r.id)} style={{ padding: 8, borderRadius: 6, background: T.inp, border: `1px solid ${T.bdr}`, marginBottom: 4, cursor: "pointer" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.txt }}>{r.rifaName}</div>
            <div style={{ fontSize: 10, color: T.mut }}>{r.numbers.filter(n => n.paid).length} nº pagos</div>
          </div>
        ))}
      </Card>
    );
  }

  const elig = rifa.numbers.filter(n => n.paid);
  const draw = () => {
    if (elig.length < 2) return;
    setDrawing(true); setWinner(null); let c = 0;
    const iv = setInterval(() => { setAnim(elig[secureRandom(elig.length)].number); c++; if (c > 30) { clearInterval(iv); const x = elig[secureRandom(elig.length)]; setAnim(x.number); setWinner(x); setDrawing(false); } }, 80);
  };

  return (
    <Card title={`🏆 ${rifa.rifaName}`} headerRight={<Btn variant="ghost" size="sm" onClick={() => { setSelId(null); setWinner(null); setAnim(null); }}>← Voltar</Btn>}>
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 12px", background: winner ? `linear-gradient(135deg,${T.gold},#b8860b)` : T.inp, border: `3px solid ${winner ? T.gold : T.bdr}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: anim ? 32 : 16, fontWeight: 900, fontFamily: "monospace", color: winner ? T.bg : drawing ? T.accent : T.mut }}>{anim ? String(anim).padStart(2, "0") : "?"}</span>
        </div>
        {winner && <div style={{ padding: 10, borderRadius: 8, background: T.gold + "0d", border: `1px solid ${T.gold}33`, marginBottom: 10 }}><div style={{ fontSize: 10, color: T.gold, fontWeight: 700 }}>🎉 GANHADOR!</div><div style={{ fontSize: 16, fontWeight: 800, color: T.txt }}>{winner.buyer.name}</div><div style={{ fontSize: 11, color: T.mut }}>Nº {String(winner.number).padStart(2, "0")} • {winner.buyer.phone || ""}</div></div>}
        <Btn onClick={draw} disabled={drawing || elig.length < 2}>{drawing ? "🎰..." : winner ? "🔄 Novo" : "🎰 Sortear"}</Btn>
        {elig.length < 2 && <p style={{ marginTop: 6, fontSize: 10, color: T.warn }}>⚠️ Mín 2 pagos</p>}
      </div>
    </Card>
  );
}

// ====== ADMIN PANEL (Platform Owner - Demetrio) ======
function AdminLogin({ onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  const [isSetup, setIsSetup] = useState(!PLATFORM.initialized);
  const [p2, setP2] = useState("");

  const doSetup = () => {
    if (!u.trim() || p.length < 6) { setErr("Usuário e senha (mín 6 chars)"); return; }
    if (p !== p2) { setErr("Senhas não conferem"); return; }
    hashPass(p).then(h => {
      PLATFORM.adminUser = u.trim().toLowerCase();
      PLATFORM.adminHash = h;
      PLATFORM.initialized = true;
      alert("✅ Admin configurado! Faça login.");
      setIsSetup(false); setErr(""); setU(""); setP("");
    });
  };

  const doLogin = () => {
    if (!PLATFORM.adminUser || !PLATFORM.adminHash) { setErr("Admin não configurado"); return; }
    if (u.trim().toLowerCase() !== PLATFORM.adminUser) { setErr("Credenciais inválidas"); return; }
    hashPass(p).then(h => { if (h === PLATFORM.adminHash) onLogin(); else setErr("Credenciais inválidas"); });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: 16 }}>
      <Card title={isSetup ? "🛡️ Configurar Admin" : "🛡️ Admin da Plataforma"} subtitle={isSetup ? "Primeira vez? Crie seu acesso." : undefined} style={{ maxWidth: 380, width: "100%" }}>
        {isSetup ? (
          <>
            <Input label="Usuário Admin" value={u} onChange={v => { setU(v); setErr(""); }} required />
            <Input label="Senha (mín 6)" type="password" value={p} onChange={v => { setP(v); setErr(""); }} required />
            <Input label="Confirmar Senha" type="password" value={p2} onChange={v => { setP2(v); setErr(""); }} required error={err} />
            <Btn block onClick={doSetup}>🛡️ Criar Acesso Admin</Btn>
            {PLATFORM.initialized && <button onClick={() => setIsSetup(false)} style={{ display: "block", margin: "8px auto 0", background: "none", border: "none", color: T.accent, fontSize: 11, cursor: "pointer" }}>Já configurado? Login</button>}
          </>
        ) : (
          <>
            <Input label="Usuário" value={u} onChange={v => { setU(v); setErr(""); }} required />
            <Input label="Senha" type="password" value={p} onChange={v => { setP(v); setErr(""); }} required error={err} />
            <Btn block onClick={doLogin}>🛡️ Entrar</Btn>
          </>
        )}
      </Card>
    </div>
  );
}

function AdminPanel({ data, setData }) {
  const mob = useIsMobile();
  const [tab, setTab] = useState("dash");
  const tabs = [{ id: "dash", l: "📊 Painel" }, { id: "rifas", l: "🎟️ Rifas" }, { id: "orgs", l: "👥 Organizadores" }, { id: "fees", l: "💎 Tarifas" }, { id: "cfg", l: "⚙️" }];

  const totalFees = data.rifas.reduce((a, r) => a + (r.feePaid ? r.feeAmount : 0), 0);
  const pendingFees = data.rifas.filter(r => r.status === "pending_fee").reduce((a, r) => a + r.feeAmount, 0);

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${T.bg},#1a0a2e)`, borderBottom: `1px solid ${T.bdr}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "8px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><h1 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.purp }}>🛡️ {PLATFORM.name} — ADMIN</h1></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 12, fontWeight: 700, color: T.ok, fontFamily: "monospace" }}>{fmt(totalFees)}</div><div style={{ fontSize: 8, color: T.mut }}>Recebido</div></div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 12, fontWeight: 700, color: T.warn, fontFamily: "monospace" }}>{fmt(pendingFees)}</div><div style={{ fontSize: 8, color: T.mut }}>Pendente</div></div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 2, marginTop: 6, overflowX: "auto" }}>
            {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "4px 8px", border: "none", borderRadius: "4px 4px 0 0", background: tab === t.id ? T.purp + "18" : "transparent", color: tab === t.id ? T.purp : T.mut, fontSize: 10, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", borderBottom: tab === t.id ? `2px solid ${T.purp}` : "2px solid transparent" }}>{t.l}</button>)}
          </nav>
        </div>
      </div>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: mob ? "10px 10px 30px" : "14px 16px 30px" }}>
        {tab === "dash" && <AdminDash data={data} />}
        {tab === "rifas" && <AdminRifas data={data} setData={setData} />}
        {tab === "orgs" && <AdminOrgs data={data} setData={setData} />}
        {tab === "fees" && <AdminFees />}
        {tab === "cfg" && <AdminCfg />}
      </div>
    </div>
  );
}

function AdminDash({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
        {[
          ["Organizadores", data.organizers.length, "👥", T.accent],
          ["Rifas Total", data.rifas.length, "🎟️", T.gold],
          ["Ativas", data.rifas.filter(r => r.status === "active").length, "🟢", T.ok],
          ["Aguardando Taxa", data.rifas.filter(r => r.status === "pending_fee").length, "⏳", T.warn],
          ["Taxas Recebidas", fmt(data.rifas.filter(r => r.feePaid).reduce((a, r) => a + r.feeAmount, 0)), "💎", T.purp],
          ["Taxas Pendentes", fmt(data.rifas.filter(r => !r.feePaid).reduce((a, r) => a + r.feeAmount, 0)), "⏳", T.warn],
        ].map(([l, v, i, c], idx) => (
          <div key={idx} style={{ padding: 10, borderRadius: 8, background: T.card, border: `1px solid ${T.bdr}`, textAlign: "center" }}>
            <div style={{ fontSize: 14 }}>{i}</div><div style={{ fontSize: 16, fontWeight: 900, color: c, fontFamily: "monospace" }}>{v}</div><div style={{ fontSize: 8, color: T.mut, textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminRifas({ data, setData }) {
  const confirmFee = (rifaId) => {
    setData(d => ({ ...d, rifas: d.rifas.map(r => r.id === rifaId ? { ...r, feePaid: true, status: "active", feeConfirmedAt: new Date().toISOString() } : r) }));
  };
  const deactivate = (rifaId) => {
    if (!confirm("Desativar rifa?")) return;
    setData(d => ({ ...d, rifas: d.rifas.map(r => r.id === rifaId ? { ...r, status: "inactive" } : r) }));
  };
  const deleteRifa = (rifaId) => {
    if (!confirm("EXCLUIR rifa permanentemente?")) return;
    setData(d => ({ ...d, rifas: d.rifas.filter(r => r.id !== rifaId) }));
  };

  return (
    <Card title="🎟️ Todas as Rifas" subtitle={`${data.rifas.length} total`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 500, overflowY: "auto" }}>
        {data.rifas.map(r => {
          const org = data.organizers.find(o => o.id === r.organizerId);
          const sold = r.numbers.filter(n => n.buyer).length;
          return (
            <div key={r.id} style={{ padding: 10, borderRadius: 8, background: T.inp, border: `1px solid ${r.status === "pending_fee" ? T.warn + "44" : r.status === "active" ? T.ok + "33" : T.err + "33"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>{r.code && <span style={{ padding: "1px 5px", borderRadius: 3, background: T.purp + "22", color: T.purp, fontSize: 9, fontWeight: 800, fontFamily: "monospace", marginRight: 4 }}>{r.code}</span>}{r.rifaName}</div>
                  <div style={{ fontSize: 10, color: T.mut }}>👤 {org?.name || "?"} • 🏆 {r.prize} • {sold}/{r.totalNumbers} vendidos</div>
                  <div style={{ fontSize: 10, color: T.mut }}>💎 Tarifa: {fmt(r.feeAmount)} ({r.feePercent}%) • {r.feePaid ? "✅ Paga" : "⏳ Pendente"}</div>
                </div>
                <div style={{ display: "flex", gap: 3, alignItems: "start" }}>
                  {r.status === "pending_fee" && <Btn variant="success" size="sm" onClick={() => confirmFee(r.id)}>✅ Confirmar Taxa</Btn>}
                  {r.status === "active" && <Btn variant="secondary" size="sm" onClick={() => deactivate(r.id)}>⏸️</Btn>}
                  <Btn variant="danger" size="sm" onClick={() => deleteRifa(r.id)}>🗑️</Btn>
                </div>
              </div>
            </div>
          );
        })}
        {!data.rifas.length && <div style={{ textAlign: "center", padding: 16, color: T.mut }}>Nenhuma rifa</div>}
      </div>
    </Card>
  );
}

function AdminOrgs({ data, setData }) {
  const block = (orgId) => { setData(d => ({ ...d, organizers: d.organizers.map(o => o.id === orgId ? { ...o, blocked: !o.blocked } : o) })); };
  const del = (orgId) => {
    if (!confirm("EXCLUIR organizador e TODAS as rifas dele?")) return;
    setData(d => ({ ...d, organizers: d.organizers.filter(o => o.id !== orgId), rifas: d.rifas.filter(r => r.organizerId !== orgId) }));
  };
  return (
    <Card title="👥 Organizadores" subtitle={`${data.organizers.length} cadastrados`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 500, overflowY: "auto" }}>
        {data.organizers.map(o => {
          const oRifas = data.rifas.filter(r => r.organizerId === o.id);
          return (
            <div key={o.id} style={{ padding: 10, borderRadius: 8, background: T.inp, border: `1px solid ${o.blocked ? T.err + "33" : T.bdr}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: o.blocked ? T.err : T.txt }}>{o.name} {o.blocked && "🚫"}</div>
                  <div style={{ fontSize: 10, color: T.mut }}>@{o.user} • {o.phone} • PIX: {o.pixKey}</div>
                  <div style={{ fontSize: 10, color: T.mut }}>{oRifas.length} rifa(s) • Desde {fmtD(o.createdAt)}</div>
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  <Btn variant={o.blocked ? "success" : "secondary"} size="sm" onClick={() => block(o.id)}>{o.blocked ? "🔓 Desbloquear" : "🔒 Bloquear"}</Btn>
                  <Btn variant="danger" size="sm" onClick={() => del(o.id)}>🗑️</Btn>
                </div>
              </div>
            </div>
          );
        })}
        {!data.organizers.length && <div style={{ textAlign: "center", padding: 16, color: T.mut }}>Nenhum organizador</div>}
      </div>
    </Card>
  );
}

function AdminFees() {
  const [pct, setPct] = useState(PLATFORM.feePercent);
  const [pix, setPix] = useState(PLATFORM.pixKey);
  const [pixN, setPixN] = useState(PLATFORM.pixName);
  return (
    <Card title="💎 Configuração de Tarifas" subtitle="Alterações valem apenas para novas rifas">
      <div style={{ padding: 8, borderRadius: 6, background: T.warn + "0d", border: `1px solid ${T.warn}22`, marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: T.warn, fontWeight: 700 }}>⚠️ Importante</div>
        <div style={{ fontSize: 10, color: T.txt, lineHeight: 1.4 }}>Rifas já criadas mantêm a taxa vigente no momento da criação. Alterações aqui valem apenas para novas rifas.</div>
      </div>
      <Input label={`Percentual da tarifa (atual: ${PLATFORM.feePercent}%)`} type="number" value={pct} onChange={setPct} suffix="%" />
      <Input label="Chave PIX (para receber tarifas)" value={pix} onChange={setPix} placeholder="Sua chave PIX" />
      <Input label="Titular PIX" value={pixN} onChange={setPixN} />
      <Btn onClick={() => { PLATFORM.feePercent = parseFloat(pct) || 5; PLATFORM.pixKey = pix; PLATFORM.pixName = pixN; alert(`✅ Tarifa atualizada para ${pct}% (novas rifas).`); }}>💾 Salvar</Btn>
    </Card>
  );
}

function AdminCfg() {
  const [nm, setNm] = useState(PLATFORM.name);
  const [sub, setSub] = useState(PLATFORM.subtitle);
  const [op, setOp] = useState(""); const [np, setNp] = useState(""); const [np2, setNp2] = useState("");
  const [pwErr, setPwErr] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Card title="⚙️ Plataforma">
        <Input label="Nome" value={nm} onChange={setNm} />
        <Input label="Subtítulo" value={sub} onChange={setSub} />
        <Btn onClick={() => { PLATFORM.name = nm; PLATFORM.subtitle = sub; alert("✅ Salvo!"); }}>💾</Btn>
      </Card>
      <Card title="🔐 Alterar Senha Admin">
        <Input label="Senha Atual" type="password" value={op} onChange={v => { setOp(v); setPwErr(""); }} />
        <Input label="Nova Senha (mín 6)" type="password" value={np} onChange={v => { setNp(v); setPwErr(""); }} />
        <Input label="Confirmar Nova" type="password" value={np2} onChange={v => { setNp2(v); setPwErr(""); }} error={pwErr} />
        <Btn onClick={() => {
          if (np.length < 6) { setPwErr("Mín 6 chars"); return; }
          if (np !== np2) { setPwErr("Senhas não conferem"); return; }
          checkPass(op, PLATFORM.adminHash).then(ok => {
            if (!ok) { setPwErr("Senha atual incorreta"); return; }
            hashPass(np).then(h => { PLATFORM.adminHash = h; setOp(""); setNp(""); setNp2(""); alert("✅ Senha alterada!"); });
          });
        }}>🔑 Alterar</Btn>
      </Card>
    </div>
  );
}

// ====== MAIN APP - ROUTER ======
export default function App() {
  const mob = useIsMobile();
  const [data, setData] = useState(initData);
  const [mode, setMode] = useState("public"); // public, org-login, org, admin-login, admin
  const [currentOrg, setCurrentOrg] = useState(null);
  const [rcpt, setRcpt] = useState(null);

  const showReceipt = (buyer, nums, rifa) => { if (rifa) setRcpt(genReceipt(rifa, buyer, nums)); };

  const onPublicBuy = (rifaId, buyer, nums) => {
    setData(d => ({ ...d, rifas: d.rifas.map(r => r.id === rifaId ? { ...r, numbers: r.numbers.map(n => nums.includes(n.number) ? { ...n, buyer: { ...buyer }, paid: false } : n) } : r) }));
  };

  const onOrgRegister = (org) => { setData(d => ({ ...d, organizers: [...d.organizers, org] })); };
  const onOrgLogin = (org) => { setCurrentOrg(org); setMode("org"); };
  const onOrgCreateRifa = (rifa) => { setData(d => ({ ...d, rifas: [...d.rifas, rifa] })); };
  const onOrgUpdateRifa = (updatedRifa) => { setData(d => ({ ...d, rifas: d.rifas.map(r => r.id === updatedRifa.id ? updatedRifa : r) })); };

  const wrap = (ch) => (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.txt, fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />
      {ch}
      <ReceiptModal open={!!rcpt} onClose={() => setRcpt(null)} data={rcpt} />
    </div>
  );

  // PUBLIC
  if (mode === "public") return wrap(
    <>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.bdr}`, padding: "8px 14px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: `linear-gradient(135deg,${T.gold},#b8860b)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🎟️</div>
            <h1 style={{ margin: 0, fontSize: 14, fontWeight: 800, fontFamily: "'Playfair Display',Georgia,serif", background: `linear-gradient(90deg,${T.gold},${T.goldL})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{PLATFORM.name}</h1>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setMode("org-login")} style={{ background: "none", border: `1px solid ${T.bdr}`, borderRadius: 4, color: T.mut, fontSize: 9, padding: "3px 6px", cursor: "pointer" }}>👤 Organizador</button>
            <button onClick={() => setMode("admin-login")} style={{ background: "none", border: `1px solid ${T.bdr}`, borderRadius: 4, color: T.mut, fontSize: 9, padding: "3px 6px", cursor: "pointer" }}>🛡️</button>
          </div>
        </div>
      </div>
      <PublicView rifas={data.rifas} onBuy={onPublicBuy} showReceipt={showReceipt} />
    </>
  );

  // ORG LOGIN
  if (mode === "org-login") return wrap(
    <>
      <div style={{ padding: "6px 14px", textAlign: "center" }}><button onClick={() => setMode("public")} style={{ background: "none", border: "none", color: T.mut, fontSize: 11, cursor: "pointer" }}>← Voltar</button></div>
      <OrgLogin organizers={data.organizers} onLogin={onOrgLogin} onRegister={onOrgRegister} />
    </>
  );

  // ORG PANEL
  if (mode === "org" && currentOrg) return wrap(
    <>
      <div style={{ textAlign: "right", padding: "4px 14px" }}><button onClick={() => { setMode("public"); setCurrentOrg(null); }} style={{ background: "none", border: "none", color: T.mut, fontSize: 10, cursor: "pointer" }}>🚪 Sair</button></div>
      <OrgPanel org={currentOrg} rifas={data.rifas} onUpdateRifa={onOrgUpdateRifa} onCreateRifa={onOrgCreateRifa} showReceipt={showReceipt} feePercent={PLATFORM.feePercent} />
    </>
  );

  // ADMIN LOGIN
  if (mode === "admin-login") return wrap(
    <>
      <div style={{ padding: "6px 14px", textAlign: "center" }}><button onClick={() => setMode("public")} style={{ background: "none", border: "none", color: T.mut, fontSize: 11, cursor: "pointer" }}>← Voltar</button></div>
      <AdminLogin onLogin={() => setMode("admin")} />
    </>
  );

  // ADMIN PANEL
  if (mode === "admin") return wrap(
    <>
      <div style={{ textAlign: "right", padding: "4px 14px" }}><button onClick={() => setMode("public")} style={{ background: "none", border: "none", color: T.mut, fontSize: 10, cursor: "pointer" }}>🚪 Sair</button></div>
      <AdminPanel data={data} setData={setData} />
    </>
  );

  return wrap(<div style={{ padding: 40, textAlign: "center", color: T.mut }}>Carregando...</div>);
}
