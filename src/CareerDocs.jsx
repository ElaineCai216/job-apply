import React from "react";
import systemGuide from "../docs/求职填报系统说明.md?raw";
import tailoringFlow from "../docs/简历定制流程.md?raw";
import tailoringSop from "../docs/简历针对性调整SOP.md?raw";
import emailTemplates from "../docs/邮件投递模板.md?raw";

const DOCS=[
  ["system","求职填报系统说明",systemGuide,"完整工作流、数据字段和操作边界"],
  ["flow","简历定制流程",tailoringFlow,"按 JD 制作中英文岗位版本"],
  ["sop","简历针对性调整 SOP",tailoringSop,"简历真实性、证据与审核标准"],
  ["email","邮件投递模板",emailTemplates,"中英文投递、内推和跟进邮件"],
];

export default function CareerDocs(){const[selected,setSelected]=React.useState(DOCS[0]);const download=()=>{const a=document.createElement("a"),url=URL.createObjectURL(new Blob([selected[2]],{type:"text/markdown;charset=utf-8"}));a.href=url;a.download=`${selected[1]}.md`;a.click();URL.revokeObjectURL(url)};return <div className="docs-layout"><aside className="docs-list">{DOCS.map(doc=><button key={doc[0]} className={selected[0]===doc[0]?"active":""} onClick={()=>setSelected(doc)}><strong>{doc[1]}</strong><span>{doc[3]}</span></button>)}</aside><article className="doc-reader"><header><div><p className="eyebrow">CAREER KNOWLEDGE BASE</p><h2>{selected[1]}</h2></div><button className="secondary" onClick={download}>下载 Markdown</button></header><pre>{selected[2]}</pre></article></div>}
