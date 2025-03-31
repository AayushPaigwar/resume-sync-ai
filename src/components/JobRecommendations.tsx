import { Bookmark, BookmarkCheck, Briefcase, Building2, Calendar, ExternalLink, Loader2, MapPin, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import JobDetails from './JobDetails';

interface LinkedInJob {
  id: string;
  title: string;
  url: string;
  company: {
    id: number;
    name: string;
    logo: string;
  };
  location: string;
  postAt: string;
}

export default function JobRecommendations() {
  const [jobs, setJobs] = useState<LinkedInJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<'any' | 'today' | 'week' | 'month'>('any');

  useEffect(() => {
    fetchUserSkills();
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: savedJobsData } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', userData.user?.id);

      if (savedJobsData) {
        setSavedJobs(new Set(savedJobsData.map(job => job.job_id)));
      }
    } catch (err) {
      console.error('Error fetching saved jobs:', err);
    }
  };

  const handleSaveJob = async (jobId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (savedJobs.has(jobId)) {
        // Remove from saved jobs
        await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', userData.user?.id)
          .eq('job_id', jobId);
        
        setSavedJobs(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      } else {
        // Add to saved jobs
        await supabase
          .from('saved_jobs')
          .insert({
            user_id: userData.user?.id,
            job_id: jobId
          });
        
        setSavedJobs(prev => new Set([...prev, jobId]));
      }
    } catch (err) {
      console.error('Error saving job:', err);
    }
  };

  const filterJobsByDate = (jobs: LinkedInJob[]) => {
    if (dateFilter === 'any') return jobs;

    const now = new Date();
    return jobs.filter(job => {
      const postDate = new Date(job.postAt);
      const diffDays = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case 'today':
          return diffDays < 1;
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        default:
          return true;
      }
    });
  };

  const fetchUserSkills = async () => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // Fetch user skills from latest resume
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('extracted_data')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (!resumeError && resumeData?.extracted_data) {
        const technical = resumeData.extracted_data.technical_skills || [];
        setUserSkills(technical);
        
        // If we have skills, fetch jobs based on top skills
        if (technical.length > 0) {
          const topSkills = technical.slice(0, 3).join(' ');
          fetchJobRecommendations(topSkills);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching user skills:', err);
      setError('Failed to load your skills. Please upload a resume first.');
      setLoading(false);
    }
  };

  const fetchJobRecommendations = async (keywords: string) => {
    setLoading(true);
    setError(null);
    setIsSearching(true);
    
    try {
      const response = await fetch(
        `https://linkedin-data-api.p.rapidapi.com/search-jobs-v2?keywords=${encodeURIComponent(keywords)}&locationId=102713980&datePosted=anyTime&sort=mostRelevant`,
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
        setJobs(data.data);
      } else {
        setError('No jobs found matching your search criteria');
      }
    } catch (err) {
      console.error('Error fetching job recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job recommendations');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      fetchJobRecommendations(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch (e) {
      return 'Recent';
    }
  };

  if (selectedJobId) {
    return <JobDetails jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Job Recommendations</h2>
        <p className="text-sm text-gray-600 mb-4">
          Personalized job recommendations based on your skills
        </p>
        
        {/* Search bar */}
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search for jobs by skills or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className={`px-4 py-2 rounded-lg ${
              isSearching || !searchQuery.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSearching ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </span>
            ) : (
              'Search'
            )}
          </button>
        </div>
        
        {/* Skills chips */}
        {userSkills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Your Top Skills</h3>
            <div className="flex flex-wrap gap-2">
              {userSkills.slice(0, 8).map((skill, index) => (
                <button
                  key={index}
                  onClick={() => fetchJobRecommendations(skill)}
                  className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <span className="ml-2 text-gray-600">Finding the best jobs for you...</span>
          </div>
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>{error}</p>
            {!userSkills.length && (
              <p className="mt-2 text-sm">
                Try uploading your resume first to get personalized recommendations.
              </p>
            )}
          </div>
        )}
        
        {/* Jobs list */}
        {!loading && !error && jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div 
                key={job.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {job.company.logo ? (
                    <img 
                      src={job.company.logo} 
                      alt={job.company.name} 
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-lg text-gray-900">{job.title}</h3>
                    <p className="text-gray-600 text-sm">{job.company.name}</p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        <span>Posted {formatDate(job.postAt)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedJobId(job.id)}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleSaveJob(job.id)}
                        className={`text-sm px-3 py-1 rounded-md transition-colors flex items-center ${
                          savedJobs.has(job.id)
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {savedJobs.has(job.id) ? (
                          <>
                            <BookmarkCheck className="h-4 w-4 mr-1" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Bookmark className="h-4 w-4 mr-1" />
                            Save Job
                          </>
                        )}
                      </button>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No jobs found</h3>
            <p className="text-gray-500 mt-1">Try searching with different skills or keywords</p>
          </div>
        )}
      </div>
    </div>
  );
}