import { ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import JobDetails from './JobDetails';

interface SavedJob {
  id: string;
  job_id: string;
  created_at: string;
}

interface LinkedInJobDetail {
  id: string;
  title: string;
  description: string;
  url: string;
  company: {
    id: number;
    name: string;
    logo?: string;
  };
  location: string;
}

export default function JobList() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [jobDetails, setJobDetails] = useState<LinkedInJobDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: savedJobsData, error: savedJobsError } = await supabase
        .from('saved_jobs')
        .select('*')
        .eq('user_id', userData.user?.id)
        .order('created_at', { ascending: false });

      if (savedJobsError) throw savedJobsError;

      setSavedJobs(savedJobsData || []);
      
      // Fetch details for each saved job
      const jobDetailsPromises = savedJobsData?.map(async (savedJob) => {
        const response = await fetch(
          `https://linkedin-data-api.p.rapidapi.com/get-job-details?id=${savedJob.job_id}`,
          {
            method: 'GET',
            headers: {
              'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com',
              'x-rapidapi-key': import.meta.env.VITE_RAPIDAPI_KEY
            }
          }
        );
        
        if (!response.ok) {
          let errorMessage = 'Failed to fetch job details';
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
              errorMessage = `Error (${response.status}): Unable to fetch job details`;
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        return data.success ? data.data : null;
      });

      const details = await Promise.all(jobDetailsPromises);
      setJobDetails(details.filter(Boolean));
      
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load saved jobs');
    } finally {
      setLoading(false);
    }
  };

  if (selectedJobId) {
    return <JobDetails jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Saved Jobs</h2>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading saved jobs...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && jobDetails.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No saved jobs yet</p>
        </div>
      )}

      {!loading && !error && jobDetails.length > 0 && (
        <div className="space-y-4">
          {jobDetails.map((job) => (
            <div key={job.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-lg text-gray-900">{job.title}</h3>
              <p className="text-gray-600">{job.company.name}</p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedJobId(job.id)}
                  className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View on LinkedIn
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}