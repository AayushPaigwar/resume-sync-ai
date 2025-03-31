import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Auth from './components/Auth';
import Header from './components/Header';
import JobList from './components/JobList';
import JobRecommendations from './components/JobRecommendations';
import Profile from './components/Profile';
import ResumeUpload from './components/ResumeUpload';
import UserSkills from './components/UserSkills';
import { supabase } from './lib/supabase';

// Add import
import AnnouncementBar from './components/AnnouncementBar';
import JobDetailsPage from './components/JobDetailsPage';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'resume' | 'jobs' | 'recommendations'>('resume');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AnnouncementBar />
        <Header />
        <div className="flex-grow">
          <Routes>
            <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={
              <main className="container mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                  <nav className="flex space-x-8">
                    <button
                      onClick={() => setActiveTab('resume')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'resume'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => setActiveTab('recommendations')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'recommendations'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Job Recommendations
                    </button>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'jobs'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Saved Jobs
                    </button>
                  </nav>
                </div>
                
                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left column */}
                  <div className="md:col-span-2">
                    {activeTab === 'resume' && <ResumeUpload />}
                    {activeTab === 'recommendations' && <JobRecommendations />}
                    {activeTab === 'jobs' && <JobList />}
                  </div>
                  
                  {/* Right column */}
                  <div className="md:col-span-1">
                    <UserSkills />
                  </div>
                </div>
              </main>
            } />
          </Routes>
        </div>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="container mx-auto px-4 flex items-center justify-center space-x-4">
            <span className="text-gray-500">Made with 🎧☕️ while</span>
            <a
              href="https://en.wikipedia.org/wiki/Vibe_coding"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
          Vibe Coding
            </a>
            <span className="text-gray-500">by</span>
           
            <span className="font-medium text-gray-700">Aayush Paigwar</span>
            <a
              href="https://github.com/AayushPaigwar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/aayush-paigwar/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;