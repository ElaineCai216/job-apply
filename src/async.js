export async function withTimeout(promise, label = "请求", milliseconds = 12000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}超时，请检查网络后重试`)), milliseconds); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
