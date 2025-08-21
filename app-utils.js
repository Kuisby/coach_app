/*
app-utils.js
version: 1.2
build: 2025-08-20 01:45
*/
(function(){
  "use strict";
  const Coach = (window.Coach = window.Coach || {});

  // DOM helpers
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  // Versions / meta
  function ensureVers(){
    window.__VERS = window.__VERS || {
      index:{version:"?",build:"?"},
      themes:{version:"?",build:"?"},
      scripts:{
        utils:{version:"?",build:"?"},
        skins:{version:"?",build:"?"},
        timer:{version:"?",build:"?"},
        session:{version:"?",build:"?"},
      },
      json:{
        catalog:{version:"?",build:"?"},
        explain:{version:"?",build:"?"},
        progression:{version:"?",build:"?"}
      }
    };
  }

  const RX_HTML=/<!--[\s\S]*?-->/, RX_BLOCK=/\/\*[\s\S]*?\*\//,
        RX_VER=/^\s*version:\s*([^\r\n]+)\s*$/mi,
        RX_BUILD=/^\s*build:\s*([^\r\n]+)\s*$/mi;

  const pickHeader=(txt)=>{
    const a=(txt.match(RX_HTML)||[""])[0], b=(txt.match(RX_BLOCK)||[""])[0];
    if(/version\s*:|build\s*:/i.test(a))return a;
    if(/version\s*:|build\s*:/i.test(b))return b;
    return a||b||"";
  };

  async function fetchTextAndParseHeader(path){
    const res = await fetch(`${path}?v=${Date.now()}`, {cache:"no-store"});
    if(!res.ok) throw new Error(`${path} ${res.status}`);
    const txt = await res.text(), header = pickHeader(txt);
    const version = (header.match(RX_VER)?.[1]||"?").trim();
    let build = (header.match(RX_BUILD)?.[1]||"").trim();
    if(!build){
      const lm=res.headers.get("Last-Modified");
      build = lm ? new Date(lm).toISOString().replace("T"," ").slice(0,16) : "(unknown)";
    }
    return {version, build};
  }

  async function fetchJSONMeta(path, key){
    const res = await fetch(`${path}?v=${Date.now()}`, {cache:"no-store"});
    if(!res.ok) throw new Error(`${path} ${res.status}`);
    const data = await res.json();
    const version = String(data.version || data?._meta?.version || "1.0");
    const lm = res.headers.get("Last-Modified");
    const build   = data?._meta?.build || (lm ? new Date(lm).toISOString().replace("T"," ").slice(0,16) : "(unknown)");
    ensureVers(); window.__VERS.json[key] = {version, build};
    return data;
  }

  function hydrateFooter(){
    ensureVers();
    const v = window.__VERS;
    const fmt = o => (o&&o.version&&o.build)? `${o.version} (${o.build})` : "—";
    const set = (id, txt)=>{
      const el = $("#"+id);
      if(!el) return;
      const head=(el.textContent||"").split(" ")[0];
      el.textContent = `${head} ${txt}`;
    };
    set("vIndex", fmt(v.index));
    set("vThemes", fmt(v.themes));

    const s = v.scripts;
    const jsLine = `JS split : utils v${s.utils.version} · skins v${s.skins.version} · timer v${s.timer.version} · session v${s.session.version}`;
    set("vApp", jsLine);

    set("vCatalog", fmt(v.json.catalog));
    set("vExplain", fmt(v.json.explain));
    set("vProgression", fmt(v.json.progression));
  }

  function updateBadge(){
    const b=$("#topLeftBadge"); if(!b) return;
    const s = window.__VERS?.scripts || {};
    b.textContent = `Coach (utils ${s.utils.version||"?"} · skins ${s.skins.version||"?"} · timer ${s.timer.version||"?"} · session ${s.session.version||"?"})`;
  }

  async function refreshVersions(){
    try{
      window.__VERS.index  = await fetchTextAndParseHeader("index.html");
      window.__VERS.themes = await fetchTextAndParseHeader("themes.css");
      const [u, sk, t, se] = await Promise.all([
        fetchTextAndParseHeader("app-utils.js"),
        fetchTextAndParseHeader("app-skins.js"),
        fetchTextAndParseHeader("app-timer.js"),
        fetchTextAndParseHeader("app-session.js"),
      ]);
      window.__VERS.scripts.utils   = u;
      window.__VERS.scripts.skins   = sk;
      window.__VERS.scripts.timer   = t;
      window.__VERS.scripts.session = se;
      await Promise.allSettled([
        fetchJSONMeta("catalog.json","catalog"),
        fetchJSONMeta("explain.json","explain"),
        fetchJSONMeta("progression.json","progression"),
      ]);
    }catch(e){ console.warn("[versions]", e); }
    hydrateFooter(); updateBadge();
  }

  // Modal
  function showModal(id,title,html){
    let wrap = $("#"+id);
    if (!wrap){
      wrap = document.createElement("div"); wrap.id = id;
      wrap.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:50;background:rgba(0,0,0,.6)";
      wrap.innerHTML = `<div class="card" style="max-width:680px;width:clamp(280px,92vw,680px);max-height:84vh;overflow:auto;position:relative">
        <button class="iconbtn" data-close style="position:absolute;top:10px;right:10px">✖</button>
        <h3 id="${id}-title" style="margin-top:6px"></h3>
        <div id="${id}-content" class="modal-content"></div>
      </div>`;
      document.body.appendChild(wrap);
      wrap.addEventListener("click", (e)=>{ if (e.target===wrap || e.target.dataset.close!=null) hideModal(id); });
    }
    $("#"+id+"-title").textContent = title||"";
    $("#"+id+"-content").innerHTML = html||"";
    wrap.style.display = "flex";
  }
  function hideModal(id){ const el=$("#"+id); if(el) el.style.display="none"; }

  // Misc utils
  function pick(arr, n){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]];} return a.slice(0,Math.max(1,Math.min(n,a.length))); }
  function downloadJSON(name, data){ const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
  function fmtMMSS(secs){ const s=Math.max(0,Math.round(secs)); const m=(s/60)|0, r=s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; }

  // Afficher/cacher vues (inclut le planPanel)
  function showSettings(show=true){
    $("#settingsView")?.classList.toggle("hidden", !show);
    $("#sessionView")?.classList.toggle("hidden", show);
    $("#planPanel")?.classList.toggle("hidden", show); // ⟵ masque “Séance du jour” en mode réglages
  }

  // export
  Coach.$=$; Coach.$$=$$;
  Coach.ensureVers=ensureVers;
  Coach.fetchJSONMeta=fetchJSONMeta;
  Coach.hydrateFooter=hydrateFooter;
  Coach.updateBadge=updateBadge;
  Coach.refreshVersions=refreshVersions;
  Coach.showModal=showModal;
  Coach.hideModal=hideModal;
  Coach.pick=pick;
  Coach.downloadJSON=downloadJSON;
  Coach.escapeHtml=escapeHtml;
  Coach.fmtMMSS=fmtMMSS;
  Coach.showSettings=showSettings;

  // boot
  ensureVers(); hydrateFooter(); updateBadge(); refreshVersions();
})();
