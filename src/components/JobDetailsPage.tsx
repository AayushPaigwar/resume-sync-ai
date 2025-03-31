import { useNavigate, useParams } from 'react-router-dom';
import JobDetails from './JobDetails';

export default function JobDetailsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  if (!jobId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center"
        >
          ← Back
        </button>
        <JobDetails jobId={jobId} onBack={() => navigate(-1)} />
      </div>
    </div>
  );
}