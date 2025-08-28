
"use client";

export default function AddFundPage() {
  const handleCall = () => {
    if (typeof window !== "undefined") {
      window.location.href = "tel:+919689138558"; 
    }
  };

  const handleWhatsapp = () => {
    if (typeof window !== "undefined") {
      window.open("https://wa.me/919689138558", "_blank");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Add Fund</h1>

      <button
        onClick={handleCall}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow mr-4 transition"
      >
        📞 Call Support
      </button>

      <button
        onClick={handleWhatsapp}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition"
      >
        💬 WhatsApp Support
      </button>
    </div>
  );
}
