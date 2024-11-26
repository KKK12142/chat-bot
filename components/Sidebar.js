"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "../firebase";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (!user && pathname !== "/login" && pathname !== "/signup") {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("로그아웃 에러:", error);
    }
  };

  if (!user || pathname === "/login" || pathname === "/signup") {
    return null;
  }

  const menuItems = [
    { name: "챗팅 목록", path: "/chatlist" },
    { name: "감정카드 선택하기", path: "/emotion" },
    { name: "도움요청하기", path: "/help" },
    { name: "미션", path: "/mission" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-logo">마음 친구</div>
        <div className="user-profile">
          <div className="avatar">
            <Image
              src="/images/1.png"
              alt="User Avatar"
              width={40}
              height={40}
              className="avatar-image"
            />
          </div>
          <div className="user-info">
            <span className="user-email">{user.email}</span>
          </div>
        </div>
        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`menu-item ${pathname === item.path ? "active" : ""}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <button onClick={handleLogout} className="logout-button">
        로그아웃
      </button>
    </div>
  );
}
