import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Force PDF.js to use the main thread instead of a worker
pdfjs.GlobalWorkerOptions.workerSrc = '';

interface ResumeProcessorProps {
  resumeId: string | null;
  onProcessingComplete: () => void;
}

export default function ResumeProcessor({ resumeId, onProcessingComplete }: ResumeProcessorProps) {
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (resumeId) {
      processResume();
    }
  }, [resumeId]);

  const processResume = async () => {
    if (!resumeId) return;
    
    setProcessing(true);
    setError(null);
    setSuccess(false);
    
    try {
      // 1. Get resume data from database
      setProcessingStep('fetching');
      const { data: resumeData, error: fetchError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!resumeData) throw new Error('Resume not found');
      
      setFileUrl(resumeData.file_url);
      setFileName(resumeData.file_name);
      
      // 2. Download the PDF file
      setProcessingStep('downloading');
      const response = await fetch(resumeData.file_url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const fileBlob = await response.blob();
      const pdfFile = new File([fileBlob], resumeData.file_name, { type: 'application/pdf' });
      
      // 3. Process and extract text from PDF
      setProcessingStep('parsing');
      const extractedText = await extractTextFromPdf(pdfFile);
      
      // 4. Analyze text to extract structured data
      setProcessingStep('analyzing');
      const parsedData = await analyzeResumeText(extractedText);
      
      // 5. Update results in database
      setProcessingStep('saving');
      const { error: updateError } = await supabase
        .from('resumes')
        .update({
          extracted_data: parsedData,
          processed_at: new Date().toISOString()
        })
        .eq('id', resumeId);
        
      if (updateError) throw updateError;
      
      // Show success
      setSuccess(true);
      setExtractedData(parsedData);
      
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process resume');
    } finally {
      setProcessing(false);
      // Notify parent component that processing is complete
      setTimeout(() => {
        onProcessingComplete();
      }, 3000); // Allow user to see the results for a few seconds
    }
  };

  // Extract text from PDF
  const extractTextFromPdf = async (pdfFile: File): Promise<string> => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      
      // Load PDF with better error handling
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/standard_fonts/'
      });
      
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded with ${pdf.numPages} pages`);
      
      let fullText = '';
      
      // Process each page
      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Extract text from this page
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
            
          fullText += pageText + '\n';
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
          // Continue with other pages
        }
      }
      
      if (!fullText.trim()) {
        throw new Error('No text content could be extracted from the PDF');
      }
      
      return fullText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Analyze resume text and extract structured information
  const analyzeResumeText = async (text: string): Promise<any> => {
    // Convert to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    
    // Define skills to detect
    const technicalSkillsKeywords = [
      'javascript', 'react', 'typescript', 'node', 'nodejs', 'html', 'css', 'sass', 'less',
      'python', 'java', 'c++', 'c#', '.net', 'sql', 'mysql', 'postgresql', 'mongodb', 'nosql',
      'aws', 'azure', 'gcp', 'cloud', 'git', 'docker', 'kubernetes', 'ci/cd', 'jenkins',
      'redux', 'graphql', 'rest', 'api', 'express', 'vue', 'angular', 'svelte', 'nextjs',
      'gatsby', 'flutter', 'swift', 'kotlin', 'php', 'laravel', 'spring', 'django',
      'ruby', 'rails', 'golang', 'rust', 'scala', 'terraform', 'devops', 'agile', 'scrum',
      'jira', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'ui/ux', 'seo',
      'analytics', 'marketing', 'excel', 'tableau', 'power bi', 'data analysis', 'machine learning',
      'artificial intelligence', 'ai', 'nlp', 'computer vision', 'deep learning'
    ];
    
    const softSkillsKeywords = [
      'communication', 'teamwork', 'leadership', 'problem solving', 'problem-solving',
      'time management', 'adaptability', 'creativity', 'critical thinking',
      'conflict resolution', 'negotiation', 'presentation', 'public speaking',
      'mentoring', 'coaching', 'collaboration', 'decision making', 'decision-making',
      'planning', 'organization', 'analytical', 'research', 'detail oriented', 'detail-oriented',
      'innovative', 'motivated', 'proactive', 'interpersonal', 'multitasking',
      'customer service', 'project management', 'team player', 'self-motivated',
      'flexible', 'resourceful', 'strategic thinking', 'strategic-thinking'
    ];
    
    // Extract skills
    const technical_skills = technicalSkillsKeywords
      .filter(skill => lowerText.includes(skill.toLowerCase()))
      .map(skill => skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    
    const soft_skills = softSkillsKeywords
      .filter(skill => lowerText.includes(skill.toLowerCase()))
      .map(skill => skill.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
    
    // Extract work experience
    const experience = [];
    
    // Define regex patterns for experience extraction
    const experienceSections = [
      /EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|WORK HISTORY|PROFESSIONAL EXPERIENCE/i,
      /EDUCATION|ACADEMIC|QUALIFICATION/i
    ];
    
    // Split the resume into sections
    let experienceSection = '';
    
    for (let i = 0; i < experienceSections.length - 1; i++) {
      const sectionStart = text.search(experienceSections[i]);
      const sectionEnd = text.search(experienceSections[i + 1]);
      
      if (sectionStart !== -1 && sectionEnd !== -1 && sectionStart < sectionEnd) {
        experienceSection = text.substring(sectionStart, sectionEnd);
        break;
      }
    }
    
    if (!experienceSection && experienceSections.length > 0) {
      const sectionStart = text.search(experienceSections[0]);
      if (sectionStart !== -1) {
        experienceSection = text.substring(sectionStart);
      }
    }
    
    // Extract job information using patterns
    const jobTitlePattern = /(?:^|\n)([A-Z][A-Za-z\s]+)(?:\n|,|\s+at|\s+\-)/gm;
    const companyPattern = /(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,]+)(?:\n|,|\s+from|\s+\()/gm;
    const datePattern = /(?:^|\s)((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s+(?:to|\-|–)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s+(?:to|\-|–)\s+(?:Present|Current|Now)|(?:\d{4}\s+(?:to|\-|–)\s+\d{4}|\d{4}\s+(?:to|\-|–)\s+(?:Present|Current|Now)))/gi;
    
    // Extract all matches
    const titles = [...experienceSection.matchAll(jobTitlePattern)].map(m => m[1].trim());
    const companies = [...experienceSection.matchAll(companyPattern)].map(m => m[1].trim());
    const dates = [...experienceSection.matchAll(datePattern)].map(m => m[1].trim());
    
    // Combine the extracted information
    const maxEntries = Math.max(titles.length, companies.length, dates.length);
    
    for (let i = 0; i < maxEntries; i++) {
      experience.push({
        title: i < titles.length ? titles[i] : 'Position',
        company: i < companies.length ? companies[i] : (i < titles.length ? 'Company' : ''),
        duration: i < dates.length ? dates[i] : 'Duration'
      });
    }
    
    // If no experiences were found but text suggests there are some
    if (experience.length === 0 && /work|experience|job|position|role/i.test(text)) {
      // Try a more aggressive approach
      const paragraphs = text.split(/\n\s*\n/);
      
      for (const paragraph of paragraphs) {
        if (/experience|work|position|job/i.test(paragraph) &&
            !(/education|university|college|school/i.test(paragraph))) {
          
          // Try to extract job title (often at beginning of paragraph)
          const titleMatch = paragraph.match(/^([A-Z][A-Za-z\s]+)(?:\n|,|\s+at)/m);
          const title = titleMatch ? titleMatch[1].trim() : 'Position';
          
          // Try to extract company name
          const companyMatch = paragraph.match(/(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,]+)/);
          const company = companyMatch ? companyMatch[1].trim() : 'Company';
          
          // Try to extract dates
          const dateMatch = paragraph.match(datePattern);
          const duration = dateMatch ? dateMatch[0].trim() : 'Duration';
          
          if (titleMatch || companyMatch || dateMatch) {
            experience.push({ title, company, duration });
          }
        }
      }
    }
    
    // Return the structured data
    return {
      technical_skills,
      soft_skills,
      experience
    };
  };

  return (
    <div className="w-full">
      {/* Processing status */}
      {processing && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin mr-2" />
            <h3 className="text-sm font-medium text-blue-700">
              Processing Resume
            </h3>
          </div>
          <p className="mt-2 text-xs text-blue-600 capitalize">
            {processingStep}...
          </p>
          <div className="mt-3 w-full bg-blue-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full animate-pulse" 
              style={{ width: '100%' }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Processing Failed
              </h3>
              <p className="mt-1 text-xs text-red-700">{error}</p>
              <button
                onClick={processResume}
                className="mt-2 text-xs font-medium text-red-700 hover:text-red-800 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success message and extracted data */}
      {success && extractedData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="font-medium text-green-800">Resume Processed Successfully</h3>
          </div>
          
          {fileName && (
            <p className="text-xs text-green-700 mb-3">
              File: {fileName}
            </p>
          )}
          
          <div className="space-y-4">
            {/* Technical Skills */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Technical Skills</h4>
              <div className="flex flex-wrap gap-1">
                {extractedData.technical_skills.length > 0 ? (
                  extractedData.technical_skills.map((skill: string, index: number) => (
                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No technical skills detected</p>
                )}
              </div>
            </div>
            
            {/* Soft Skills */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Soft Skills</h4>
              <div className="flex flex-wrap gap-1">
                {extractedData.soft_skills.length > 0 ? (
                  extractedData.soft_skills.map((skill: string, index: number) => (
                    <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No soft skills detected</p>
                )}
              </div>
            </div>
            
            {/* Experience */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Experience</h4>
              {extractedData.experience.length > 0 ? (
                <div className="space-y-2">
                  {extractedData.experience.map((exp: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-2 rounded border border-gray-200">
                      <p className="font-medium text-sm">{exp.title}</p>
                      <p className="text-xs text-gray-600">{exp.company}</p>
                      <p className="text-xs text-gray-500">{exp.duration}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No experience detected</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}