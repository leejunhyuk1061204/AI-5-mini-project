import React, { useEffect, useState } from "react";
import { uploadMeetingAudio, generateMinutes } from "../api/meetingApi";

type SttConversionProps = {
  file: File;
  onCancel: () => void;
};

const SttConversion: React.FC<SttConversionProps> = ({ file, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        // 1) 업로드
        const uploadRes = await uploadMeetingAudio(file);

   
        const genRes = await generateMinutes();

        const text = `✅ 업로드 응답\n${JSON.stringify(uploadRes, null, 2)}\n\n✅ 생성 응답\n${JSON.stringify(
          genRes,
          null,
          2
        )}\n\n(현재 백엔드 generate는 결과 텍스트가 아니라 'generate ok' 메시지만 반환합니다.)`;

        setResult(text);
      } catch (e: any) {
        setResult(e?.message ?? "회의록 생성 실패");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [file]);

  return (
    <div className="flex flex-col gap-4 p-6 bg-white dark:bg-[#1a1f2b] rounded-lg shadow">
      <h2 className="text-xl font-bold">회의록 생성</h2>

      {loading ? (
        <p className="text-gray-500">서버에 업로드하고 분석 중...</p>
      ) : (
        <pre className="whitespace-pre-wrap text-sm bg-gray-100 dark:bg-[#101622] p-4 rounded">
          {result}
        </pre>
      )}

      <button
        onClick={onCancel}
        className="self-end px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm"
      >
        돌아가기
      </button>
    </div>
  );
};

export default SttConversion;
