"use client";
import { usePathname } from "next/navigation";
import "./globals.css";
import Sidebar from "../components/Sidebar";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/signup";

  return (
    <html lang="ko">
      <body>
        <div className={isLoginPage ? "auth-layout" : "main-layout"}>
          {!isLoginPage && <Sidebar />}
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
