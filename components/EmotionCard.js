export default function EmotionCard({ emotion, onClick }) {
  return (
    <div
      className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="text-4xl mb-2">{emotion.emoji}</div>
      <h3 className="font-bold mb-1">{emotion.name}</h3>
      <p className="text-sm text-gray-600">{emotion.description}</p>
    </div>
  );
}
