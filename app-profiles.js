/*
app-profiles.js
version: 1.2
build: 2025-08-21 13:35
*/
(function(){
  "use strict";
  const Coach = (window.Coach = window.Coach || {});
  const $ = (sel)=> document.querySelector(sel);

  const LS_DOC = "coach_user_data";
  const DEFAULT_PROFILE_ID = "u-default";

  // UI refs
  let userSel, btnNew, btnDup, btnRen, btnDel, btnExport, btnImport, fileImport;
  let trainerSel, themeSel, ageInp, heightInp, weightInp, goalSel, arthChk;

  const state = {
    doc: null,
    current: null,
  };

  function uid(){ return "u-" + Math.random().toString(36).slice(2,8); }
  function nowISO(){ return new Date().toISOString(); }

  function makeDefaultProfile(){
    return {
      id: DEFAULT_PROFILE_ID,
      name: "Par défaut",
      created: nowISO(),
      updated: nowISO(),
      settings: {
        trainer: "jerome",
        skin: "dark",
        age: null, height: null, weight: null,
        goal: "maintenance",
        flags: { knee_left_arthrosis: false },
        rest: 30, rounds: 1, sessionsPerDay: 3
      },
      progress: { exercises: {}, history: [] },
      overrides: { progression: {} }
    };
  }

  function makeDefaultDoc(){
    const p = makeDefaultProfile();
    return { version: 1.2, lastProfileId: p.id, profiles: [p] };
  }

  function readLocalDoc(){
    try{
      const raw = localStorage.getItem(LS_DOC);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(!obj || !obj.profiles) return null;
      return obj;
    }catch(_){ return null; }
  }

  async function fetchFileDoc(){
    try{
      // NOTE: si ton site est sous /coach_app/, préfère 'user_data.json' (relatif) à '/user_data.json' (racine).
      const r = await fetch("/user_data.json", {cache:"no-store"});
      if(!r.ok) return null;
      return await r.json();
    }catch(_){ return null; }
  } // <-- FIN correcte de fetchFileDoc (le '}' superflu a été retiré)

  function persistLocal(doc){
    try{ localStorage.setItem(LS_DOC, JSON.stringify(doc)); }catch(_){}
  }

  async function saveDoc(){
    if(!state.doc) return;
    state.doc.lastProfileId = state.current?.id || state.doc.lastProfileId;
    if (state.current) state.current.updated = nowISO();
    // PURE CLIENT: sauvegarde dans le navigateur
    persistLocal(state.doc);
  }
  const debouncedSave = debounce(saveDoc, 400);

  function debounce(fn, ms){
    let t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function findProfile(id){
    return state.doc.profiles.find(p=>p.id===id);
  }

  function ensureDocLoaded(doc){
    if(!doc || !Array.isArray(doc.profiles) || !doc.profiles.length){
      doc = makeDefaultDoc();
    }
    // de-dup ids
    const seen = new Set();
    for(const p of doc.profiles){
      if(seen.has(p.id)){ p.id = uid(); }
      seen.add(p.id);
    }
    // ensure lastProfileId points to an existing profile
    if(!doc.lastProfileId || !doc.profiles.find(x=>x.id===doc.lastProfileId)){
      doc.lastProfileId = doc.profiles[0].id;
    }
    state.doc = doc;
    state.current = doc.profiles.find(x=>x.id===doc.lastProfileId) || doc.profiles[0];
  }

  function bindUI(){
    userSel    = $("#userSelect");
    btnNew     = $("#userNew");
    btnDup     = $("#userDup");
    btnRen     = $("#userRen");
    btnDel     = $("#userDel");
    btnExport  = $("#userExport");
    btnImport  = $("#userImport");
    fileImport = $("#userImportFile");

    trainerSel = $("#profile");
    themeSel   = $("#theme");
    ageInp     = $("#age");
    heightInp  = $("#height");
    weightInp  = $("#weight");
    goalSel    = $("#goal");
    arthChk    = $("#arthrose");
  }

  function rebuildUserSelect(){
    if(!userSel || !state.doc) return;
    userSel.innerHTML = "";
    for(const p of state.doc.profiles){
      const opt = document.createElement("option");
      opt.value = p.id; opt.textContent = p.name;
      if(state.current && p.id === state.current.id) opt.selected = true;
      userSel.appendChild(opt);
    }
  }

  function applyProfileToForm(p){
    if(!p) return;
    const s = p.settings || {};
    if(trainerSel) trainerSel.value = s.trainer || "jerome";
    if(themeSel)   themeSel.value   = s.skin    || (localStorage.getItem("coach_skin")||"dark");

    // invoque Skins pour garder l’UI cohérente
    if(window.Coach?.Skins){
      window.Coach.Skins.applyProfile(trainerSel.value);
      window.Coach.Skins.applySkin(themeSel.value);
    }

    if(ageInp)    ageInp.value    = s.age ?? "";
    if(heightInp) heightInp.value = s.height ?? "";
    if(weightInp) weightInp.value = s.weight ?? "";
    if(goalSel)   goalSel.value   = s.goal || "maintenance";
    if(arthChk)   arthChk.checked = !!(s.flags && s.flags.knee_left_arthrosis);
    const r = s.rest ?? null, ro = s.rounds ?? null, spd = s.sessionsPerDay ?? null;
    const rest = $("#rest"), rounds = $("#rounds"), sessionsPerDay = $("#sessionsPerDay");
    if(rest && r!=null) rest.value = r;
    if(rounds && ro!=null) rounds.value = ro;
    if(sessionsPerDay && spd!=null) sessionsPerDay.value = spd;
  }

  function readFormIntoProfile(p){
    if(!p) return;
    const s = (p.settings = p.settings || { flags: {} });
    s.trainer = trainerSel?.value || s.trainer || "jerome";
    s.skin    = themeSel?.value   || s.skin    || "dark";
    if(ageInp)    s.age    = ageInp.value ? parseInt(ageInp.value,10) : null;
    if(heightInp) s.height = heightInp.value ? parseInt(heightInp.value,10) : null;
    if(weightInp) s.weight = weightInp.value ? parseFloat(weightInp.value) : null;
    if(goalSel)   s.goal   = goalSel.value || "maintenance";
    s.flags = s.flags || {};
    if(arthChk)   s.flags.knee_left_arthrosis = !!arthChk.checked;
    const rest = $("#rest"), rounds = $("#rounds"), sessionsPerDay = $("#sessionsPerDay");
    if(rest) s.rest = parseInt(rest.value||"0",10);
    if(rounds) s.rounds = parseInt(rounds.value||"1",10);
    if(sessionsPerDay) s.sessionsPerDay = parseInt(sessionsPerDay.value||"1",10);
  }

  function attachFormListeners(){
    const inputs = [trainerSel, themeSel, ageInp, heightInp, weightInp, goalSel, arthChk, $("#rest"), $("#rounds"), $("#sessionsPerDay")].filter(Boolean);
    inputs.forEach(el=>{
      el.addEventListener("change", ()=>{
        readFormIntoProfile(state.current);
        debouncedSave();
      });
      if(el.tagName==="INPUT") el.addEventListener("input", ()=>{
        readFormIntoProfile(state.current);
        debouncedSave();
      });
    });
    themeSel?.addEventListener("change", ()=>{
      try{ localStorage.setItem("coach_skin", themeSel.value); }catch(_){}
    });
    trainerSel?.addEventListener("change", ()=>{
      try{ localStorage.setItem("coach_profile", trainerSel.value); }catch(_){}
    });
  }

  function attachUserActions(){
    userSel?.addEventListener("change", ()=>{
      const id = userSel.value;
      const p = findProfile(id);
      if(!p) return;
      state.current = p;
      state.doc.lastProfileId = id;
      applyProfileToForm(p);
      debouncedSave();
    });
    btnNew?.addEventListener("click", ()=>{
      const name = prompt("Nom du nouvel utilisateur ?","Nouveau");
      if(!name) return;
      const p = makeDefaultProfile();
      p.id = uid(); p.name = name;
      // seed with current form values
      readFormIntoProfile(p);
      state.doc.profiles.push(p);
      state.current = p;
      rebuildUserSelect(); applyProfileToForm(p); debouncedSave();
    });
    btnDup?.addEventListener("click", ()=>{
      const src = state.current || state.doc.profiles[0];
      if(!src) return;
      const p = JSON.parse(JSON.stringify(src));
      p.id = uid(); p.name = src.name + " (copie)"; p.created = nowISO(); p.updated = nowISO();
      state.doc.profiles.push(p);
      state.current = p;
      rebuildUserSelect(); applyProfileToForm(p); debouncedSave();
    });
    btnRen?.addEventListener("click", ()=>{
      const p = state.current; if(!p) return;
      const name = prompt("Nouveau nom ?", p.name);
      if(!name) return;
      p.name = name; p.updated = nowISO();
      rebuildUserSelect(); debouncedSave();
    });
    btnDel?.addEventListener("click", ()=>{
      if(state.doc.profiles.length<=1){ alert("Impossible : au moins un profil requis."); return; }
      const p = state.current; if(!p) return;
      if(!confirm(`Supprimer le profil “${p.name}” ?`)) return;
      state.doc.profiles = state.doc.profiles.filter(x=>x.id!==p.id);
      state.current = state.doc.profiles[0];
      rebuildUserSelect(); applyProfileToForm(state.current); debouncedSave();
    });
    btnExport?.addEventListener("click", ()=>{
      const blob = new Blob([JSON.stringify(state.doc, null, 2)], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "user_data.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    btnImport?.addEventListener("click", ()=> fileImport?.click());
    fileImport?.addEventListener("change", (e)=>{
      const f = e.target.files?.[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const obj = JSON.parse(reader.result);
          ensureDocLoaded(obj);
          rebuildUserSelect(); applyProfileToForm(state.current);
          persistLocal(state.doc);
          alert("Import réussi.");
        }catch(err){
          alert("Import invalide : "+err.message);
        }
      };
      reader.readAsText(f, "utf-8");
    });
  }

  async function init(){
    bindUI();
    // 1) localStorage d’abord
    let doc = readLocalDoc();
    // 2) optionnel : seed depuis user_data.json intégré (one-shot)
    if(!doc) doc = await fetchFileDoc();
    // 3) défaut si rien trouvé
    ensureDocLoaded(doc || makeDefaultDoc());

    try{ localStorage.setItem('coach_user_data', JSON.stringify(state.doc)); }catch(_){}
    rebuildUserSelect();
    applyProfileToForm(state.current);
    attachFormListeners();
    attachUserActions();
  }

  Coach.Profiles = { init, get state(){ return state; } };
})();
