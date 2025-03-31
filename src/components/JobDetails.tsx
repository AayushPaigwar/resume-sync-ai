import { useState, useEffect } from 'react';
import { ArrowLeft, Building2, MapPin, Calendar, ExternalLink, Loader2, Briefcase, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface JobDetail {
  id: string;
  title: string;
  description: string;
  url: string;
  company: {
    id: number;
    name: string;
    universalName: string;
  };
  applyMethod: {
    companyApplyUrl: string;
    easyApplyUrl: string;
  };
}

interface JobDetailsProps {
  jobId: string;
  onBack: () => void;
}

export default function JobDetails({ jobId, onBack }: JobDetailsProps) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [matchingSkills, setMatchingSkills] = useState<string[]>([]);

  useEffect(() => {
    fetchJobDetails();
    fetchUserSkills();
  }, [jobId]);

  const fetchJobDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://linkedin-data-api.p.rapidapi.com/get-job-details?id=${jobId}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com',
          'x-rapidapi-key': import.meta.env.VITE_RAPIDAPI_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setJob(data.data);
      } else {
        setError('Failed to load job details');
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
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
      }
    } catch (err) {
      console.error('Error fetching user skills:', err);
    }
  };

  useEffect(() => {
    if (job && userSkills.length > 0) {
      // Extract potential skills from job description
      const description = job.description.toLowerCase();
      const matches = userSkills.filter(skill => 
        description.includes(skill.toLowerCase())
      );
      setMatchingSkills(matches);
    }
  }, [job, userSkills]);

  const formatDescription = (description: string) => {
    // Convert newlines to proper HTML breaks
    return description
      .split('\n')
      .map((line, i) => {
        // Check if line is a heading (all caps or starts with "Key", "Required", etc.)
        if (
          /^[A-Z\s]+:?$/.test(line) || 
          /^(Key|Required|Preferred|Education|Experience|Responsibilities|Qualifications)/.test(line)
        ) {
          return `<h3 class="font-semibold text-gray-800 mt-4 mb-2">${line}</h3>`;
        }
        // Check if line is a bullet point
        else if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return `<li class="ml-5">${line.trim().substring(1)}</li>`;
        }
        // Regular paragraph
        else if (line.trim()) {
          return `<p class="mb-2">${line}</p>`;
        }
        return '';
      })
      .join('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <button 
        onClick={onBack}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to job listings
      </button>
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading job details...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
          <button
            onClick={fetchJobDetails}
            className="mt-2 text-sm font-medium underline"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Job details */}
      {!loading && !error && job && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex items-center text-gray-600 mb-4">
              <Building2 className="h-4 w-4 mr-1" />
              <span className="font-medium">{job.company.name}</span>
            </div>
            
            {/* Apply buttons */}
            <div className="flex flex-wrap gap-3 mt-4">
              {job.applyMethod.easyApplyUrl && (
                <a
                  href={job.applyMethod.easyApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Easy Apply on LinkedIn
                </a>
              )}
              
              {job.applyMethod.companyApplyUrl && (
                <a
                  href={job.applyMethod.companyApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply on Company Website
                </a>
              )}
              
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on LinkedIn
              </a>
            </div>
          </div>
          
          <div className="p-6">
            {/* Skills match */}
            {matchingSkills.length > 0 && (
              <div className="mb-6 bg-green-50 border border-green-100 rounded-lg p-4">
                <h3 className="font-medium text-green-800 flex items-center mb-2">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Your Skills Match
                </h3>
                <div className="flex flex-wrap gap-2">
                  {matchingSkills.map((skill, index) => (
                    <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Job description */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Job Description</h2>
              <div 
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: formatDescription(job.description) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}