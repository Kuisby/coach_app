/*
app-timer.js
version: 1.1
build: 2025-08-20 01:05
*/
(function(){
  "use strict";
  const { $, fmtMMSS } = window.Coach;
  const Coach = (window.Coach = window.Coach || {});

  function Timer(opts){
    Object.assign(this, opts);
    this.phase="idle"; this.total=0; this.left=0; this.raf=0; this.lastTs=0;
    this.radius=96; this.circ=2*Math.PI*this.radius;
    this._ensureRing();
    this._ensureOverlay();
  }
  Timer.prototype._ensureRing = function(){
    if (!this.ringEl) this.ringEl = $(".ring");
    if (this.svg) return;
    const svgNS="http://www.w3.org/2000/svg";
    const svg=document.createElementNS(svgNS,"svg");
    svg.setAttribute("viewBox","0 0 220 220"); svg.style.width="220px"; svg.style.height="220px";
    const track=document.createElementNS(svgNS,"circle");
    track.setAttribute("cx","110"); track.setAttribute("cy","110"); track.setAttribute("r", String(this.radius));
    track.setAttribute("class","track");
    const prog=document.createElementNS(svgNS,"circle");
    prog.setAttribute("cx","110"); prog.setAttribute("cy","110"); prog.setAttribute("r", String(this.radius));
    prog.setAttribute("class","progress");
    prog.style.strokeDasharray=String(this.circ);
    prog.style.strokeDashoffset=String(this.circ);
    this.ringEl?.insertBefore(svg, this.ringEl.firstChild);
    svg.appendChild(track); svg.appendChild(prog);
    this.svg=svg; this.track=track; this.prog=prog;
  };
  Timer.prototype._ensureOverlay = function(){
    if (this.overlay) return;
    const el=document.createElement("div");
    el.className="countdown"; el.style.display="none";
    (this.ringEl||document.body).appendChild(el); // dans le cercle
    this.overlay=el;
    this.displayWrap = this.displayEl ? this.displayEl.parentElement : null;
  };
  Timer.prototype._setProgress = function(p){
    if (!this.prog) return; const clamped=Math.max(0,Math.min(1,p));
    this.prog.style.strokeDashoffset = String(this.circ*(1-clamped));
  };
  Timer.prototype._updateText = function(){ if (this.displayEl) this.displayEl.textContent = fmtMMSS(this.left); };
  Timer.prototype._tick = function(ts){
    if (this.phase==="paused" || this.phase==="idle") return;
    if (!this.lastTs) this.lastTs = ts;
    const dt = (ts - this.lastTs)/1000; this.lastTs = ts;
    this.left -= dt;
    if (this.left <= 0){ this.left = 0; this._updateText(); this._setProgress(1); cancelAnimationFrame(this.raf); this.raf=0; return this._onPhaseEnded(); }
    this._updateText(); this._setProgress((this.total - this.left)/this.total);
    this.raf = requestAnimationFrame(this._tick.bind(this));
  };
  Timer.prototype._startPhase = function(kind, seconds){
    this.phase = kind; this.total = Math.max(1,Math.round(seconds)); this.left=this.total; this.lastTs=0;
    this._updateText(); this._setProgress(0);
    cancelAnimationFrame(this.raf); this.raf=requestAnimationFrame(this._tick.bind(this));
  };
  Timer.prototype._onPhaseEnded = function(){
    this.hideOverlay();
    if (this.phase==="work"){ const s = this.getSettings?.() || {rest:0}; if (this.onExerciseEnd) this.onExerciseEnd(); if (s.rest>0){ this.startRest(s.rest); } else { this.skipToNext(); } return; }
    if (this.phase==="rest"){ if (this.onRestEnd) this.onRestEnd(); return; }
    if (this.phase==="countdown"){ this.startWork(); return; }
  };
  Timer.prototype.showOverlay = function(n){
    this._ensureOverlay();
    if (this.displayWrap) this.displayWrap.style.visibility = "hidden";
    this.overlay.textContent = String(n);
    this.overlay.style.display = "flex";
  };
  Timer.prototype.hideOverlay = function(){
    if (!this.overlay) return;
    this.overlay.style.display="none";
    if (this.displayWrap) this.displayWrap.style.visibility = "";
  };
  Timer.prototype.countdown321 = function(){
    const s = this.getSettings?.()||{}; if (!s.countdown) return this.startWork();
    let n=3; const step=()=>{ this.showOverlay(n); if(n===0){ this.hideOverlay(); this.startWork(); return; } n--; setTimeout(step,1000); }; step();
  };
  Timer.prototype.startWork = function(){ const id = this.getCurrentId?.(); const secs = this.getDurationForExercise?.(id) || 30; this._startPhase("work", secs); };
  Timer.prototype.startRest = function(secs){ this._startPhase("rest", secs); };
  Timer.prototype.enter = function(){ this.phase="countdown"; this.countdown321(); };
  Timer.prototype.pause = function(){ if(this.phase!=="idle" && this.phase!=="paused"){ this.phase="paused"; cancelAnimationFrame(this.raf); this.raf=0; } };
  Timer.prototype.resume= function(){ if(this.phase==="paused"){ this.phase="work"; this.lastTs=0; cancelAnimationFrame(this.raf); this.raf=requestAnimationFrame(this._tick.bind(this)); } };
  Timer.prototype.reset = function(){ cancelAnimationFrame(this.raf); this.raf=0; this.phase="idle"; this.total=this.left=0; this._updateText(); this._setProgress(0); this.hideOverlay(); };
  Timer.prototype.skipToNext = function(){ this.reset(); if (this.onRestEnd) this.onRestEnd(); };

  Coach.Timer = Timer;
})();
