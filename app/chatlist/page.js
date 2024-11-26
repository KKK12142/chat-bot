"use client";
import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import AuthCheck from "../../components/AuthCheck";
import ChatList from "../../components/ChatList";
import styles from "../../components/ChatList.module.css";
import { useRouter } from "next/navigation";

export default function ChatListPage() {
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        console.log("No user in ChatListPage");
        router.push("/login");
        return;
      }
      console.log("User authenticated:", user.uid);
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (initializing) {
    return <div>초기화 중...</div>;
  }

  return (
    <AuthCheck>
      <div className={styles.container}>
        <ChatList />
      </div>
    </AuthCheck>
  );
}
