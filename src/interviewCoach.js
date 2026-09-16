import { cloudEnabled, supabase } from "./supabase";

export async function askInterviewCoach({ mode = "follow-up", question, answer, job, language = "zh-CN" }) {
  if (!cloudEnabled || !supabase) throw new Error("请先连接私有 Supabase，才能使用 AI 模拟追问。");
  const { data, error } = await supabase.functions.invoke("interview-coach", { body: { mode, question, answer, job, language } });
  if (error) throw new Error(error.message || "AI 助手暂时不可用");
  return data;
}
