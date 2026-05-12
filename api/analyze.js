export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
 
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }
 
  try {
    const { imageB64, mimeType } = req.body;
 
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType || "image/jpeg", data: imageB64 } },
              { text: `이 달력 이미지에서 모든 일정을 추출하세요. 손글씨도 최대한 읽어주세요. 반드시 JSON 배열만 반환하세요. 설명이나 마크다운 없이 순수 JSON만. 형식: [{"title":"일정명","date":"YYYY-MM-DD","time":"HH:MM 또는 null","notes":"기타 또는 null"}] 연도 기준: ${new Date().getFullYear()}. 일정 없으면 [].` }
            ]
          }]
        })
      }
    );
 
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return res.status(500).json({ error: "Gemini 응답 오류: " + text.slice(0, 200) });
    }
 
    if (data.error) throw new Error(data.error.message);
 
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
 
    return res.status(200).json({ events: Array.isArray(parsed) ? parsed : [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
