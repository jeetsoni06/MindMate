type Props = {
    role: "user" | "assistant";
    text: string;
};

export default function ChatMessage({ role, text }: Props) {
    const isUser = role === "user";

    return (
        <div
            className={`flex gap-4 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""
                }`}
        >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                {isUser ? "🙂" : "✨"}
            </div>

            {/* Message */}
            <div className="space-y-2">
                <div
                    className={`p-5 rounded-xl ${isUser
                            ? "bg-primary text-white"
                            : "bg-white shadow-sm"
                        }`}
                >
                    {text}
                </div>

                <p className="text-xs text-gray-400">
                    {isUser ? "DELIVERED" : "MINDMATE AI"}
                </p>
            </div>
        </div>
    );
}