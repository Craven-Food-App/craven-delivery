import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function Success() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const inviteId = searchParams.get("invite_id");

  useEffect(() => {
    // Clear invite session
    sessionStorage.removeItem("invite_session");
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Thank You!</h1>
          <p className="mt-4 text-zinc-600">
            Your support contribution has been received successfully.
          </p>

          {sessionId && (
            <p className="mt-2 text-xs text-zinc-500">
              Session ID: {sessionId}
            </p>
          )}

          <div className="mt-8">
            <button
              onClick={() => navigate("/")}
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

