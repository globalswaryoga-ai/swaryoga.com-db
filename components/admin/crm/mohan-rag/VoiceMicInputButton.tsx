'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Globe } from 'lucide-react';

interface VoiceMicInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  defaultLanguage?: 'mr-IN' | 'hi-IN' | 'en-IN';
  buttonText?: string;
}

export function VoiceMicInputButton({
  onTranscript,
  className = '',
  defaultLanguage = 'mr-IN',
  buttonText,
}: VoiceMicInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'mr-IN' | 'hi-IN' | 'en-IN'>(defaultLanguage);
  const [supported, setSupported] = useState(true);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Speech Recognition is not natively supported in this browser.\n\nTip for Mac users: Press the "Fn" key twice (or Dictation key F5) on your Mac keyboard to speak directly into any text box in Hindi, Marathi, or English!'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText('');
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        if (finalTrans) {
          onTranscript(finalTrans.trim());
          setInterimText('');
        } else if (interimTrans) {
          setInterimText(interimTrans);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimText('');
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Language Selector for Speech */}
      <div className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
        <Globe className="mr-1 h-3 w-3 text-slate-500" />
        <select
          value={selectedLang}
          onChange={(e) => {
            const newLang = e.target.value as any;
            setSelectedLang(newLang);
            if (isListening) {
              stopListening();
            }
          }}
          className="bg-transparent text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
          title="Select speech recognition language"
        >
          <option value="mr-IN">मराठी (MR)</option>
          <option value="hi-IN">हिन्दी (HI)</option>
          <option value="en-IN">English (EN)</option>
        </select>
      </div>

      {/* Main Microphone Button */}
      <button
        type="button"
        onClick={toggleMic}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
          isListening
            ? 'animate-pulse bg-red-600 text-white ring-4 ring-red-300'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
        }`}
        title={
          isListening
            ? 'Click to stop listening'
            : 'Click to speak on microphone (Mac shortcut: Press Fn twice)'
        }
      >
        {isListening ? (
          <>
            <MicOff className="h-3.5 w-3.5" />
            <span>ऐकत आहे... (थांबवा)</span>
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5" />
            <span>{buttonText || 'बोलून टाईप करा'}</span>
          </>
        )}
      </button>

      {/* Interim Listening Speech Feedback */}
      {isListening && interimText && (
        <span className="max-w-[200px] truncate text-[11px] italic text-red-600 font-medium">
          "{interimText}"
        </span>
      )}
    </div>
  );
}

export default VoiceMicInputButton;
