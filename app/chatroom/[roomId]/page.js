"use client";
import { useState, useEffect, useRef, use } from "react";
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
} from "firebase/firestore";
import AuthCheck from "../../../components/AuthCheck";
import createChatCompletion from "../../../components/openai";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingDots from "../../../components/LoadingDots";
import { analyzeSentiment } from "../../../components/openai";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export default function ChatRoom() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
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

  // 메시지 필터링 및 표시
  useEffect(() => {
    if (messages.length > 15) {
      setDisplayMessages(messages.slice(-15));
      setHasMore(true);
    } else {
      setDisplayMessages(messages);
      setHasMore(false);
    }
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

        // 스크롤 위치 유지를 위해 새로운 컨텐츠가 ��가된 후의 높이 차이만큼 스크롤
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

        const sentimentScore = await analyzeSentiment(recentUserMessages);

        const roomRef = doc(db, `users/${user.uid}/chatRooms/${roomId}`);
        await updateDoc(roomRef, {
          emotionalScore: sentimentScore,
          needsHelp: sentimentScore > 75,
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

  // 초기 마운트 시 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      </div>
    </AuthCheck>
  );
}
