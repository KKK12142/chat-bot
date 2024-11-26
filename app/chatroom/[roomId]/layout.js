// layout.js
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export default function ChatRoomLayout({ children }) {
  return children;
}
