const BASE_URL = "http://127.0.0.1:8001";

// Swagger에 나온 경로 그대로 사용
const UPLOAD_URL = `${BASE_URL}/api/meeting/api/meeting/upload`;
const GENERATE_URL = `${BASE_URL}/api/meeting/api/meeting/generate`;

export async function uploadMeetingAudio(file: File) {
  const formData = new FormData();
  formData.append("file", file); // 대부분 file 맞음

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload 실패: ${res.status} ${text}`);
  }

  return res.json();
}


export async function generateMinutes(payload?: any) {
  const hasPayload = payload !== undefined && payload !== null;

  const res = await fetch(GENERATE_URL, {
    method: "POST",
    ...(hasPayload
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Generate 실패: ${res.status} ${text}`);
  }

  // Swagger에서 generate 응답이 JSON { message: "generate ok" } 였으니 json으로 받기
  return res.json();
}
