// Shared printable document templates for VetTECH.
// Modern, well-designed layouts optimised for A4 print.

export interface PatientLite {
  id?: string;
  name?: string;
  species?: string | null;
  breed?: string | null;
  sex?: string | null;
  weight?: number | null;
  clients?: { full_name?: string | null; phone?: string | null; document?: string | null; address?: string | null } | null;
}

const BRAND = {
  name: "VetTECH",
  tagline: "Sistema para Clínicas Veterinárias",
  primary: "#0F766E",
  accent: "#14B8A6",
};

const baseStyles = `
  *{box-sizing:border-box}
  body{font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#111827;margin:0;background:#fff}
  .page{max-width:780px;margin:0 auto;padding:48px 56px}
  .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:18px;border-bottom:3px solid ${BRAND.primary}}
  .brand{display:flex;align-items:center;gap:12px}
  .logo{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});color:#fff;display:grid;place-items:center;font-weight:800;font-size:20px;letter-spacing:.5px}
  .brand-text h1{margin:0;font-size:20px;font-weight:800;letter-spacing:-.2px}
  .brand-text p{margin:2px 0 0;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.8px}
  .doc-meta{text-align:right;font-size:11px;color:#6B7280}
  .doc-meta .num{font-weight:700;color:#111827;font-size:13px}
  .title{margin:28px 0 6px;font-size:24px;font-weight:800;letter-spacing:-.4px;color:${BRAND.primary}}
  .subtitle{margin:0 0 22px;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:1.4px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 18px;margin-bottom:18px}
  .grid .full{grid-column:1/-1}
  .field{font-size:12px}
  .field .label{display:block;color:#6B7280;text-transform:uppercase;letter-spacing:.6px;font-size:10px;margin-bottom:2px}
  .field .value{font-weight:600;color:#111827;font-size:13px}
  .body-box{margin-top:8px;padding:22px 24px;border:1px solid #E5E7EB;border-radius:12px;min-height:240px;line-height:1.65;font-size:14px;white-space:pre-wrap}
  .body-box.items{padding:8px 0}
  .items table{width:100%;border-collapse:collapse}
  .items th,.items td{text-align:left;padding:10px 18px;font-size:13px;border-bottom:1px solid #F1F5F9}
  .items th{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#6B7280;background:#F9FAFB}
  .items td.num{text-align:right;color:#6B7280;width:36px}
  .notice{margin-top:14px;padding:12px 14px;border-left:4px solid ${BRAND.primary};background:${BRAND.primary}0F;font-size:12px;color:#334155;border-radius:6px}
  .signature{margin-top:80px;display:flex;flex-direction:column;align-items:center}
  .signature .line{width:320px;border-top:1.5px solid #111827;margin-bottom:6px}
  .signature .name{font-weight:700;font-size:13px}
  .signature .crmv{font-size:12px;color:#6B7280}
  .footer{margin-top:48px;padding-top:14px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF}
  .toolbar{position:fixed;top:14px;right:14px}
  .toolbar button{background:${BRAND.primary};color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.15)}
  .especial{border:2px solid ${BRAND.primary};border-radius:16px;padding:24px;margin-top:8px}
  .especial .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .especial .head h2{margin:0;font-size:14px;color:${BRAND.primary};letter-spacing:1px;text-transform:uppercase}
  .especial .tag{font-size:10px;background:${BRAND.primary};color:#fff;padding:4px 10px;border-radius:999px;letter-spacing:1px;text-transform:uppercase}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin-bottom:8px}
  .underline{border-bottom:1px solid #94A3B8;padding:4px 0;min-height:22px;font-size:13px}
  .underline .lbl{color:#6B7280;font-size:9px;text-transform:uppercase;letter-spacing:.6px;display:block;margin-top:6px}
  @page{size:A4;margin:0}
  @media print{.toolbar{display:none}.page{padding:24mm 18mm}}
`;

function header(docNumber: string, dateStr: string) {
  return `
    <div class="header">
      <div class="brand">
        <div class="logo">V</div>
        <div class="brand-text">
          <h1>${BRAND.name}</h1>
          <p>${BRAND.tagline}</p>
        </div>
      </div>
      <div class="doc-meta">
        <div class="num">Nº ${docNumber}</div>
        <div>${dateStr}</div>
      </div>
    </div>`;
}

function patientGrid(patient: PatientLite | null | undefined) {
  const tutor = patient?.clients?.full_name ?? "—";
  const phone = patient?.clients?.phone ?? "";
  return `
    <div class="grid">
      <div class="field"><span class="label">Paciente</span><span class="value">${patient?.name ?? "—"}</span></div>
      <div class="field"><span class="label">Tutor responsável</span><span class="value">${tutor}${phone ? ` • ${phone}` : ""}</span></div>
      <div class="field"><span class="label">Espécie / Raça</span><span class="value">${patient?.species ?? "—"}${patient?.breed ? " • " + patient.breed : ""}</span></div>
      <div class="field"><span class="label">Sexo / Peso</span><span class="value">${patient?.sex === "M" ? "Macho" : patient?.sex === "F" ? "Fêmea" : "—"}${patient?.weight ? " • " + patient.weight + " kg" : ""}</span></div>
    </div>`;
}

function footer() {
  return `<div class="footer"><span>${BRAND.name} • ${BRAND.tagline}</span><span>Emitido em ${new Date().toLocaleString("pt-BR")}</span></div>`;
}

function openWindow(title: string, inner: string) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title} • VetTECH</title><style>${baseStyles}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div><div class="page">${inner}</div></body></html>`);
  w.document.close();
}

function shortId() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }

export interface PrescItem { product_name: string; dosage?: string | null; frequency?: string | null; duration?: string | null }

export function printReceituarioComum(patient: PatientLite | null | undefined, content: string, vetName = "", crmv = "") {
  const inner = `${header(shortId(), new Date().toLocaleDateString("pt-BR"))}
    <h2 class="title">Receituário</h2>
    <p class="subtitle">Receita de uso comum</p>
    ${patientGrid(patient)}
    <div class="body-box">${escapeHtml(content)}</div>
    <div class="signature"><div class="line"></div><div class="name">${vetName || "Médico(a) Veterinário(a)"}</div><div class="crmv">CRMV ${crmv || "—"}</div></div>
    ${footer()}`;
  openWindow("Receituário", inner);
}

export function printReceituarioItems(patient: PatientLite | null | undefined, items: PrescItem[], notes = "", vetName = "", crmv = "") {
  const rows = items.map((i, idx) => `<tr><td class="num">${idx + 1}</td><td><strong>${escapeHtml(i.product_name)}</strong>${i.dosage ? `<div style="font-size:12px;color:#475569">${escapeHtml(i.dosage)}${i.frequency ? " • " + escapeHtml(i.frequency) : ""}${i.duration ? " • " + escapeHtml(i.duration) : ""}</div>` : ""}</td></tr>`).join("");
  const inner = `${header(shortId(), new Date().toLocaleDateString("pt-BR"))}
    <h2 class="title">Prescrição Médica</h2>
    <p class="subtitle">Medicamentos prescritos</p>
    ${patientGrid(patient)}
    <div class="body-box items"><table class="items"><thead><tr><th>#</th><th>Medicamento / Posologia</th></tr></thead><tbody>${rows || `<tr><td colspan="2" style="padding:20px;text-align:center;color:#6B7280">Sem itens</td></tr>`}</tbody></table></div>
    ${notes ? `<div class="notice">${escapeHtml(notes)}</div>` : ""}
    <div class="signature"><div class="line"></div><div class="name">${vetName || "Médico(a) Veterinário(a)"}</div><div class="crmv">CRMV ${crmv || "—"}</div></div>
    ${footer()}`;
  openWindow("Prescrição", inner);
}

export function printReceituarioEspecial(patient: PatientLite | null | undefined, content: string, vetName = "", crmv = "") {
  const tutorAddr = patient?.clients?.address ?? "";
  const tutorCpf = patient?.clients?.document ?? "";
  const inner = `${header(shortId(), new Date().toLocaleDateString("pt-BR"))}
    <h2 class="title">Receituário de Controle Especial</h2>
    <p class="subtitle">Conforme Portaria SVS/MS 344/98 — 2 vias</p>

    <div class="especial">
      <div class="head"><h2>Identificação do Emitente</h2><span class="tag">1ª Via — Farmácia</span></div>
      <div class="row">
        <div class="underline">${vetName || "________________________________"}<span class="lbl">Nome do prescritor</span></div>
        <div class="underline">${crmv || "________________________________"}<span class="lbl">CRMV / UF</span></div>
      </div>
      <div class="underline">________________________________<span class="lbl">Endereço profissional / Telefone</span></div>
    </div>

    <div class="especial" style="margin-top:14px">
      <div class="head"><h2>Identificação do Paciente e Comprador</h2></div>
      <div class="row">
        <div class="underline">${patient?.name ?? ""}<span class="lbl">Paciente</span></div>
        <div class="underline">${patient?.clients?.full_name ?? ""}<span class="lbl">Tutor / Comprador</span></div>
      </div>
      <div class="row">
        <div class="underline">${tutorCpf}<span class="lbl">CPF/RG do comprador</span></div>
        <div class="underline">${patient?.clients?.phone ?? ""}<span class="lbl">Telefone</span></div>
      </div>
      <div class="underline">${tutorAddr}<span class="lbl">Endereço residencial completo</span></div>
    </div>

    <div class="especial" style="margin-top:14px">
      <div class="head"><h2>Prescrição</h2></div>
      <div style="min-height:200px;white-space:pre-wrap;font-size:14px;line-height:1.7">${escapeHtml(content)}</div>
    </div>

    <div class="row" style="margin-top:30px">
      <div class="underline">${new Date().toLocaleDateString("pt-BR")}<span class="lbl">Data da emissão</span></div>
      <div class="underline">________________________________<span class="lbl">Assinatura do prescritor</span></div>
    </div>

    <div class="especial" style="margin-top:14px">
      <div class="head"><h2>Identificação do Fornecedor</h2></div>
      <div class="row">
        <div class="underline">&nbsp;<span class="lbl">Nome do farmacêutico</span></div>
        <div class="underline">&nbsp;<span class="lbl">CRF / UF</span></div>
      </div>
      <div class="underline">&nbsp;<span class="lbl">Data do atendimento / Assinatura</span></div>
    </div>

    ${footer()}`;
  openWindow("Receituário Especial", inner);
}

export function printAtestado(patient: PatientLite | null | undefined, content: string, days: number | null, vetName = "", crmv = "") {
  const inner = `${header(shortId(), new Date().toLocaleDateString("pt-BR"))}
    <h2 class="title">Atestado Médico Veterinário</h2>
    <p class="subtitle">Documento clínico</p>
    ${patientGrid(patient)}
    <div class="body-box">${escapeHtml(content)}</div>
    ${days != null ? `<div class="notice"><strong>Período de afastamento / repouso:</strong> ${days} dia(s).</div>` : ""}
    <div class="signature"><div class="line"></div><div class="name">${vetName || "Médico(a) Veterinário(a)"}</div><div class="crmv">CRMV ${crmv || "—"}</div></div>
    ${footer()}`;
  openWindow("Atestado", inner);
}

export function printExame(patient: PatientLite | null | undefined, name: string, requested: string, result: string, vetName = "", crmv = "") {
  const inner = `${header(shortId(), new Date().toLocaleDateString("pt-BR"))}
    <h2 class="title">Solicitação / Laudo de Exame</h2>
    <p class="subtitle">${escapeHtml(name)}</p>
    ${patientGrid(patient)}
    ${requested ? `<div style="margin-top:8px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.8px">Exames solicitados</div><div class="body-box" style="min-height:80px">${escapeHtml(requested)}</div>` : ""}
    ${result ? `<div style="margin-top:14px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:.8px">Resultado / Observações</div><div class="body-box" style="min-height:120px">${escapeHtml(result)}</div>` : ""}
    <div class="signature"><div class="line"></div><div class="name">${vetName || "Médico(a) Veterinário(a)"}</div><div class="crmv">CRMV ${crmv || "—"}</div></div>
    ${footer()}`;
  openWindow("Exame", inner);
}

export function printReport(title: string, subtitle: string, sectionsHtml: string) {
  const inner = `${header(shortId(), new Date().toLocaleDateString("pt-BR"))}
    <h2 class="title">${escapeHtml(title)}</h2>
    <p class="subtitle">${escapeHtml(subtitle)}</p>
    ${sectionsHtml}
    ${footer()}`;
  openWindow(title, inner);
}

function escapeHtml(s: string) {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
}
