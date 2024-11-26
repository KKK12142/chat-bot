"use client";
import { useState } from "react";
import EmotionCard from "../../components/EmotionCard";
import EmotionChatModal from "../../components/EmotionChatModal";
import styles from "./page.module.css";

export default function EmotionPage() {
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const emotions = [
    { emoji: "😊", name: "기쁨", description: "행복하고 즐거운 감정" },
    { emoji: "😢", name: "슬픔", description: "우울하고 슬픈 감정" },
    { emoji: "😡", name: "화남", description: "화나고 짜증나는 감정" },
    { emoji: "😰", name: "불안", description: "걱정되고 불안한 감정" },
    { emoji: "😌", name: "평온", description: "차분하고 평화로운 감정" },
    { emoji: "🤔", name: "고민", description: "생각이 많고 복잡한 감정" },
    { emoji: "😴", name: "피곤", description: "지치고 피곤한 감정" },
    { emoji: "😳", name: "당황", description: "놀랍고 당황스러운 감정" },
    { emoji: "🥺", name: "외로움", description: "쓸쓸하고 외로운 감정" },
  ];

  const handleCardClick = (emotion) => {
    setSelectedEmotion(emotion);
    setIsModalOpen(true);
  };

  const handleModalConfirm = () => {
    setIsModalOpen(false);
    setIsChatModalOpen(true);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>현재 감정 선택하기</h1>
      <p className={styles.subtitle}>지금 느끼고 있는 감정을 선택해주세요.</p>
      <div className={styles.cardGrid}>
        {emotions.map((emotion) => (
          <EmotionCard
            key={emotion.name}
            emotion={emotion}
            onClick={() => handleCardClick(emotion)}
          />
        ))}
      </div>

      {/* 감정 선택 확인 모달 */}
      {isModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <h2>감정 선택</h2>
            <p>{`'${selectedEmotion?.name}' 감정을 선택하시겠습니까?`}</p>
            <div className={styles.modalButtons}>
              <button onClick={() => setIsModalOpen(false)}>취소</button>
              <button onClick={handleModalConfirm}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 감정 대화 모달 */}
      {isChatModalOpen && (
        <EmotionChatModal
          emotion={selectedEmotion}
          onClose={() => setIsChatModalOpen(false)}
        />
      )}
    </div>
  );
}
