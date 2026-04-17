import { Bot } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Left Design Pane (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-indigo-900 relative items-center justify-center overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-600 rounded-full blur-3xl opacity-30 translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 max-w-md text-center p-8">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mb-8 shadow-2xl">
            <Bot className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            The AI Assistant for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300">
              Modern Hotels
            </span>
          </h1>
          <p className="text-lg text-indigo-100/80 leading-relaxed">
            Automate guest conversations, handle bookings intuitively, and free up your staff. Look professional online 24/7.
          </p>
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="w-full lg:w-1/2 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-white">
        {/* Mobile Header (Only visible on small screens) */}
        <div className="absolute top-8 left-6 lg:hidden flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <Link href="/" className="font-bold text-lg text-gray-900 tracking-tight hover:opacity-80 transition-opacity">
            Hotel <span className="text-indigo-600">Assistant</span>
          </Link>
        </div>

        {/* Back to Home Link (Desktop) */}
        <Link
          href="/"
          className="hidden lg:flex absolute top-8 right-8 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
        >
          ← Back to home
        </Link>

        {/* Form Container */}
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  );
}
