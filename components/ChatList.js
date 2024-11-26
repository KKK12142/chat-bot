"use client";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import styles from "./ChatList.module.css";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default function ChatList() {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    name: "",
    description: "",
  });

  const handleAddRoom = async () => {
    setIsModalOpen(true);
  };

  const handleCreateRoom = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const newRoom = {
        name: newRoomData.name || "새로운 상담",
        description: newRoomData.description || "상담을 시작해보세요",
        type: "general",
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageTime: null,
      };

      const roomsRef = collection(db, `users/${user.uid}/chatRooms`);
      const docRef = await addDoc(roomsRef, newRoom);
      setIsModalOpen(false);
      router.push(`/chatroom/${docRef.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user found");
      router.push("/login");
      return;
    }

    console.log("Fetching rooms for user:", user.uid);

    // 쿼리 정의
    const q = query(
      collection(db, `users/${user.uid}/chatRooms`),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Fetched rooms:", rooms);
      setChatRooms(rooms);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const getEmotionBars = (score = 50) => {
    // 50을 기준으로 긍정/부정 분리
    const negativeScore = score > 50 ? score : 0;
    const positiveScore = score <= 50 ? 100 - score : 0;

    return {
      negative: { height: `${negativeScore}%` },
      positive: { height: `${positiveScore}%` },
    };
  };

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    // 24시간 이내의 메시지는 시:분으로 표시
    if (diffInHours < 24) {
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    // 24시간 이상 지난 메시지는 월/일로 표시
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return <div className={styles.loading}>채팅방 목록을 불러오는 중...</div>;
  }

  return (
    <div className={styles.chatList}>
      <div className={styles.header}>
        <h2>상담 채팅방</h2>
        <p className="font-normal text-gray-500 text-sm">
          버튼을 눌러 새로운 상담 주제를 정하거나 필요한 내용을 말해주세요
        </p>
        <button onClick={handleAddRoom} className={styles.addButton}>
          + 새 상담 시작하기
        </button>
      </div>
      <div className={styles.roomList}>
        {chatRooms.length === 0 ? (
          <div className="flex-1">
            <div className="flex flex-col items-center justify-center h-full pt-40">
              <p className="text-lg font-semibold">아직 채팅방이 없습니다.</p>
              <p className="text-sm text-gray-500">
                새로운 상담을 시작해보세요!
              </p>
            </div>
          </div>
        ) : (
          chatRooms.map((room) => (
            <div
              key={room.id}
              className={styles.chatRoom}
              onClick={() => router.push(`/chatroom/${room.id}`)}
            >
              <div className={styles.emotionBar}>
                <div
                  className={styles.negativeEmotionFill}
                  style={getEmotionBars(room.emotionalScore).negative}
                />
                <div
                  className={styles.positiveEmotionFill}
                  style={getEmotionBars(room.emotionalScore).positive}
                />
              </div>
              <div className={styles.chatRoomInfo}>
                <div className={styles.chatRoomHeader}>
                  <h3>{room.name}</h3>
                  <span className={styles.timestamp}>
                    {formatLastMessageTime(room.lastMessageTime)}
                  </span>
                </div>
                <p className={styles.description}>{room.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">새로운 상담방 만들기</h2>
            <input
              type="text"
              placeholder="상담방 이름"
              className="w-full p-2 mb-4 border rounded"
              value={newRoomData.name}
              onChange={(e) =>
                setNewRoomData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <input
              type="text"
              placeholder="상담방 설명"
              className="w-full p-2 mb-4 border rounded"
              value={newRoomData.description}
              onChange={(e) =>
                setNewRoomData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                취소
              </button>
              <button
                onClick={handleCreateRoom}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
