"use client";
import { useState } from "react";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function EmotionChatModal({ emotion, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = { role: "user", content: newMessage };
    setMessages([...messages, userMessage]);
    setNewMessage("");
    setIsLoading(true);

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `당신은 사용자의 '${emotion.name}' 감정에 대해 이야기를 나누는 상담사입니다. 공감하고 이해하는 태도로 대화해주세요 그리고 사용자의 솔직한 현재 감정을 이끓어 낼 수 있도록 도움을 주세요.`,
          },
          ...messages,
          userMessage,
        ],
      });

      setMessages((prev) => [...prev, response.choices[0].message]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const userMessages = messages
        .filter((msg) => msg.role === "user")
        .map((msg) => msg.content)
        .join(" ");

      const prompt = `Create an artistic representation that captures the following emotional context:
        Current emotion: ${emotion.name}
        User's expressions: ${userMessages}
        
        Style guidelines:
        - Make it abstract and emotionally evocative
        - Use colors and shapes that reflect the emotional state
        - Create a meaningful composition that represents the user's feelings
        - Keep it suitable for a therapeutic context`;

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });

      setGeneratedImage(response.data[0].url);
    } catch (error) {
      console.error("Error generating image:", error);
    }
    setIsGeneratingImage(false);
  };

  const handleDownloadImage = () => {
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `emotion-art-${new Date().getTime()}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">
            {emotion.emoji} {emotion.name} 감정을 표현해보기
          </h2>
          <h4>대화를 통해 당신의 감정을 솔직하게 표현해보세요 </h4>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={handleGenerateImage}
            disabled={isGeneratingImage}
            className="mb-4 w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            {isGeneratingImage
              ? "이미지 생성 중..."
              : "내 감정을 그림으로 나타내기"}
          </button>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-2 border rounded"
              placeholder="메시지를 입력하세요..."
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              전송
            </button>
          </form>
        </div>
      </div>

      {generatedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[600px] mx-4 relative">
            {" "}
            {/* max-w-3xl을 w-[600px]로 변경 */}
            <button
              onClick={() => setGeneratedImage(null)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-500 hover:text-gray-700 z-50"
            >
              ✕
            </button>
            <div className="mb-4">
              <h3 className="text-xl font-bold">생성된 감정 이미지</h3>
            </div>
            <img
              src={generatedImage}
              alt="Generated emotion art"
              className="w-full h-auto rounded-lg object-contain" /* object-contain 추가 */
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleDownloadImage}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                이미지 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
