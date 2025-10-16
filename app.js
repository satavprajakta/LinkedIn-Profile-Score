// LinkedIn Profile Score — client-side
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
  if(countMatches(skillList.join(" "), SOFT_HINTS)>=2) skillsScore += 4; else suggestions.push("Add 2–3 soft skills (communication, leadership, mentoring).");
  rows.push(["Skills",skillsScore,20]);
  score += skillsScore;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // UI updates
  $("score").textContent = score;
  $("meter").style.width = score + "%";

  const bd = $("breakdown");
  bd.innerHTML = "";
  rows.forEach(([label, got, max]) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>${label}</span><span>${got}/${max}</span>`;
    bd.appendChild(row);
  });

  const sug = $("suggestions");
  sug.innerHTML = "";
  // Deduplicate suggestions
  [...new Set(suggestions)].forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;
    sug.appendChild(li);
  });

  // Save last
  localStorage.setItem("lp_score_last", JSON.stringify({name, headline, about, exp, skills, score, rows, ts: Date.now()}));
}

$("analyze").addEventListener("click", analyze);

$("demo").addEventListener("click", () => {
  $("name").value = "Prajakta Satav";
  $("headline").value = "Full‑Stack Developer (Angular + Spring Boot) — Building scalable microservices on AWS";
  $("about").value = "Full‑stack engineer with 6+ years experience building high‑impact products. Led migration to Angular 17 and Spring Boot microservices, improving performance by 40%. Designed CI/CD pipelines, containerized services with Docker & Kubernetes, and implemented cost optimization saving 25%. Passionate about clean architecture, testing, and mentoring junior devs. Open to new opportunities.";
  $("experience").value = "- Built microservice architecture for payments; reduced latency by 32%\n- Led a team of 5 to deliver Angular 17 SPA with lazy loading\n- Migrated monolith to Spring Boot + PostgreSQL on AWS\n- Implemented CI/CD with GitHub Actions, Docker, and Helm";
  $("skills").value = "Angular, Java, Spring Boot, Microservices, AWS, Docker, Kubernetes, PostgreSQL, REST, GitHub Actions, Unit Testing, Leadership, Communication";
});

$("clear").addEventListener("click", () => {
  ["name","headline","about","experience","skills"].forEach(id => $(id).value = "");
  $("score").textContent = "0";
  $("meter").style.width = "0%";
  $("breakdown").innerHTML = "";
  $("suggestions").innerHTML = "";
  localStorage.removeItem("lp_score_last");
});

$("save").addEventListener("click", () => {
  const last = localStorage.getItem("lp_score_last");
  if(!last){ alert("Analyze first!"); return; }
  const arr = JSON.parse(localStorage.getItem("lp_score_saved") || "[]");
  arr.push(JSON.parse(last));
  localStorage.setItem("lp_score_saved", JSON.stringify(arr));
  alert("Saved locally. You can view it later from localStorage.");
});

$("export").addEventListener("click", () => {
  const last = localStorage.getItem("lp_score_last");
  if(!last){ alert("Analyze first!"); return; }
  const blob = new Blob([last], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "linkedin_profile_score.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Autoload last session
window.addEventListener("DOMContentLoaded", () => {
  const last = JSON.parse(localStorage.getItem("lp_score_last") || "null");
  if(last){
    $("name").value = last.name || "";
    $("headline").value = last.headline || "";
    $("about").value = last.about || "";
    $("experience").value = last.exp || "";
    $("skills").value = last.skills || "";
    $("score").textContent = last.score || 0;
    $("meter").style.width = (last.score||0) + "%";
    if (last.rows){
      const bd = $("breakdown"); bd.innerHTML = "";
      last.rows.forEach(([label, got, max]) => {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<span>${label}</span><span>${got}/${max}</span>`;
        bd.appendChild(row);
      });
    }
  }
});
