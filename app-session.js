/*
app-session.js
version: 1.5
build: 2025-08-20 01:45
*/
(function(){
  "use strict";
  const Coach = window.Coach;
  const { $, $$, fetchJSONMeta, hydrateFooter, updateBadge, refreshVersions,
          showModal, downloadJSON, escapeHtml, pick, showSettings } = Coach;

  // DOM
  const openSettingsBtn = $("#openSettings");
  const openHistoryBtn  = $("#openHistory");
  const startBtn        = $("#start");
  const checkBtn        = $("#checkUpdates");
  const sessionList     = $("#sessionList");
  const titleEl         = $("#exerciseTitle");
  const nextEl          = $("#nextExercise");
  const tipsUl          = $("#tipsList");
  const btnDoneNext     = $("#btnDoneNext");
  const btnPause        = $("#btnPause");
  const btnSkip         = $("#btnSkip");
  const btnReset        = $("#btnReset");
  const timerDisplay    = $("#timerDisplay");
  const timerChip       = $("#timerChip");
  const ringEl          = $(".ring");

  // Réglages (save/import/export)
  const saveBtn   = $("#save");
  const importBtn = $("#importData");
  const exportBtn = $("#exportTemplate");
  const fileInput = $("#fileInput");

  // Settings getters
  const profileSel = $("#profile");
  const themeSel   = $("#theme");
  const getSettings = ()=>({
    profile: profileSel?.value || "jerome",
    theme: themeSel?.value || "dark",
    age: +($("#age")?.value || 0) || null,
    height: +($("#height")?.value || 0) || null,
    weight: +($("#weight")?.value || 0) || null,
    goal: $("#goal")?.value || null,
    arthrose: $("#arthrose")?.checked || false,
    rounds: +($("#rounds")?.value || 1),
    rest: +($("#rest")?.value || 0),
    sessionsPerDay: +($("#sessionsPerDay")?.value || 1),
    countdown: !!$("#countdown")?.checked,
    sound: !!$("#sound")?.checked,
    vibration: !!$("#vibration")?.checked,
  });
  function setSettings(s){
    if (!s) return;
    if (profileSel) profileSel.value = s.profile || "jerome";
    if (themeSel)   themeSel.value   = s.theme   || "dark";
    $("#age")   && ($("#age").value    = s.age ?? "");
    $("#height")&& ($("#height").value = s.height ?? "");
    $("#weight")&& ($("#weight").value = s.weight ?? "");
    $("#goal")  && ($("#goal").value   = s.goal || "maintenance");
    $("#arthrose") && ($("#arthrose").checked = !!s.arthrose);
    $("#rounds")   && ($("#rounds").value    = s.rounds ?? 1);
    $("#rest")     && ($("#rest").value      = s.rest ?? 0);
    $("#sessionsPerDay") && ($("#sessionsPerDay").value = s.sessionsPerDay ?? 1);
    $("#countdown") && ($("#countdown").checked = !!s.countdown);
    $("#sound")     && ($("#sound").checked     = !!s.sound);
    $("#vibration") && ($("#vibration").checked = !!s.vibration);
  }

  // Data
  const Catalog = new Map();
  const Explain = new Map();
  const Progression = new Map();
  let currentOrder = [];

  const HISTORY_KEY = "coach_history";

  // Types → defaults
  const DURATION_DEFAULTS = { reps: 40, time: 45, hold: 30 };
  const normCat = (c)=>{ const s=String(c||"").toLowerCase();
    if (s.includes("haut")||s.includes("upper")) return "Haut du corps";
    if (s.includes("bas")||s.includes("lower")) return "Bas du corps";
    if (s.includes("abdo")||s.includes("core")) return "Core";
    if (s.includes("cardio")) return "Cardio";
    if (s.includes("stretch")||s.includes("étire")||s.includes("etire")) return "Stretch";
    return "Autre";
  };
  const normType = (t)=>{ const s=String(t||"").toLowerCase();
    if (s.startsWith("rep")) return "reps";
    if (s.startsWith("time")||s==="cardio") return "time";
    if (s.includes("hold")) return "hold";
    return s||"reps";
  };
  const toArr = (raw)=> Array.isArray(raw)?raw : (raw?.exercises||raw?.catalog||raw?.data||[]);

  async function loadData(){
    Catalog.clear(); Explain.clear(); Progression.clear();
    const [catalogRaw, explainRaw, progressionRaw] = await Promise.all([
      fetchJSONMeta("catalog.json","catalog"),
      fetchJSONMeta("explain.json","explain"),
      fetchJSONMeta("progression.json","progression"),
    ]);
    for (const e of toArr(catalogRaw)){
      const id = e.id ?? String(e.name||"").trim().toLowerCase().replace(/\s+/g,"_");
      if (!id) continue;
      Catalog.set(id, {
        id,
        name:e.name||"(sans nom)",
        type:normType(e.type),
        category:normCat(e.category),
        tips:Array.isArray(e.tips)?e.tips:undefined,
        seconds:+(e.seconds || e.duration || e.time || 0) || 0,
        reps:+(e.reps || e.repeat || e.repetitions || e.count || e.nb || e.n || 0) || 0
      });
    }
    if (explainRaw && typeof explainRaw==="object" && !Array.isArray(explainRaw)){
      for (const [id,val] of Object.entries(explainRaw)) Explain.set(id,val);
    } else {
      for (const rec of toArr(explainRaw)) if (rec?.id) Explain.set(rec.id,rec);
    }
    if (progressionRaw && typeof progressionRaw==="object" && !Array.isArray(progressionRaw)){
      for (const [id,val] of Object.entries(progressionRaw)) Progression.set(id,val);
    } else {
      for (const rec of toArr(progressionRaw)) if (rec?.id) Progression.set(rec.id, rec);
    }
  }

  // UI list
  function valLabelFor(id){
	const ex = Catalog.get(id);
	if (!ex) return "—";
	if (ex.type === "reps"){
		const n = repsForExercise(id);
		return `${n} X`;                 // ex: "12 X"
	}
	const s = durationForExercise(id);
	return `${s} secondes`;            // ex: "40 secondes"
  }

  function detailLine(id){
  const ex = Catalog.get(id);
  if (!ex) return "";
  // Catégorie + valeur lisible (reps/time)
  return `${ex.category || "—"} · ${valLabelFor(id)}`;
}

  function renderList(){
    sessionList.innerHTML = "";
    currentOrder.forEach((id, i) => {
      const ex = Catalog.get(id);
      const row = document.createElement("div");
      row.className = "item" + (i===0 ? " active" : "");
      row.innerHTML = `
        <div class="title ex-title" data-id="${id}" style="cursor:pointer;">${i+1}. ${ex?.name||"(sans nom)"}</div>
        <div class="meta">${detailLine(id)}</div>`;
      sessionList.appendChild(row);
    });
  }
  function populateCurrent(){
    const a = Catalog.get(currentOrder[0]);
    const b = Catalog.get(currentOrder[1]);
    if (titleEl){ titleEl.textContent = a?.name || "—"; titleEl.style.cursor="pointer"; titleEl.dataset.id=a?.id||""; }
    if (nextEl)  nextEl.textContent  = b?.name || "—";
    if (tipsUl){
      tipsUl.innerHTML=""; const tips = (a?.tips && Array.isArray(a.tips)) ? a.tips : [];
      tips.forEach(t=>{ const li=document.createElement("li"); li.textContent=String(t); tipsUl.appendChild(li); });
    }
    $$(".list .item").forEach((el,i)=> el.classList.toggle("active", i===0));
  }

  // Explain modal
  function explainHTMLFor(id){
    const ex = Catalog.get(id), title = ex?.name || "Exercice";
    const data = Explain.get(id);
    if (typeof data === "string") return { title, html:`<p style="white-space:pre-wrap">${escapeHtml(data)}</p>` };
    if (data && typeof data==="object"){
      let html = "";
      if (data.posture)   html += `<h3 style="margin:.4rem 0 .25rem">Posture</h3><p>${escapeHtml(data.posture)}</p>`;
      if (data.execution) html += `<h3 style="margin:.6rem 0 .25rem">Exécution</h3><p>${escapeHtml(data.execution)}</p>`;
      const cues = data.cues || data.tips;
      if (Array.isArray(cues) && cues.length) html += `<h3 style="margin:.6rem 0 .25rem">Repères</h3><ul>${cues.map(c=>`<li>${escapeHtml(String(c))}</li>`).join("")}</ul>`;
      return { title, html: html || `<p style="opacity:.8">Pas d'information supplémentaire.</p>` };
    }
    return { title, html:`<p style="opacity:.8">Pas d'information supplémentaire.</p>` };
  }
  function openExplain(id){ const {title, html} = explainHTMLFor(id); showModal("explainModal", title, html); }
  sessionList?.addEventListener("click", (e)=>{ const t=e.target.closest(".ex-title"); if (t){ const id=t.dataset.id; if (id) openExplain(id); } });
  titleEl?.addEventListener("click", ()=>{ const id=titleEl.dataset.id; if (id) openExplain(id); });

  // Durées / répétitions
  function durationForExercise(id){
    const ex = Catalog.get(id);
    if (!ex) return 30;
    if (ex.type === "reps") return 0;                 // pas de timer pour les répétitions
    if (ex.seconds && ex.seconds > 0) return ex.seconds;
    return DURATION_DEFAULTS[ex.type] ?? 30;
  }
  function isTimedExercise(id){
    const ex = Catalog.get(id); if (!ex) return false;
    if (ex.type === "reps") return false;
    if (ex.seconds && ex.seconds > 0) return true;
    return ex.type === "time" || ex.type === "hold";
  }
  function repsForExercise(id){
    const ex = Catalog.get(id);
    if (!ex) return 0;
    return ex.reps > 0 ? ex.reps : 12;                // défaut 12 si rien dans le JSON
  }

  // Chip helpers
  function setChip(text){
    if (!timerChip) return;
    if (text && text.trim().length){
      timerChip.textContent = text;
      timerChip.classList.remove("hidden");
    } else {
      timerChip.classList.add("hidden");
      timerChip.textContent = "";
    }
  }

  // Timer instance
  const Timer = new Coach.Timer({
    ringEl,
    displayEl: timerDisplay,
    getSettings,
    getCurrentId: ()=> currentOrder[0],
    getDurationForExercise: durationForExercise,
    onExerciseEnd: ()=>{},
    onRestEnd: ()=>{ doNextExercise(true); }
  });

  function startCurrentExercise(){
    const id = currentOrder[0]; if (!id) return;
    Timer.reset();
    if (isTimedExercise(id)){
      setChip("CHRONO");                                      // affiche la chip pendant l'effort minuté
      Timer.enter();                                    // 3-2-1 → work
    } else {
      setChip("RÉPÉTITIONS");
      if (timerDisplay) timerDisplay.textContent = `x ${repsForExercise(id)}`;
    }
  }

  function doNextExercise(skipRest=false){
    if (currentOrder.length) currentOrder.shift();
    if (!currentOrder.length){
      Timer.reset();
      showModal("doneModal","Séance terminée","<p>Bravo ! Séance terminée.</p>");
      showSettings(true);
      return;
    }
    populateCurrent();
    const s = getSettings();
    if (!skipRest && s.rest>0){
      setChip("PAUSE");
      Timer.startRest(s.rest);
    } else {
      startCurrentExercise();
    }
  }

  async function start(){
    await loadData();
    const ids = Array.from(Catalog.keys());
    if (!ids.length){ sessionList.innerHTML = "<div style='opacity:.8'>Aucun exercice trouvé.</div>"; return; }

    currentOrder = pick(ids, 12);
    renderList(); populateCurrent(); showSettings(false);

    const hist = JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
    hist.unshift({ when:new Date().toISOString(), ids: currentOrder.slice(0,12) });
    if (hist.length>50) hist.length=50;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));

    startCurrentExercise();
  }

  // Buttons séance
  btnPause?.addEventListener("click", ()=>{ if (Timer.phase==="paused") Timer.resume(); else if (Timer.phase!=="idle") Timer.pause(); });
  btnReset?.addEventListener("click", ()=>{ Timer.reset(); populateCurrent(); startCurrentExercise(); });
  btnSkip?.addEventListener("click", ()=>{ Timer.reset(); doNextExercise(true); });
  btnDoneNext?.addEventListener("click", ()=>{
    const s = getSettings();
    if (currentOrder.length>1 && s.rest>0){ setChip("PAUSE"); Timer.startRest(s.rest); } else { doNextExercise(true); }
  });

  // Réglages : save/import/export
  saveBtn?.addEventListener("click", ()=>{
    const s = getSettings();
    localStorage.setItem("coach_settings", JSON.stringify(s));
    showSettings(false);              // ⟵ cache les réglages, affiche la séance + "Séance du jour"
    startCurrentExercise();           // relance l'affichage au centre
    alert("Réglages enregistrés.");
  });
  exportBtn?.addEventListener("click", ()=>{
    const s = getSettings();
    const blob = new Blob([JSON.stringify({settings:s}, null, 2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "coach_settings_template.json"; a.click(); URL.revokeObjectURL(a.href);
  });
  importBtn?.addEventListener("click", ()=> fileInput?.click());
  fileInput?.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0]; if (!f) return;
    try{
      const text = await f.text();
      const data = JSON.parse(text);
      const s = data.settings || data;
      setSettings(s);
      localStorage.setItem("coach_settings", JSON.stringify(s));
      showSettings(true);
    }catch(err){ alert("Fichier JSON invalide."); }
    fileInput.value = "";
  });

  // Global actions
  openSettingsBtn?.addEventListener("click", ()=> showSettings(true));
  checkBtn?.addEventListener("click", refreshVersions);
  openHistoryBtn?.addEventListener("click", ()=>{
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
    if (!list.length){ showModal("historyModal","Historique","<p>Aucun historique pour le moment.</p>"); return; }
    const html = `
      <p style="opacity:.85">Les dernières séances générées :</p>
      <ul style="margin-left:18px">${list.map(
        it=>`<li><code>${it.when}</code> — ${it.ids.map(id=> (Catalog.get(id)?.name || id)).join(", ")}</li>`
      ).join("")}</ul>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="histExport" class="btn secondary">⬇️ Exporter JSON</button>
        <button id="histClear"  class="btn" style="background:#3a1d1d">🗑️ Vider</button>
      </div>`;
    showModal("historyModal","Historique",html);
    $("#histExport")?.addEventListener("click",()=> downloadJSON("coach_history.json", list));
    $("#histClear")?.addEventListener("click",()=>{ localStorage.removeItem(HISTORY_KEY); Coach.hideModal("historyModal"); });
  });

  // Skins init + START
  window.addEventListener("DOMContentLoaded", ()=>{
    Coach.showSettings(true);        // ⟵ planPanel masqué au démarrage
	Coach.Skins?.initSkins();
	Coach.Profiles?.init?.();
  });
  startBtn?.addEventListener("click", start);

  // Boot visuel
  hydrateFooter(); updateBadge(); refreshVersions();
})();
