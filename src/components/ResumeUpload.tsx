import { AlertCircle, CheckCircle, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Fix component name to match file name
export default function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (selectedFile) {
      // Check if file is PDF or DOCX
      if (selectedFile.type !== 'application/pdf' && 
          selectedFile.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setError('Please upload a PDF or DOCX file');
        return;
      }
      
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size should be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    setSuccess(false);
    setExtractedText('');
    
    try {
      // 1. Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `resumes/${fileName}`;
      
      setProcessingStep('uploading');
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // 2. Get public URL
      const { data: urlData } = await supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);
        
      const fileUrl = urlData.publicUrl;
      
      // 3. Process and extract text from file using external API
      setUploading(false);
      setProcessing(true);
      setProcessingStep('extracting text via API');
      
      // Use the file-to-text API for text extraction
      const formData = new FormData();
      formData.append("file", file);
      
      console.log('Sending file to external text extraction API:', file.name);
      
      const extractionResponse = await fetch("https://file-to-text-nextcn.vercel.app/extract-text", {
        method: "POST",
        body: formData,
      });
      
      if (!extractionResponse.ok) {
        throw new Error(`Text extraction API error: ${extractionResponse.statusText}`);
      }
      
      const extractedText = await extractionResponse.text();
      setExtractedText(extractedText);
      
      // Log the response from the text extraction API
      console.log('Text Extraction API Response Length:', extractedText.length);
      console.log('Text Extraction API Sample:', extractedText.substring(0, 200));
      
      // 4. Analyze text to extract structured data using Gemini
      setProcessingStep('analyzing with AI');
      const parsedData = await analyzeResumeText(extractedText);
      
      // Log the response from Gemini
      console.log('Gemini Analysis Response:', parsedData);
      
      // 5. Store results in database
      setProcessingStep('saving');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      const { error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          file_name: file.name,
          file_url: fileUrl,
          extracted_data: parsedData,
          extracted_text: extractedText.substring(0, 10000) // Store first 10K chars of extracted text
        });
        
      if (dbError) throw dbError;
      
      // Show success
      setSuccess(true);
      setExtractedData(parsedData);
      
      // Log successful completion
      console.log('Resume processing completed successfully:', {
        fileName: file.name,
        textLength: extractedText.length,
        skills: {
          technical: parsedData.technical_skills.length,
          soft: parsedData.soft_skills.length
        },
        experience: parsedData.experience.length
      });
      
    } catch (err) {
      console.error('Upload/processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload or process resume');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  // Analyze resume text and extract structured information
  const analyzeResumeText = async (text: string): Promise<any> => {
    // Check if we have valid text to analyze
    if (!text || text.length < 50) {
        console.warn('Text extraction was not successful, using minimal fallback approach');
        return await fallbackGeminiExtraction(text || "Failed to extract resume text");
    }
    
    try {
        setProcessingStep('analyzing with Gemini AI');
        console.log('Sending text to Gemini API for analysis, text length:', text.length);
        
        // Updated prompt with clearer instructions
        const prompt = `
Analyze this resume text and extract structured information. Follow these rules:
1. Technical skills: List specific technologies, tools, and programming languages
2. Soft skills: Identify interpersonal and professional skills
3. Experience: Extract job titles, company names, and durations in MM/YYYY format

Return ONLY a JSON object with this structure:
{
    "technical_skills": ["JavaScript", "React", ...],
    "soft_skills": ["Teamwork", "Communication", ...],
    "experience": [
        {
            "title": "Software Engineer",
            "company": "Tech Corp",
            "duration": "01/2020 - Present"
        },
        ...
    ]
}

Resume text:
${text.substring(0, 30000)}  // Increased character limit
`;

        // Updated API call with correct parameters
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 20,
                    topP: 0.8,
                    maxOutputTokens: 2048
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API error:', errorData);
            throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        // Log the raw response from Gemini
        console.log('Raw Gemini API response:', data);
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Unexpected Gemini API response format:', data);
            throw new Error('Invalid response from Gemini API');
        }
        
        // Improved JSON extraction
        const responseText = data.candidates[0].content.parts[0].text;
        console.log('Gemini response text:', responseText);
        
        let parsedData;
        try {
            // First try to parse directly
            parsedData = JSON.parse(responseText);
        } catch (e) {
            // If that fails, try to extract JSON from markdown code block

            const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[1]);
            } else {
                // Final fallback to text extraction
                return fallbackGeminiExtraction(text);
            }
        }

        // Validate and normalize the response
        const result = {
            technical_skills: Array.isArray(parsedData?.technical_skills) ? 
                parsedData.technical_skills.filter((s: any) => typeof s === 'string') : [],
            soft_skills: Array.isArray(parsedData?.soft_skills) ? 
                parsedData.soft_skills.filter((s: any) => typeof s === 'string') : [],
            experience: Array.isArray(parsedData?.experience) ? 
                parsedData.experience.filter((e: any) => e.title && e.company) : []
        };
        
        console.log('Validated Gemini response:', result);
        return result;

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Fall back to alternative Gemini extraction with simplified prompt
      return fallbackGeminiExtraction(text);
    }
  };
  
  // Fallback extraction method using Gemini with simplified prompt
  const fallbackGeminiExtraction = async (text: string) => {
    console.log('Using fallback Gemini extraction with simplified prompt');
    
    // Simplified but structured prompt
    const prompt = `
Extract skills from this text that might come from a resume. Separate technical skills from soft skills.
Even if the text is partial or corrupted, try to identify any skills that might be present.

Format your response ONLY as a valid JSON object with this structure:
{
  "technical_skills": ["skill1", "skill2", ...],
  "soft_skills": ["skill1", "skill2", ...],
  "experience": []
}

Text:
${text.substring(0, 5000)}
`;

    try {
      // Call Gemini API with simplified prompt
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 512
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get a response from Gemini API in fallback mode');
      }
      
      const data = await response.json();
      console.log('Fallback Gemini raw response:', data);
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid Gemini API response in fallback mode');
      }
      
      const responseText = data.candidates[0].content.parts[0].text;
      console.log('Fallback Gemini response text:', responseText);
      
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
        console.log('Successfully parsed fallback Gemini response');
      } catch (e) {
        console.error('Failed to parse Gemini fallback response:', e);
        throw e;
      }
      
      // Create simple experience entry if we can detect something that looks like a job title
      let experience = [];
      const titleMatch = text.match(/(?:developer|engineer|manager|analyst|designer|architect|specialist|consultant)/i);
      if (titleMatch) {
        experience.push({
          title: titleMatch[0].charAt(0).toUpperCase() + titleMatch[0].slice(1),
          company: "Unknown",
          duration: "Unknown"
        });
        console.log('Created fallback experience entry based on title match:', titleMatch[0]);
      }
      
      const result = {
        technical_skills: Array.isArray(parsedData.technical_skills) ? parsedData.technical_skills : [],
        soft_skills: Array.isArray(parsedData.soft_skills) ? parsedData.soft_skills : [],
        experience: Array.isArray(parsedData.experience) && parsedData.experience.length > 0 ? 
                    parsedData.experience : experience,
        extraction_note: "Extracted using fallback AI method. Limited information was available from the document."
      };
      
      console.log('Final fallback result:', result);
      return result;
      
    } catch (error) {
      console.error('Fallback Gemini extraction failed:', error);
      // Final fallback with minimal data
      return {
        technical_skills: [],
        soft_skills: [],
        experience: [],
        extraction_note: "Unable to extract information from the document. Please try uploading a different file or format."
      };
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-2">Upload Resume</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload your PDF or DOCX resume to extract skills and experience information
        </p>
        
        {/* File upload area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center">
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 mb-4">
            Drag and drop your resume here, or click to browse
          </p>
          
          <input
            type="file"
            id="resume-upload"
            className="hidden"
            accept=".pdf,.docx"
            onChange={handleFileChange}
          />
          
          <label
            htmlFor="resume-upload"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            Select File
          </label>
          
          {file && (
            <div className="mt-4 text-sm">
              <p>Selected file: <span className="font-medium">{file.name}</span></p>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md text-sm flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading || processing}
          className={`mt-4 w-full py-2 rounded ${
            !file || uploading || processing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {uploading || processing ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {uploading ? 'Uploading...' : `Processing... (${processingStep})`}
            </span>
          ) : (
            'Upload and Process'
          )}
        </button>
      </div>
      
      {/* Processing logs for debugging (can be removed in production) */}
      {extractedText && (
        <div className="mb-6 p-3 bg-gray-50 rounded-md border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Extracted Text Preview</h4>
          <p className="text-xs text-gray-600 truncate">
            {extractedText.substring(0, 100)}...
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Total characters: {extractedText.length}
          </p>
        </div>
      )}
      
      {/* Success message and extracted data */}
      {success && extractedData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-3">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="font-medium text-green-800">Resume Processed Successfully</h3>
          </div>
          
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
            
            {/* Extraction Notes (if any) */}
            {extractedData.extraction_note && (
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                <p className="text-xs text-yellow-700">{extractedData.extraction_note}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}