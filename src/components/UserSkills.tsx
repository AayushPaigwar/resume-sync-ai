import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Skill {
  name: string;
  type: 'technical' | 'soft';
}

export default function UserSkills() {
  const [skills, setSkills] = useState<{ technical: string[], soft: string[] }>({
    technical: [],
    soft: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        // Fetch the latest resume data
        const { data, error } = await supabase
          .from('resumes')
          .select('extracted_data')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            // No resume found, not an error
            setSkills({ technical: [], soft: [] });
            return;
          }
          throw error;
        }
        
        if (data && data.extracted_data) {
          setSkills({
            technical: data.extracted_data.technical_skills || [],
            soft: data.extracted_data.soft_skills || []
          });
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
        setError(error instanceof Error ? error.message : 'Failed to load skills');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSkills();
  }, []);
  
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm flex justify-center">
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <p className="text-red-600">Error loading skills: {error}</p>
      </div>
    );
  }
  
  const hasSkills = skills.technical.length > 0 || skills.soft.length > 0;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Skills</h2>
      
      {!hasSkills ? (
        <p className="text-gray-500 text-sm">
          Upload your resume to extract your skills.
        </p>
      ) : (
        <div className="space-y-4">
          {skills.technical.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Technical Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.technical.map(skill => (
                  <span 
                    key={skill} 
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {skills.soft.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Soft Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.soft.map(skill => (
                  <span 
                    key={skill} 
                    className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}