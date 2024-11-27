"use client";
import { useState, useEffect, useRef } from "react";
import { auth, db } from "../../../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  increment,
} from "firebase/firestore";
import AuthCheck from "../../../components/AuthCheck";
import createChatCompletion from "../../../components/openai";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import LoadingDots from "../../../components/LoadingDots";
import { analyzeSentiment } from "../../../components/openai";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../mission/mission.module.css";
import { generateMission } from "../../../components/openai";

export default function ChatRoom() {
  const params = useParams();
  const roomId = params.roomId;
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const messagesContainerRef = useRef(null);
  const [notification, setNotification] = useState(null);
  const [currentMission, setCurrentMission] = useState(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [lastMissionTime, setLastMissionTime] = useState(null);
  const [missionCount, setMissionCount] = useState(0);
  const [isGeneratingMission, setIsGeneratingMission] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user in ChatRoom");
      router.push("/login");
      return;
    }

    if (!roomId) {
      console.log("No roomId provided");
      router.push("/chatlist");
      return;
    }

    console.log("Accessing room:", roomId);

    const q = query(
      collection(db, `users/${user.uid}/chatRooms/${roomId}/messages`),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [roomId, router]);

  useEffect(() => {
    const userMessages = messages.filter((msg) => msg.role === "user");
    setUserMessageCount(userMessages.length);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 필터링 및 표시 로직 개선
  useEffect(() => {
    const messageLimit = 15;
    const startIndex = Math.max(0, messages.length - messageLimit);

    setDisplayMessages(messages.slice(startIndex));
    setHasMore(messages.length > messageLimit);
  }, [messages]);

  // 스크롤 이벤트 핸들러
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore) return;

    // 스크롤이 상단에 가까워졌을 때 (50px)
    if (container.scrollTop === 0) {
      const currentLength = displayMessages.length;
      const newMessages = messages.slice(
        Math.max(0, messages.length - (currentLength + 15)),
        messages.length - currentLength
      );

      if (newMessages.length > 0) {
        const previousHeight = container.scrollHeight;

        setDisplayMessages((prev) => [...newMessages, ...prev]);

        // 스크롤 위치 유지를 위해 새로운 컨텐츠가 가된 후의 높이 차이만큼 스크롤
        setTimeout(() => {
          const newHeight = container.scrollHeight;
          container.scrollTop = newHeight - previousHeight;
        }, 0);
      } else {
        setHasMore(false);
      }
    }
  };

  // 새 메시지가 추가될 때만 스크롤 하단으로
  useEffect(() => {
    if (
      displayMessages.length > 0 &&
      displayMessages[displayMessages.length - 1].id ===
        messages[messages.length - 1].id
    ) {
      scrollToBottom();
    }
  }, [displayMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    const userMessage = newMessage;
    setNewMessage("");
    const user = auth.currentUser;

    if (!user) {
      console.error("No authenticated user");
      setLoading(false);
      return;
    }

    try {
      // 1. 사용자 메시지 저장
      await addDoc(
        collection(db, `users/${user.uid}/chatRooms/${roomId}/messages`),
        {
          content: userMessage,
          role: "user",
          timestamp: serverTimestamp(),
        }
      );

      // 2. 현재 메시지 카운트 확인 및 감정 분석
      const currentCount = userMessageCount + 1;
      console.log("Current user message count:", currentCount);

      if (currentCount % 5 === 0) {
        const recentUserMessages = messages
          .filter((msg) => msg.role === "user")
          .slice(-5)
          .map((msg) => msg.content)
          .join("\n");

        const newSentimentScore = await analyzeSentiment(recentUserMessages);

        // 현재 감정 점수를 가져옵니다
        const roomRef = doc(db, `users/${user.uid}/chatRooms/${roomId}`);
        const roomDoc = await getDoc(roomRef);
        const currentScore = roomDoc.data()?.emotionalScore || 50; // 기본값 50

        // 새로운 점수와 현재 점수를 가중 평균으로 계산
        // 새로운 점수는 30%, 기존 점수는 70%의 가중치를 둡니다
        const weightedScore = Math.round(
          currentScore * 0.7 + newSentimentScore * 0.3
        );

        await updateDoc(roomRef, {
          emotionalScore: weightedScore,
          needsHelp: weightedScore > 75,
          lastAnalysis: serverTimestamp(),
        });
      }

      // 3. AI 응답 받기 및 저장
      const updatedHistory = await createChatCompletion(userMessage, messages);
      const assistantMessage = updatedHistory[updatedHistory.length - 1];

      // AI 응답 저장
      await addDoc(
        collection(db, `users/${user.uid}/chatRooms/${roomId}/messages`),
        {
          content: assistantMessage.content,
          role: "assistant",
          timestamp: serverTimestamp(),
        }
      );

      // 4. 채팅방 마지막 메시지 업데이트
      await updateDoc(doc(db, `users/${user.uid}/chatRooms/${roomId}`), {
        lastMessage: assistantMessage.content,
        lastMessageTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      // 사용자에게 오류 알림
      setNotification("메시지 전송 중 오류가 발생했습니다.");
      setNotificationVisible(true);
      setTimeout(() => {
        setNotificationVisible(false);
        setNotification(null);
      }, 3000);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  // loading 상태가 변경될 때마다 포커스 유지
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  // 메시지 5개마다 미션 생성 로직 추가
  useEffect(() => {
    const checkAndGenerateMission = async () => {
      if (isGeneratingMission) return; // 이미 생성 중이면 중복 실행 방지

      if (shouldGenerateMission(messages, lastMissionTime, missionCount)) {
        try {
          setIsGeneratingMission(true);
          const recentMessages = messages
            .slice(-3)
            .map((msg) => msg.content)
            .join("\n");

          const mission = await generateMission(recentMessages);
          if (mission) {
            setCurrentMission(mission);
            setShowMissionModal(true);
          }
        } catch (error) {
          console.error("미션 생성 중 오류 발생:", error);
        } finally {
          setIsGeneratingMission(false);
        }
      }
    };

    checkAndGenerateMission();
  }, [messages, lastMissionTime, missionCount, isGeneratingMission]);

  const handleAcceptMission = async () => {
    const user = auth.currentUser;
    try {
      // 미션 저장
      await addDoc(collection(db, `users/${user.uid}/missions`), {
        ...currentMission,
        status: "accepted",
        createdAt: serverTimestamp(),
        chatRoomId: roomId,
      });

      // 채팅방의 미션 데이터 업데이트
      const roomRef = doc(db, `users/${user.uid}/chatRooms/${roomId}`);
      await updateDoc(roomRef, {
        lastMissionTime: serverTimestamp(),
        missionCount: increment(1),
      });

      setShowMissionModal(false);
      setNotification("미션이 수락되었습니다! 👍");
      setNotificationVisible(true);
      setMissionCount((prev) => prev + 1);

      // 3초 후 알림 숨기기
      setTimeout(() => {
        setNotificationVisible(false);
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error("미션 수락 중 오류 발생:", error);
    }
  };

  const handleRejectMission = () => {
    setShowMissionModal(false);
    setTimeout(() => {
      setCurrentMission(null);
      setNotification("미션이 거절되었습니다.");
    }, 200); // 애니메이션이 끝난 후 상태 변경
    setTimeout(() => setNotification(null), 3000);
  };

  // 컴포넌트 마운트 시 마지막 미션 시간 불러오기
  useEffect(() => {
    const loadMissionData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const roomRef = doc(db, `users/${user.uid}/chatRooms/${roomId}`);
      const roomDoc = await getDoc(roomRef);

      if (roomDoc.exists()) {
        const data = roomDoc.data();
        setLastMissionTime(data.lastMissionTime?.toMillis() || null);
        setMissionCount(data.missionCount || 0);
      }
    };

    loadMissionData();
  }, [roomId]);

  const shouldGenerateMission = (messages, lastMissionTime, missionCount) => {
    // 1. 최소 메시지 수 체크
    if (messages.length < 5) return false;

    // 2. 마지막 미션 시간 체크 (최소 10분 간격)
    if (lastMissionTime) {
      const timeSinceLastMission = Date.now() - lastMissionTime;
      const minInterval = 10 * 60 * 1000; // 10분
      if (timeSinceLastMission < minInterval) return false;
    }

    // 3. 일일 미션 수 제한
    const today = new Date().setHours(0, 0, 0, 0);
    if (lastMissionTime) {
      const lastMissionDay = new Date(lastMissionTime).setHours(0, 0, 0, 0);
      if (today === lastMissionDay && missionCount >= 5) return false;
    }

    // 4. 최근 메시지의 감정 상태 체크
    const recentMessages = messages.slice(-3);
    const hasNegativeEmotion = recentMessages.some((msg) => {
      const score = msg.emotionalScore;
      return typeof score === "number" && score > 70;
    });

    // 5. 랜덤 요소 (10% 확률)
    const randomChance = Math.random() < 0.2;

    return hasNegativeEmotion || randomChance;
  };

  // NotificationModal 컴포넌트 정의
  const NotificationModal = ({ message, isVisible }) => {
    if (!message || !isVisible) return null;

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={styles.notificationModal}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            <div className={styles.notificationContent}>
              <span className={styles.notificationIcon}>✅</span>
              {message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // MissionModal 컴포넌트 정의
  const MissionModal = ({
    mission,
    onAccept,
    onReject,
    isOpen,
    isGenerating,
  }) => {
    if (!mission || !isOpen) return null;

    return (
      <AnimatePresence>
        {isOpen && !isGenerating && (
          <motion.div
            key="modal-backdrop"
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) onReject();
            }}
          >
            <motion.div
              key="modal"
              className={styles.modal}
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>새로운 미션이 도착했습니다!</h2>
              <h3>{mission.title}</h3>
              <p>{mission.description}</p>
              <div className={styles.difficulty}>
                난이도: {"⭐".repeat(mission.difficulty)}
              </div>
              <div className={styles.modalButtons}>
                <button onClick={onReject}>거절하기</button>
                <button onClick={onAccept}>수락하기</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <AuthCheck>
      <div className="chat-container">
        <div
          className="chat-messages"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          {hasMore && (
            <div className="load-more-messages">
              ↑ 스크롤하여 이전 메시지 보기
            </div>
          )}
          {displayMessages
            .filter((message) => message.role !== "system")
            .map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-content">{message.content}</div>
              </div>
            ))}
          {loading && (
            <div className="message assistant">
              <div className="message-content">
                <LoadingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-wrapper">
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="메시지를 입력하세요."
              className="chat-input"
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="chat-submit" disabled={loading}>
              전송
            </button>
          </form>
        </div>

        <NotificationModal
          message={notification}
          isVisible={notificationVisible}
        />

        <MissionModal
          mission={currentMission}
          isOpen={showMissionModal}
          onAccept={handleAcceptMission}
          onReject={handleRejectMission}
          isGenerating={isGeneratingMission}
        />
      </div>
    </AuthCheck>
  );
}
