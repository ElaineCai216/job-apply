import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

const safe = (value) => String(value || "").replace(/[\\/:*?"<>|]/g, "-");
const linesFor = (job) => [
  `${job.company} · ${job.role}`,
  `材料语言：${job.language === "auto" ? "跟随 JD" : job.language}`,
  "", "简历微调", job.resumeTailoring || "待补", "", "Personal Statement", job.personalStatement || "待补",
  "", "投递注意点", job.applicationNotes || "待补"
];

export async function downloadDocx(job) {
  const doc = new Document({ sections: [{ children: linesFor(job).map((line, index) => new Paragraph({ heading: index === 0 ? HeadingLevel.TITLE : undefined, children: [new TextRun(line)] })) }] });
  const blob = await Packer.toBlob(doc); download(blob, `${safe(job.company)}-${safe(job.role)}-materials.docx`);
}

export function downloadPdf(job) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  pdf.setFont("helvetica"); let y = 48;
  linesFor(job).forEach((line, index) => {
    pdf.setFontSize(index === 0 ? 17 : 10.5);
    const chunks = pdf.splitTextToSize(line || " ", 500);
    if (y + chunks.length * 15 > 790) { pdf.addPage(); y = 48; }
    pdf.text(chunks, 48, y); y += Math.max(18, chunks.length * 15);
  });
  pdf.save(`${safe(job.company)}-${safe(job.role)}-materials.pdf`);
}

function download(blob, name) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
