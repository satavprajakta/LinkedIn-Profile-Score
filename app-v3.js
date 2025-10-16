// app-v3.js — LinkedIn Profile Score v3 (adds copy suggestions, badge history, leaderboard)
const $ = (id) => document.getElementById(id);

const ACTION_VERBS = ["built","created","led","designed","developed","launched","migrated","optimized","scaled","reduced","increased","improved","delivered","implemented","automated"];
const TECH_HINTS = ["java","spring","spring boot","angular","react","node","docker","kubernetes","aws","gcp","azure","microservices","rest","graphql","mysql","postgres","mongodb"];
const SOFT_HINTS = ["mentor","collaborate","team","stakeholder","ownership","communication","leadership"];

function wordCount(t){ return (t.trim().match(/\b\w+\b/g)||[]).length; }
function hasNumbers(t){ return /\d/.test(t); }
function bulletCount(t){ return (t.match(/(^|\n)\s*[-•*]/g)||[]).length; }
function countMatches(t, list){
  const lc = t.toLowerCase();
  return list.reduce((acc,w)=>acc+(lc.includes(w)?1:0),0);
}

function analyze(){
  const name = $("name").value.trim();
  const headline = $("headline").value.trim();
  const about = $("about").value.trim();
  const exp = $("experience").value.trim();
  const skills = $("skills").value.trim();

  const suggestions = [];
  let score = 0;
  const rows = [];

  // Headline (25 pts)
  let headScore = 0;
  if(headline.length>0) headScore += 8;
  if(headline.length>=40 && headline.length<=120) headScore += 8; else suggestions.push("Keep headline concise (~40–120 chars).");
  if(countMatches(headline, ACTION_VERBS)>=1) headScore += 5; else suggestions.push("Use an action word in the headline (e.g., 'Building', 'Leading').");
  if(countMatches(headline, TECH_HINTS)>=1) headScore += 4; else suggestions.push("Add 1–2 key keywords/skills in headline.");
  rows.push(["Headline",headScore,25]);
  score += headScore;

  // About (30 pts)
  let aboutScore = 0;
  const wc = wordCount(about);
  if(wc>=80) aboutScore += 10; else suggestions.push("Write at least ~80 words in About.");
  if(countMatches(about, ACTION_VERBS)>=3) aboutScore += 6; else suggestions.push("Use more action verbs in About (built, led, delivered...).");
  if(countMatches(about, TECH_HINTS)>=4) aboutScore += 6; else suggestions.push("Mention 4–5 concrete tech keywords in About.");
  if(hasNumbers(about)) aboutScore += 4; else suggestions.push("Quantify achievements with numbers or % (e.g., 'reduced cost by 20%').");
  if(/open to|seeking|available/i.test(about)) aboutScore += 4;
  rows.push(["About",aboutScore,30]);
  score += aboutScore;

  // Experience (25 pts)
  let expScore = 0;
  const bullets = bulletCount(exp);
  if(bullets>=4) expScore += 10; else suggestions.push("Add 4–6 bullet points under experience.");
  if(hasNumbers(exp)) expScore += 5; else suggestions.push("Add numbers/metrics in experience bullets.");
  if(countMatches(exp, ACTION_VERBS)>=4) expScore += 5; else suggestions.push("Start bullets with strong action verbs (Led, Built, Optimized...).");
  if(countMatches(exp, TECH_HINTS)>=4) expScore += 5; else suggestions.push("Include specific tools/tech used in experience.");
  rows.push(["Experience",expScore,25]);
  score += expScore;

  // Skills (20 pts)
  let skillsScore = 0;
  const skillList = skills.split(",").map(s=>s.trim()).filter(Boolean);
  if(skillList.length>=8 && skillList.length<=20) skillsScore += 10;
  else if(skillList.length>=5) skillsScore += 6;
  else suggestions.push("List 8–20 skills separated by commas.");
  const uniq = new Set(skillList.map(s=>s.toLowerCase()));
  if(uniq.size===skillList.length) skillsScore += 2; else suggestions.push("Avoid duplicate skills.");
  let techHits = 0; uniq.forEach(s => { if(TECH_HINTS.includes(s)) techHits++; });
  if(techHits>=4) skillsScore += 4;
  if(countMatches(skillList.join(" "), SOFT_HINTS)>=2) skillsScore += 4; else suggestions.push("Add 2–3 soft skills (communication, leadership).");
  rows.push(["Skills",skillsScore,20]);
  score += skillsScore;

  score = Math.max(0, Math.min(100, score));

  // UI updates
  $("score").textContent = score;
  $("meter").style.width = score + "%";

  const bd = $("breakdown"); bd.innerHTML = "";
  rows.forEach(([label, got, max]) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>${label}</span><span>${got}/${max}</span>`;
    bd.appendChild(row);
  });

  const sug = $("suggestions"); sug.innerHTML = "";
  [...new Set(suggestions)].forEach(s => { const li = document.createElement("li"); li.textContent = s; sug.appendChild(li); });

  // update radar
  updateRadar(skillList);

  // Save last
  const rec = {name, headline, about, exp, skills, score, rows, ts: Date.now()};
  localStorage.setItem("lp_score_last", JSON.stringify(rec));
  refreshBadgeHistory();
  refreshLeaderboard();
}

// ---------------- Keyword optimizer (same as before)
const JOB_KEYWORDS = {
  "frontend developer": ["react","angular","vue","javascript","typescript","css","html","webpack","ui","ux"],
  "devops engineer": ["docker","kubernetes","aws","ci/cd","terraform","ansible","helm","monitoring"],
  "backend developer": ["java","spring","node","python","rest","sql","microservices","postgres","mysql"],
  "data scientist": ["python","pandas","numpy","ml","machine learning","tensorflow","pytorch","statistics"]
};

function keywordOptimize(){
  const target = $("targetJob").value.trim().toLowerCase();
  if(!target){ alert("Enter target job title (e.g., Frontend Developer)."); return; }
  // find closest key
  let bestKey = null;
  Object.keys(JOB_KEYWORDS).forEach(k => { if(target.includes(k.split(" ")[0]) || target.includes(k)) bestKey = k; });
  if(!bestKey){ bestKey = Object.keys(JOB_KEYWORDS).find(k => target.includes(k.split(" ")[0])) || null; }
  if(!bestKey){ // fallback pick by first word
    bestKey = Object.keys(JOB_KEYWORDS).find(k => target.includes(k.split(" ")[0])) || Object.keys(JOB_KEYWORDS)[0];
  }
  const want = JOB_KEYWORDS[bestKey];
  const profileText = ($("headline").value + " " + $("about").value + " " + $("experience").value + " " + $("skills").value).toLowerCase();
  const missing = want.filter(w => !profileText.includes(w));
  alert(`Keywords for "${bestKey}": ${want.join(", ")}\n\nMissing in your profile: ${missing.join(", ") || "None — good!"}`);
}

// ---------------- Radar chart
let radarChart = null;
function updateRadar(skillList){
  const categories = {
    "Tech": ["angular","react","node","java","spring","docker","kubernetes","aws","gcp","azure"],
    "Soft": ["communication","leadership","mentor","team","collaborate","stakeholder","ownership"],
    "Tools": ["docker","git","github","ci/cd","jenkins","helm","terraform","ansible"],
    "Data": ["sql","postgres","mysql","mongodb","pandas","numpy","ml","machine learning"]
  };
  const values = Object.keys(categories).map(cat => {
    const keys = categories[cat];
    let hits = 0;
    keys.forEach(k => { skillList.forEach(s => { if(s.toLowerCase().includes(k)) hits++; }); });
    return Math.min(10, Math.round((hits/Math.max(1, keys.length))*10));
  });
  const labels = Object.keys(categories);
  const ctx = document.getElementById('radarChart').getContext('2d');
  if(radarChart) radarChart.destroy();
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{ label: 'Skill balance', data: values, fill: true, backgroundColor: 'rgba(10,102,194,0.15)', borderColor: '#0A66C2', pointBackgroundColor: '#0A66C2' }]
    },
    options: { scales: { r: { ticks: { beginAtZero:true, max:10 } } }, elements: { line: { borderWidth: 2 } } }
  });
}

// ---------------- AI Headline improver
async function improveHeadline(){
  const key = $("openaiKey").value.trim();
  const current = $("headline").value.trim();
  if(!current){ alert("Enter current headline first."); return; }
  if(!key){
    const verbs = ["Building","Leading","Driving","Designing","Developing"];
    const skills = $("skills").value.split(",").map(s=>s.trim()).filter(Boolean).slice(0,3).join(" • ");
    const improved = `${verbs[Math.floor(Math.random()*verbs.length)]} ${current}${skills? ' • ' + skills: ''}`.trim();
    if(confirm("No API key provided — use offline improved headline?\n\n" + improved)){
      $("headline").value = improved;
    }
    return;
  }
  try{
    const prompt = `Rewrite this LinkedIn headline to be concise, keyword-rich, and attention-grabbing (one short line). Headline: "${current}". Skills: ${$("skills").value}`;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers: {"Content-Type":"application/json","Authorization":"Bearer "+key},
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role:"user", content: prompt }], max_tokens: 60 })
    });
    if(!resp.ok) throw new Error("API error: " + resp.status);
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if(text && confirm("Replace headline with AI suggestion?\n\n"+text)){
      $("headline").value = text;
    }
  }catch(err){
    alert("AI request failed: " + err.message);
  }
}

// ---------------- Badge generation & history
function generateBadge(){
  const last = JSON.parse(localStorage.getItem("lp_score_last")||"null");
  if(!last){ alert("Analyze first!"); return; }
  $("badgeName").textContent = last.name || "Profile";
  $("badgeScore").textContent = `Score: ${last.score}/100`;
  $("badgeLine").textContent = last.headline || "Improve your profile";
  $("badgeWrap").classList.remove("hidden");
}

function downloadBadge(){
  const elm = document.getElementById("badge");
  html2canvas(elm).then(canvas => {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = url; a.download = "profile-badge.png"; a.click();
  });
}

// Save current result to badge history (saves the JSON + dataURL snapshot)
function saveBadgeToHistory(){
  const last = JSON.parse(localStorage.getItem("lp_score_last")||"null");
  if(!last){ alert("Analyze first!"); return; }
  const elm = document.getElementById("badge");
  html2canvas(elm).then(canvas => {
    const dataUrl = canvas.toDataURL("image/png");
    const hist = JSON.parse(localStorage.getItem("lp_badge_history")||"[]");
    const entry = { id: Date.now(), name: last.name||"Profile", score: last.score||0, ts: Date.now(), dataUrl, payload: last };
    hist.push(entry);
    localStorage.setItem("lp_badge_history", JSON.stringify(hist));
    alert("Saved to badge history!");
    refreshBadgeHistory();
    refreshLeaderboard();
  });
}

function refreshBadgeHistory(){
  const wrap = $("badgeHistory");
  wrap.innerHTML = "";
  const hist = JSON.parse(localStorage.getItem("lp_badge_history")||"[]").slice().reverse();
  if(hist.length===0){ wrap.innerHTML = "<div class='muted'>No saved badges yet. Generate and save a badge to see history.</div>"; return; }
  hist.forEach(item => {
    const div = document.createElement("div"); div.className = "hist-item";
    const meta = document.createElement("div"); meta.className = "hist-meta";
    meta.innerHTML = `<div class="leader-name">${item.name}</div><div style="font-size:12px;color:#64748b">Score: ${item.score} • ${new Date(item.ts).toLocaleString()}</div>`;
    const actions = document.createElement("div"); actions.className = "hist-actions";
    const viewBtn = document.createElement("button"); viewBtn.className="btn"; viewBtn.textContent="Load"; viewBtn.addEventListener("click", ()=> loadSavedProfile(item.payload));
    const dlBtn = document.createElement("button"); dlBtn.className="btn"; dlBtn.textContent="Download"; dlBtn.addEventListener("click", ()=> {
      const a = document.createElement("a"); a.href = item.dataUrl; a.download = `${item.name.replace(/\s+/g,'_')}_badge.png`; a.click();
    });
    const delBtn = document.createElement("button"); delBtn.className="btn danger"; delBtn.textContent="Delete"; delBtn.addEventListener("click", ()=> {
      if(!confirm("Delete this saved badge?")) return;
      let arr = JSON.parse(localStorage.getItem("lp_badge_history")||"[]");
      arr = arr.filter(x => x.id !== item.id);
      localStorage.setItem("lp_badge_history", JSON.stringify(arr));
      refreshBadgeHistory(); refreshLeaderboard();
    });
    actions.appendChild(viewBtn); actions.appendChild(dlBtn); actions.appendChild(delBtn);
    div.appendChild(meta); div.appendChild(actions);
    wrap.appendChild(div);
  });
}

// ---------------- Copy suggestions
function copySuggestions(){
  const sugEls = document.querySelectorAll("#suggestions li");
  if(!sugEls.length){ alert("No suggestions to copy — analyze first."); return; }
  const text = Array.from(sugEls).map(li=> "- " + li.textContent).join("\n");
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=> alert("Suggestions copied to clipboard!"));
  } else {
    // fallback
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); alert("Copied!"); } catch { alert("Copy failed — select and copy manually."); }
    ta.remove();
  }
}

// ---------------- Save / export / demo / clear
function demoFill(){
  $("name").value = "Prajakta Satav";
  $("headline").value = "Full-Stack Developer (Angular + Spring Boot) — Building scalable microservices on AWS";
  $("about").value = "Full-stack engineer with 6+ years experience building high-impact products. Led migration to Angular 17 and Spring Boot microservices, improving performance by 40%. Designed CI/CD pipelines, containerized services with Docker & Kubernetes, and implemented cost optimization saving 25%. Passionate about clean architecture, testing, and mentoring junior devs. Open to new opportunities.";
  $("experience").value = "- Built microservice architecture for payments; reduced latency by 32%\n- Led a team of 5 to deliver Angular 17 SPA with lazy loading\n- Migrated monolith to Spring Boot + PostgreSQL on AWS\n- Implemented CI/CD with GitHub Actions, Docker, and Helm";
  $("skills").value = "Angular, Java, Spring Boot, Microservices, AWS, Docker, Kubernetes, PostgreSQL, REST, GitHub Actions, Unit Testing, Leadership, Communication";
  analyze();
}
function clearAll(){
  ["name","headline","about","experience","skills","targetJob"].forEach(id=>$(id).value="");
  $("score").textContent="0"; $("meter").style.width="0%"; $("breakdown").innerHTML=""; $("suggestions").innerHTML=""; if(radarChart) radarChart.destroy();
  localStorage.removeItem("lp_score_last");
}
function saveLocal(){
  const last = localStorage.getItem("lp_score_last"); if(!last){ alert("Analyze first!"); return; }
  const arr = JSON.parse(localStorage.getItem("lp_score_saved")||"[]"); arr.push(JSON.parse(last)); localStorage.setItem("lp_score_saved", JSON.stringify(arr)); alert("Saved locally.");
  refreshLeaderboard();
}
function exportJSON(){
  const last = localStorage.getItem("lp_score_last"); if(!last){ alert("Analyze first!"); return; }
  const blob = new Blob([last], {type:"application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "linkedin_profile_score.json"; a.click(); URL.revokeObjectURL(url);
}

// ---------------- Leaderboard (top N saved results)
function refreshLeaderboard(){
  const saved = JSON.parse(localStorage.getItem("lp_score_saved")||"[]");
  const hist = JSON.parse(localStorage.getItem("lp_badge_history")||"[]");
  // combine both sources into one set
  const combined = saved.concat(hist.map(h=>h.payload || {}));
  if(combined.length===0){ $("leaderboard").innerHTML = "<div class='muted'>No saved data yet. Save results or badge history to populate leaderboard.</div>"; return; }
  // sort by score desc
  const sorted = combined.slice().sort((a,b)=> (b.score||0) - (a.score||0)).slice(0,10);
  const lb = $("leaderboard"); lb.innerHTML = "";
  sorted.forEach(item => {
    const row = document.createElement("div"); row.className = "leader-row";
    row.innerHTML = `<div><div class="leader-name">${item.name || 'Profile'}</div><div style="font-size:12px;color:#64748b">${new Date(item.ts||Date.now()).toLocaleString()}</div></div><div><div class="leader-score">${item.score||0}</div></div>`;
    row.addEventListener("click", ()=> loadSavedProfile(item));
    lb.appendChild(row);
  });
}

// Load saved profile into form
function loadSavedProfile(obj){
  if(!obj){ alert("No data to load."); return; }
  $("name").value = obj.name || "";
  $("headline").value = obj.headline || "";
  $("about").value = obj.about || "";
  $("experience").value = obj.exp || "";
  $("skills").value = obj.skills || "";
  analyze();
}

// Clear all saved data (confirm)
function clearAllSaved(){
  if(!confirm("Clear ALL saved results, badge history and leaderboard? This cannot be undone.")) return;
  localStorage.removeItem("lp_score_saved");
  localStorage.removeItem("lp_badge_history");
  localStorage.removeItem("lp_score_last");
  refreshBadgeHistory(); refreshLeaderboard();
  alert("Cleared.");
}

// ---------------- Event bindings
document.getElementById("analyze").addEventListener("click", analyze);
document.getElementById("demo").addEventListener("click", demoFill);
document.getElementById("clear").addEventListener("click", clearAll);
document.getElementById("save").addEventListener("click", saveLocal);
document.getElementById("export").addEventListener("click", exportJSON);
document.getElementById("keywordCheck").addEventListener("click", keywordOptimize);
document.getElementById("improveHeadline").addEventListener("click", improveHeadline);
document.getElementById("badgeBtn").addEventListener("click", generateBadge);
document.getElementById("downloadBadge").addEventListener("click", downloadBadge);
document.getElementById("saveBadgeHistory").addEventListener("click", saveBadgeToHistory);
document.getElementById("copySug").addEventListener("click", copySuggestions);
document.getElementById("clearHistory").addEventListener("click", clearAllSaved);

// Autoload last and refresh UI pieces
window.addEventListener("DOMContentLoaded", ()=>{ 
  const last = JSON.parse(localStorage.getItem("lp_score_last")||"null");
  if(last){
    $("name").value=last.name||"";
    $("headline").value=last.headline||"";
    $("about").value=last.about||"";
    $("experience").value=last.exp||"";
    $("skills").value=last.skills||"";
    $("score").textContent=last.score||0;
    $("meter").style.width=(last.score||0)+"%";
    if(last.rows){
      const bd=$("breakdown"); bd.innerHTML="";
      last.rows.forEach(([label,got,max])=>{ const row=document.createElement("div"); row.className='row'; row.innerHTML=`<span>${label}</span><span>${got}/${max}</span>`; bd.appendChild(row); });
    }
    updateRadar((last.skills||'').split(',').map(s=>s.trim()).filter(Boolean));
  }
  refreshBadgeHistory();
  refreshLeaderboard();
});
