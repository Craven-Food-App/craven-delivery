import { useNavigate } from "react-router-dom";

export default function Support() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Support Crave'n</h1>
          <p className="mt-4 text-lg text-zinc-600">
            Private access by invitation only
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
          <p className="text-zinc-700">
            To access the support portal, you must have a valid invitation code.
          </p>
          <button
            onClick={() => navigate("/access")}
            className="mt-6 rounded-xl bg-zinc-950 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Access Portal
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-zinc-500">
          <p>If you have questions, please contact us directly.</p>
        </div>
      </div>
    </div>
  );
}

