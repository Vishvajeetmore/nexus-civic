'use client';

import { useState } from 'react';
import { Briefcase, User, Search, PlusCircle, CheckCircle, AlertTriangle, Star, Clock, MapPin, SearchCheck, Shield } from 'lucide-react';
import axios from 'axios';

const SKILLS = [
  'Carpentry', 'Plumbing', 'Electrical', 'Painting', 
  'Landscaping', 'Cleaning', 'Moving', 'Delivery', 
  'Assembly', 'Data Entry', 'Event Help'
];

export default function GigsPage() {
  const [tab, setTab] = useState<'find' | 'post'>('find');
  
  // Find Work State
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Post Work State
  const [gigTitle, setGigTitle] = useState('');
  const [gigDesc, setGigDesc] = useState('');
  const [gigPay, setGigPay] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [fraudResult, setFraudResult] = useState<'safe' | 'review' | null>(null);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleFindGigs = async () => {
    if (selectedSkills.length === 0) return alert("Select at least one skill");
    setIsSearching(true);
    // Mock GET gigForge/api/workers/:id/matches
    setTimeout(() => {
      setMatches([
        { id: 1, title: 'Fix broken fence panel', pay: '$50', time: 'Today', distance: '1.2mi', matchScore: 98 },
        { id: 2, title: 'Help moving couch', pay: '$40', time: 'Tomorrow', distance: '2.5mi', matchScore: 85 },
        { id: 3, title: 'Assemble IKEA desk', pay: '$35', time: 'Flexible', distance: '0.8mi', matchScore: 72 },
      ]);
      setIsSearching(false);
    }, 1500);
  };

  const handlePostGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gigTitle || !gigDesc || !gigPay) return;
    
    setIsPosting(true);
    setFraudResult(null);
    // Mock POST gigForge/api/listings
    setTimeout(() => {
      setIsPosting(false);
      // Simple mock logic: if pay is ridiculously high or missing, flag it
      if (parseInt(gigPay.replace(/[^0-9]/g, '')) > 1000) {
        setFraudResult('review');
      } else {
        setFraudResult('safe');
      }
      
      if (fraudResult !== 'review') {
        setGigTitle('');
        setGigDesc('');
        setGigPay('');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0D021F] text-white flex flex-col max-w-md mx-auto md:max-w-2xl">
      <header className="p-6 pt-8 pb-4">
        <h1 className="text-3xl font-black mb-6 flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-indigo-400" />
          GigForge
        </h1>
        
        {/* Tabs */}
        <div className="flex bg-black/40 p-1.5 rounded-full border border-purple-800/50 relative">
          <div 
            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-indigo-600 rounded-full transition-all duration-300 ease-out z-0" 
            style={{ 
              left: tab === 'find' ? '6px' : 'calc(50% + 0px)',
            }}
          ></div>
          <button 
            onClick={() => setTab('find')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-lg transition-colors z-10 ${tab === 'find' ? 'text-white' : 'text-purple-400 hover:text-purple-200'}`}
          >
            <User className="w-5 h-5" /> Find Work
          </button>
          <button 
            onClick={() => setTab('post')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-lg transition-colors z-10 ${tab === 'post' ? 'text-white' : 'text-purple-400 hover:text-purple-200'}`}
          >
            <PlusCircle className="w-5 h-5" /> Post Work
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 pb-24">
        {tab === 'find' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
            <div>
              <h2 className="text-xl font-bold mb-3 text-purple-100">Your Skills</h2>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(skill => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all active:scale-95 ${
                      selectedSkills.includes(skill)
                        ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                        : 'border-purple-800/50 bg-black/20 text-purple-400 hover:border-purple-600'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleFindGigs}
              disabled={isSearching}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
            >
              {isSearching ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <SearchCheck className="w-6 h-6" />}
              {isSearching ? 'Finding matches...' : 'Find Gigs'}
            </button>

            {matches.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-purple-800/50">
                <h3 className="font-bold text-purple-200 uppercase tracking-widest text-sm">Matched Gigs</h3>
                <div className="space-y-4">
                  {matches.map(gig => (
                    <div key={gig.id} className="bg-black/30 p-5 rounded-2xl border border-purple-800/50 hover:border-indigo-500/50 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg group-hover:text-indigo-300 transition-colors">{gig.title}</h4>
                        <div className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-black border border-indigo-500/30 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-indigo-300" /> {gig.matchScore}% FIT
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-purple-300 text-sm">
                        <div className="flex items-center gap-1 font-semibold text-green-400"><div className="w-2 h-2 rounded-full bg-green-400"></div> {gig.pay}</div>
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> {gig.time}</div>
                        <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {gig.distance}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <form onSubmit={handlePostGig} className="space-y-5 bg-black/30 p-6 rounded-3xl border border-purple-800/50">
              
              {fraudResult && (
                <div className={`p-4 rounded-xl flex items-center justify-center gap-3 border ${
                  fraudResult === 'safe' 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                }`}>
                  {fraudResult === 'safe' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  <span className="font-bold">
                    {fraudResult === 'safe' ? '✅ Listing verified safe' : '⚠️ Listing flagged for review'}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">What do you need help with?</label>
                <input 
                  type="text" 
                  required
                  value={gigTitle}
                  onChange={(e) => setGigTitle(e.target.value)}
                  placeholder="E.g. Help moving couch"
                  className="w-full bg-black/60 border border-purple-800 rounded-xl px-4 py-4 focus:outline-none focus:border-indigo-500 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Description</label>
                <textarea 
                  required
                  value={gigDesc}
                  onChange={(e) => setGigDesc(e.target.value)}
                  placeholder="Details about the job..."
                  rows={4}
                  className="w-full bg-black/60 border border-purple-800 rounded-xl px-4 py-4 focus:outline-none focus:border-indigo-500 text-lg resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Offered Pay</label>
                <input 
                  type="text" 
                  required
                  value={gigPay}
                  onChange={(e) => setGigPay(e.target.value)}
                  placeholder="E.g. $50"
                  className="w-full bg-black/60 border border-purple-800 rounded-xl px-4 py-4 focus:outline-none focus:border-indigo-500 text-lg"
                />
              </div>

              <button 
                type="submit"
                disabled={isPosting}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isPosting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="w-6 h-6" />}
                {isPosting ? 'Verifying...' : 'Post Gig safely'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
