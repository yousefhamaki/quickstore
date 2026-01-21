import Link from "next/link";
import { Store, ChevronLeft } from "lucide-react";

export default function StoreNotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gray-50">
            <div className="w-24 h-24 bg-white rounded-[32px] shadow-2xl shadow-blue-500/10 flex items-center justify-center mb-8 animate-bounce duration-1000">
                <Store size={48} className="text-blue-600" />
            </div>

            <div className="space-y-4 max-w-md">
                <h1 className="text-5xl font-black tracking-tighter text-gray-900">Store Not Found</h1>
                <p className="text-gray-500 text-lg font-medium">
                    The store you are looking for doesn't exist or is currently undergoing maintenance.
                </p>
            </div>

            <div className="mt-12 space-y-4 w-full max-w-xs">
                <Link
                    href="https://quickstore.com"
                    className="w-full h-14 bg-black text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                >
                    Create Your Own Store
                </Link>
                <Link
                    href="https://quickstore.com"
                    className="w-full h-14 bg-white border border-gray-200 text-gray-900 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95"
                >
                    <ChevronLeft size={18} /> Back to Home
                </Link>
            </div>

            <div className="mt-20">
                <p className="text-[10px] font-black tracking-[0.2em] text-gray-300 uppercase">
                    Powered by QuickStore SaaS
                </p>
            </div>

            {/* Background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] left-[-10%] w-[40%] aspect-square bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] aspect-square bg-purple-500/5 blur-[120px] rounded-full" />
            </div>
        </div>
    );
}
