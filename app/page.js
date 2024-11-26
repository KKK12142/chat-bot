"use client";
import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!isMounted) return;

      if (user) {
        router.replace("/chatlist");
      } else {
        router.replace("/login");
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-xl font-bold">로딩 중...</h1>
    </div>
  );
}
