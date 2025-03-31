import { Bell, LogOut, Menu, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface RecommendedJob {
  id: string;
  title: string;
  company: {
    name: string;
  };
  postAt: string;
}

export default function Header() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendedJobs();
  }, []);

  // Update the useEffect to handle both dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchRecommendedJobs = async () => {
    try {
      setApiError(null);
      const { data: userData } = await supabase.auth.getUser();
      const { data: resumeData } = await supabase
        .from('resumes')
        .select('extracted_data')
        .eq('user_id', userData.user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (resumeData?.extracted_data?.technical_skills) {
        const skills = resumeData.extracted_data.technical_skills.slice(0, 3).join(' ');
        
        const response = await fetch(
          `https://linkedin-data-api.p.rapidapi.com/search-jobs-v2?keywords=${encodeURIComponent(skills)}&locationId=102713980&datePosted=pastWeek&sort=mostRelevant`,
          {
            headers: {
              'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com',
              'x-rapidapi-key': import.meta.env.VITE_RAPIDAPI_KEY
            }
          }
        );

        if (!response.ok) {
          let errorMessage = 'Failed to fetch job recommendations';
          switch (response.status) {
            case 401:
              errorMessage = 'Authentication failed: Invalid API key';
              break;
            case 403:
              errorMessage = 'Access denied: Please check your API subscription';
              break;
            case 429:
              errorMessage = 'Too many requests: Please try again in a few minutes';
              break;
            case 500:
              errorMessage = 'LinkedIn API service is temporarily unavailable';
              break;
            case 502:
              errorMessage = 'Gateway error: Service is currently unreachable';
              break;
            case 503:
              errorMessage = 'Service unavailable: Please try again later';
              break;
            default:
              errorMessage = `Error (${response.status}): Unable to fetch job recommendations`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.success && data.data) {
          setRecommendedJobs(data.data.slice(0, 5));
        } else {
          setApiError('No matching jobs found for your skills');
        }
      }
    } catch (err) {
      console.error('Error fetching recommended jobs:', err);
      setApiError(err instanceof Error ? err.message : 'Failed to load job recommendations');
    }
  };

  // Update the notifications dropdown to show error message
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo with navigation */}
          <div className="flex-shrink-0 flex items-center">
            <button
              onClick={() => navigate('/')}
              className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              ResumeSync AI
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">

            {/* Star on GitHub */}
<a
  href="https://github.com/AayushPaigwar/resume-sync-ai"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium transition-all duration-300 hover:from-purple-700 hover:to-blue-700 hover:shadow-lg transform hover:-translate-y-0.5"
>
  <svg
    className="w-5 h-5 mr-2"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
  Star on GitHub
</a>


            {/* Search Jobs */}
            {/* <div className="relative">
              <input
                type="text"
                placeholder="Search jobs..."
                className="w-64 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div> */}

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <Bell className="h-6 w-6 text-gray-600" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 transform translate-x-1/2 -translate-y-1/2"></span>
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Recommended Jobs</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {apiError ? (
                      <div className="px-4 py-3 text-sm text-red-600">
                        {apiError}
                      </div>
                    ) : (
                      recommendedJobs.map(job => (
                        <button
                          key={job.id}
                          onClick={() => {
                            navigate(`/jobs/${job.id}`);
                            setIsNotificationOpen(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-gray-50 text-left"
                        >
                          <p className="text-sm font-medium text-gray-900">{job.title}</p>
                          <p className="text-xs text-gray-600">{job.company.name}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Posted {new Date(job.postAt).toLocaleDateString()}
                          </p>
                        </button>
                 
                        ),
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Update the Profile Dropdown section */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100"
              >
                <User className="h-6 w-6 text-gray-600" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                  <button
                    onClick={() => navigate('/profile')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </div>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search jobs..."
                className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

