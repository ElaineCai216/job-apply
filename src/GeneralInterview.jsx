import React from "react";
import { dbAll, dbPut } from "./localDb";

const SEED = [
  ["intro", "请用 90 秒介绍自己，并说明为什么适合分析类岗位。"],
  ["behavior", "讲一个你把复杂问题拆解并推动落地的经历。"],
  ["technical", "如何用 SQL 找出连续三个月活跃的用户？"],
  ["case", "某业务转化率下降 20%，你会如何定位原因？"],
  ["finance", "解释一个你熟悉的金融指标，以及它的局限。"],
  ["english", "Tell me about a project where your analysis changed a decision."],
  ["closing", "你会如何向面试官反问，判断团队是否适合你？"],
];
const LABELS = { all: "混合题库", intro: "自我介绍", behavior: "行为 / STAR", technical: "技术题", case: "商业案例", finance: "金融 / 风险", english: "英文面试", closing: "反问与流程", starred: "星标待练", favorites: "收藏复练" };

export default function GeneralInterview() {
  const [items, setItems] = React.useState([]), [filter, setFilter] = React.useState("all"), [active, setActive] = React.useState(null), [answer, setAnswer] = React.useState("");
  const load = React.useCallback(async () => { const saved = await dbAll("interviewPrep"); const map = new Map(saved.map(x => [x.id, x])); const merged = SEED.map(([category, text], i) => map.get(`general-${i}`) || { id: `general-${i}`, scope: "general", category, text, starred: false, favorite: false, practicedAt: "", answer: "" }); setItems([...merged, ...saved.filter(x => x.scope === "general" && !map.has(x.id))]); }, []);
  React.useEffect(() => { load(); }, [load]);
  const save = async (item) => { await dbPut("interviewPrep", item); setItems(xs => xs.map(x => x.id === item.id ? item : x)); };
  const visible = items.filter(x => filter === "all" ? true : filter === "starred" ? x.starred : filter === "favorites" ? x.favorite : x.category === filter);
  const practice = async () => { if (!active) return; const next = { ...active, answer, practicedAt: new Date().toISOString() }; await save(next); setActive(null); setAnswer(""); };
  return <section className="general-interview panel">
    <div className="panel-head"><div><p className="eyebrow">GENERAL INTERVIEW LAB</p><h2>通用面试训练中心</h2></div><span className="practice-count">{items.filter(x => x.starred).length} 个星标待练</span></div>
    <p className="interview-intro">没有真实面试也可以每天练习；收到面试后，再把岗位专属题目接入对应岗位。</p>
    <div className="question-tabs">{Object.entries(LABELS).map(([key, label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}</div>
    <div className="question-list">{visible.map(item => <article className="question-card" key={item.id}><div className="question-main"><span className="question-category">{LABELS[item.category]}</span><strong>{item.text}</strong>{item.practicedAt && <small>上次练习：{new Date(item.practicedAt).toLocaleDateString()}</small>}</div><div className="question-actions"><button aria-label="星标待练" className={item.starred ? "marked" : ""} onClick={() => save({ ...item, starred: !item.starred })}>★</button><button aria-label="收藏复练" className={item.favorite ? "marked favorite" : ""} onClick={() => save({ ...item, favorite: !item.favorite })}>♡</button><button className="secondary" onClick={() => { setActive(item); setAnswer(item.answer || ""); }}>练习</button></div></article>)}</div>
    {active && <div className="practice-box"><strong>{active.text}</strong><textarea autoFocus value={answer} onChange={e => setAnswer(e.target.value)} placeholder="写下你的回答或复盘要点…"/><div><button className="secondary" onClick={() => setActive(null)}>稍后练</button><button className="primary" onClick={practice}>保存练习</button></div></div>}
  </section>;
}
