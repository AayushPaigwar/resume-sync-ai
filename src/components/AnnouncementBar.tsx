import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface FeatureFlag {
  is_visible: boolean;
  announcement_content: string;
}

export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<FeatureFlag | null>(null);

  useEffect(() => {
    fetchAnnouncementFlag();
  }, []);

  const fetchAnnouncementFlag = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('is_visible, announcement_content')
        .eq('feature_flag_id', 1)
        .single();

      console.log('Announcement data:', data);
      console.log('Announcement error:', error);

      if (error) throw error;
      setAnnouncement(data);
    } catch (error) {
      console.error('Error fetching announcement:', error);
    }
  };

  if (!announcement?.is_visible) {
    console.log('Announcement not visible:', announcement);
    return null;
  }

  return (
    <div className="bg-blue-600 text-white">
      <div className="relative overflow-x-hidden">
        <div className="py-2 flex justify-center items-center whitespace-nowrap animate-marquee">
          <span className="mx-4">{announcement.announcement_content}</span>
        </div>
      </div>
    </div>
  );
}