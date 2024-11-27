"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./mission.module.css";

export default function MissionPage() {
  const [missions, setMissions] = useState([]);
  const [notification, setNotification] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setInitializing(false);
          return;
        }

        const missionsRef = collection(db, `users/${user.uid}/missions`);
        const q = query(
          missionsRef,
          where("status", "in", ["accepted", "completed"])
        );

        const snapshot = await getDocs(q);
        const missionList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMissions(missionList);
        setInitializing(false);
      } catch (error) {
        console.error("미션 불러오기 실패:", error);
        setInitializing(false);
      }
    };

    // auth 상태 변경 감지
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchMissions();
      } else {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleMissionComplete = async (missionId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const missionRef = doc(db, `users/${user.uid}/missions/${missionId}`);

      await updateDoc(missionRef, {
        status: "completed",
        completedAt: serverTimestamp(),
      });

      // 로컬 상태 업데이트
      setMissions((prev) =>
        prev.map((mission) =>
          mission.id === missionId
            ? { ...mission, status: "completed" }
            : mission
        )
      );

      setNotification("미션 완료! 축하합니다! 🎉");
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("미션 완료 처리 실패:", error);
      setNotification("미션 완료 처리 중 오류가 발생했습니다.");
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (initializing) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>초기화 중...</div>
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>나의 미션</h1>
        <div className={styles.emptyState}>아직 수락한 미션이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>나의 미션</h1>

      {/* 알림 애니메이션 */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className={styles.notification}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 미션 카드 그리드 */}
      <div className={styles.missionGrid}>
        <AnimatePresence>
          {missions.map((mission) => (
            <motion.div
              key={mission.id}
              className={`${styles.missionCard} ${
                mission.status === "completed" ? styles.completed : ""
              }`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <h3>{mission.title}</h3>
              <p>{mission.description}</p>
              <div className={styles.difficulty}>
                난이도: {"⭐".repeat(mission.difficulty || 1)}
              </div>
              {mission.status !== "completed" && (
                <button
                  onClick={() => handleMissionComplete(mission.id)}
                  className={styles.completeButton}
                >
                  미션 완료
                </button>
              )}
              {mission.status === "completed" && (
                <div className={styles.completedBadge}>완료됨 ✅</div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
