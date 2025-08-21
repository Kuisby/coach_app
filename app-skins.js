/*
app-skins.js
version: 1.0
build: 2025-08-20 00:48
*/
(function(){
  "use strict";
  const { $, showSettings } = window.Coach;
  const Coach = (window.Coach = window.Coach || {});

  const profileSel = $("#profile");
  const themeSel   = $("#theme");
  const themeRow   = $("#themeRow");
  const arthRow    = $("#arthroseRow");
  const themePill  = $("#themePill");
  const body       = document.body;

  function scanAvailableSkins(){
    const out = new Map();
    try{
      for (const ss of Array.from(document.styleSheets)){
        let rules; try{ rules = ss.cssRules || ss.rules || []; } catch { continue; }
        for (const r of Array.from(rules)){
          const sel = r.selectorText || "";
          if (!sel) continue;
          const iter = sel.matchAll(/\.skin-([a-z0-9_-]+)\b/g);
          for (const m of iter){
            const key = m[1];
            if (!out.has(key)){
              const label = key.replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
              out.set(key,label);
            }
          }
        }
      }
    }catch{}
    if (!out.size) out.set("dark","Dark");
    return out;
  }

  function rebuildSkinSelector(){
    if (!themeSel) return;
    const stored = localStorage.getItem("coach_skin");
    const prev   = stored || themeSel.value || "dark";
    const skins  = scanAvailableSkins();
    themeSel.innerHTML = "";
    for (const [key,label] of skins){
      const opt=document.createElement("option");
      opt.value=key; opt.textContent=label;
      if (key===prev) opt.selected = true;
      themeSel.appendChild(opt);
    }
  }

  function applySkin(key){
    body.classList.forEach(c=>{ if (c.startsWith("skin-")) body.classList.remove(c); });
    body.classList.add(`skin-${key}`);
    localStorage.setItem("coach_skin", key);
    if (themePill){
      const prof = (profileSel?.value || "jerome");
      const profLabel = prof==="lohan" ? "Lohan" : (prof==="duo" ? "Duo" : "Jérôme");
      const skinLabel = key.replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
      themePill.textContent = `${profLabel} · ${skinLabel}`;
    }
  }

  function applyProfile(p){
    body.classList.remove("theme-jerome","theme-lohan","theme-duo"); // legacy no-op
    body.classList.add(`theme-${p}`); // conservé si tu veux des features par profil
    if (arthRow)  arthRow.style.display  = (p==="jerome") ? "" : "none";
    if (themeRow) themeRow.style.display = "";
    localStorage.setItem("coach_profile", p);
    applySkin(localStorage.getItem("coach_skin") || themeSel?.value || "dark");
  }

  // events
  profileSel?.addEventListener("change", ()=> applyProfile(profileSel.value));
  themeSel?.addEventListener("change", ()=> applySkin(themeSel.value));

  function initSkins(){
    rebuildSkinSelector();
    applyProfile(localStorage.getItem("coach_profile") || profileSel?.value || "jerome");
    applySkin(localStorage.getItem("coach_skin") || themeSel?.value || "dark");
  }

  // export
  Coach.Skins = { scanAvailableSkins, rebuildSkinSelector, applySkin, applyProfile, initSkins };
})();
