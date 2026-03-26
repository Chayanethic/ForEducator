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

export default function ProductTour({ userId }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const storageKey = `ozone_tour_seen_${userId}`;
    
    if (sessionStorage.getItem(storageKey) === 'true') {
      return; 
    }

    // THE FIX: We put the memory save INSIDE the timeout. 
    // This stops React Strict Mode's invisible double-load from stealing your tour!
    const timer = setTimeout(() => {
      sessionStorage.setItem(storageKey, 'true');
      setRun(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [userId]);

  const steps = [
    {
      target: 'body',
      content: 'Welcome to OZONE! 🚀 Let us take a quick tour of your new AI-powered study dashboard.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '#tour-streak',
      content: 'This is your Daily Streak! 🔥 Complete your active roadmap tasks every day to keep this number growing.',
      placement: 'bottom',
    },
    {
      target: '#tour-join-room',
      content: 'Did your educator give you a Room Code? Paste it here to instantly join a private Live Mock Exam.',
      placement: 'bottom',
    },
    {
      target: '#tour-feed',
      content: 'Want extra practice? Browse the Live Public Feed for exams uploaded by top educators across the platform.',
      placement: 'top',
    },
    {
      target: '#tour-sidebar-pyq',
      content: 'Access our massive vault of official Previous Year Questions (PYQs) here.',
      placement: 'right',
    },
    {
      target: '#tour-sidebar-planner',
      content: 'Need a study schedule? Gemini AI will build you a custom Action Plan here.',
      placement: 'right',
    },
    {
      target: '#tour-sidebar-quiz',
      content: 'Compete with friends! Join real-time Quiz Battles to test your speed and accuracy.',
      placement: 'right',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, action } = data;
    
    if (['finished', 'skipped'].includes(status) || action === 'close') {
      setRun(false);
      if (userId) {
        sessionStorage.setItem(`ozone_tour_seen_${userId}`, 'true');
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
        tooltip: {
          borderRadius: '16px',
          padding: '24px',
        },
        tooltipContainer: {
          textAlign: 'left',
          fontFamily: 'inherit',
          fontWeight: '600',
          fontSize: '15px',
          lineHeight: '1.5'
        },
        buttonNext: {
          backgroundColor: '#4F46E5', 
          borderRadius: '8px',
          fontWeight: '900',
          padding: '10px 20px',
          color: '#ffffff',
          outline: 'none',
          border: 'none',
          cursor: 'pointer'
        },
        buttonBack: {
          marginRight: 14,
          color: '#64748b',
          fontWeight: 'bold'
        },
        buttonSkip: {
          color: '#f43f5e', 
          fontWeight: '900',
          backgroundColor: '#fff1f2',
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer'
        }
      }}
      callback={handleJoyrideCallback}
    />
  );
}