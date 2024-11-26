"use client";
import { useState } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../login/login.module.css";

export default function Signup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    gender: "",
    age: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { email, password, confirmPassword, name, gender, age } = formData;

    if (password !== confirmPassword) {
      return setError("비밀번호가 일치하지 않습니다.");
    }

    if (!email || !password || !confirmPassword || !name || !gender || !age) {
      return setError("모든 필드를 입력해주세요.");
    }

    if (password.length < 6) {
      return setError("비밀번호는 6자 이상이어야 합니다.");
    }

    try {
      setError("");
      setLoading(true);
      // 사용자 계정 생성
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Firestore에 추가 정보 저장
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        gender,
        age: Number(age),
        email,
        createdAt: new Date().toISOString(),
      });

      alert("회원가입이 완료되었습니다.");
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setError("이미 사용 중인 이메일입니다.");
      } else if (error.code === "auth/weak-password") {
        setError("비밀번호는 6자 이상이어야 합니다.");
      } else if (error.code === "auth/invalid-email") {
        setError("유효하지 않은 이메일 형식입니다.");
      } else {
        setError("회원가입 중 오류가 발생했습니다.");
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>회원가입</h1>
        {error && <p className={styles.error}>{error}</p>}
        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="example@email.com"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="6자 이상 입력해주세요"
              minLength={6}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="비밀번호를 다시 입력해주세요"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="name">이름</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="이름을 입력해주세요"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="gender">성별</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              className={styles.select}
            >
              <option value="">선택하세요</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="age">나이</label>
            <input
              id="age"
              name="age"
              type="number"
              min="1"
              max="120"
              value={formData.age}
              onChange={handleChange}
              required
              className={styles.numberInput}
              placeholder="나이를 입력해주세요"
            />
          </div>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "처리중..." : "회원가입"}
          </button>
        </form>
        <p className={styles.signupText}>
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
