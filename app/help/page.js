"use client";
import { useState, useEffect } from "react";
import { db, auth } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import styles from "./page.module.css";

export default function HelpPage() {
  const [riskyChatRooms, setRiskyChatRooms] = useState([]);

  useEffect(() => {
    const fetchRiskyChatRooms = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const roomsRef = collection(db, `users/${user.uid}/chatRooms`);
      const q = query(roomsRef, where("needsHelp", "==", true));

      const snapshot = await getDocs(q);
      const rooms = [];
      snapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() });
      });

      setRiskyChatRooms(rooms);
    };

    fetchRiskyChatRooms();
  }, []);

  const handleRequestHelp = async (room) => {
    try {
      // 이메일 전송 API 호출
      const response = await fetch("/api/send-help-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: room.id,
          userName: auth.currentUser?.displayName || "익명",
          roomName: room.name,
          summary: room.lastMessage || "대화 내용 없음",
        }),
      });

      if (response.ok) {
        alert("도움 요청이 전송되었습니다.");
      }
    } catch (error) {
      console.error("Error sending help request:", error);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>도움이 필요한 대화</h1>
      <div className={styles.roomList}>
        {riskyChatRooms.map((room) => (
          <div key={room.id} className={styles.roomItem}>
            <div className={styles.roomInfo}>
              <h3>{room.name}</h3>
              <p>{room.lastMessage}</p>
            </div>
            <div className={styles.actions}>
              <button
                onClick={() => handleRequestHelp(room)}
                className={styles.helpButton}
              >
                도움 요청하기
              </button>
              <button
                onClick={() => handleDelete(room.id)}
                className={styles.deleteButton}
              >
                삭제하기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
