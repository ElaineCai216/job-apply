export function supportsSpeechInput() { return Boolean(window.ApplyDeskVoice || window.webkit?.messageHandlers?.applyDeskVoice || window.SpeechRecognition || window.webkitSpeechRecognition); }

export function startSpeechInput({ language = "zh-CN", onText, onEnd, onError }) {
  if(window.ApplyDeskVoice){return window.ApplyDeskVoice.start({language,onText,onEnd,onError})}
  if(window.webkit?.messageHandlers?.applyDeskVoice){const id=crypto.randomUUID();window.__applyDeskVoiceResult=(message)=>{if(message.id!==id)return;if(message.error)onError?.(message.error);if(message.text)onText(message.text);if(message.done)onEnd?.()};window.webkit.messageHandlers.applyDeskVoice.postMessage({action:"start",id,language});return()=>window.webkit.messageHandlers.applyDeskVoice.postMessage({action:"stop",id})}
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) throw new Error("此设备暂不支持本地语音转写；你仍可直接输入文字。");
  const recognition = new Recognition();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = event => {
    let text = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) text += event.results[i][0].transcript;
    onText(text);
  };
  recognition.onerror = event => onError?.(event.error === "not-allowed" ? "请允许麦克风与语音识别权限。" : `语音转写失败：${event.error}`);
  recognition.onend = () => onEnd?.();
  recognition.start();
  return () => recognition.stop();
}
