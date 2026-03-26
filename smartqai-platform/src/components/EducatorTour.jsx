"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Joyride = dynamic(
  async () => {
    const mod = await import('react-joyride');
    return mod.default || mod.Joyride || Object.values(mod).find(exportItem => typeof exportItem === 'function');
  },
  { ssr: false }
);

export default function EducatorTour({ userId }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const storageKey = `ozone_educator_tour_seen_${userId}`;
    
    if (sessionStorage.getItem(storageKey) === 'true') {
      return; 
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem(storageKey, 'true');
      setRun(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [userId]);

  const steps = [
    {
      target: 'body',
      content: 'Welcome to the OZONE Educator Studio! 👨‍🏫 Let us show you how to deploy exams in seconds.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '#tour-pdf-extract',
      content: 'Upload a past paper PDF here. Gemini AI will automatically read it and extract the questions, options, and diagrams for you!',
      placement: 'right',
    },
    {
      target: '#tour-page-range',
      content: 'Got a massive PDF? No problem. Select exactly which pages you want the AI to extract questions from.',
      placement: 'top',
    },
    {
      target: '#tour-ai-solutions',
      content: 'Toggle this on and our AI will automatically generate detailed, step-by-step solutions for every question it extracts!',
      placement: 'top',
    },
    {
      target: '#tour-manual-build',
      content: 'Prefer to write your own questions? Click here to build a custom exam from scratch.',
      placement: 'left',
    },
    {
      target: '#tour-exam-settings',
      content: 'Set your exam rules here: time limits, virtual calculator access, and category.',
      placement: 'top',
    },
    {
      target: '#tour-publish',
      content: 'Once your questions are ready, hit Publish! We will secure the exam and generate a Live Room ID for your students.',
      placement: 'bottom',
    },
    {
      target: '#tour-recent-rooms',
      content: 'See your last published Live Rooms here. Click on any room to jump straight into the live student leaderboard!',
      placement: 'left',
    },
    {
      target: '#tour-quick-poll',
      content: 'Need to test the class instantly? Launch a Live Quiz Poll to send a single question to their screens in real-time.',
      placement: 'left',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, action } = data;
    
    if (['finished', 'skipped'].includes(status) || action === 'close') {
      setRun(false);
      if (userId) {
        sessionStorage.setItem(`ozone_educator_tour_seen_${userId}`, 'true');
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      disableOverlayClose={true} 
      styles={{
        options: {
          primaryColor: '#10B981', 
          textColor: '#0f172a',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(15, 23, 42, 0.90)', 
          zIndex: 10000,
        },
        tooltip: { borderRadius: '16px', padding: '24px' },
        tooltipContainer: { textAlign: 'left', fontFamily: 'inherit', fontWeight: '600', fontSize: '15px', lineHeight: '1.5' },
        buttonNext: { backgroundColor: '#4F46E5', borderRadius: '8px', fontWeight: '900', padding: '10px 20px', color: '#ffffff', border: 'none', cursor: 'pointer' },
        buttonBack: { marginRight: 14, color: '#64748b', fontWeight: 'bold' },
        buttonSkip: { color: '#f43f5e', fontWeight: '900', backgroundColor: '#fff1f2', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }
      }}
      callback={handleJoyrideCallback}
    />
  );
}