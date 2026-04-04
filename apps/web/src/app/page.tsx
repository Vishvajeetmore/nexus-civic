import Link from 'next/link';
import { AlertOctagon, Flame, Car, FileText, Wallet, Mic, ShieldAlert, ChevronRight } from 'lucide-react';
import HomeFeed from '@/components/HomeFeed';

export default function CitizenHub() {
  return (
    <div className="min-h-screen bg-[#F7F8FC] text-slate-800 pb-20 p-6 max-w-md mx-auto md:max-w-2xl">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-black font-outfit text-slate-800 mb-1">Citizen Hub</h1>
        <p className="text-slate-500 font-medium tracking-wide">Welcome to Nexus Civic</p>
      </header>

      <main className="space-y-8 flex flex-col">
        {/* Urgent Action */}
        <div className="w-full">
          <Link href="/safety" className="w-full h-32 rounded-3xl bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg active:scale-95 transition-all flex items-center justify-between px-8 border-b-4 border-red-700 relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-white/20 p-4 rounded-full">
                <AlertOctagon className="w-10 h-10 drop-shadow-md" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">Emergency</h2>
                <p className="text-red-100 font-medium">Trigger SOS or view map</p>
              </div>
            </div>
            <ChevronRight className="w-8 h-8 opacity-70 relative z-10" />
          </Link>
        </div>

        {/* Services Grid */}
        <div className="w-full">
          <h3 className="font-bold text-lg text-slate-700 mb-4 px-2">Civic Services</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/report" className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all active:scale-95">
              <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Report Issue</h4>
                <p className="text-xs text-slate-500">Potholes, leaks...</p>
              </div>
            </Link>

            <Link href="/townhall" className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:border-purple-300 hover:shadow-md transition-all active:scale-95">
              <div className="bg-purple-50 p-4 rounded-2xl text-purple-600">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Townhall</h4>
                <p className="text-xs text-slate-500">Vote & Discuss</p>
              </div>
            </Link>

            <Link href="/budget" className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all active:scale-95">
              <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Budget</h4>
                <p className="text-xs text-slate-500">City expenditures</p>
              </div>
            </Link>

            <Link href="/login" className="bg-slate-800 border border-slate-700 p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3 shadow-sm hover:bg-slate-700 hover:shadow-md transition-all active:scale-95 text-white">
              <div className="bg-slate-700 p-4 rounded-2xl text-indigo-300">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-white">City Admin</h4>
                <p className="text-xs text-slate-400">Restricted Access</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Live Feed Component */}
        <div className="w-full">
           <HomeFeed />
        </div>
      </main>
    </div>
  );
}
