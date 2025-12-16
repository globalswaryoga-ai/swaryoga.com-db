import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VideoCarouselProps {
  videos: Array<{ url: string; title: string }>;
  title: string;
}

export default function VideoCarousel({ videos, title }: VideoCarouselProps) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Intersection Observer for autoplay
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Autoplay failed, user interaction required
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) observer.unobserve(video);
      });
    };
  }, []);

  // Sequential autoplay - when one video ends, play next
  useEffect(() => {
    const handleVideoEnd = (index: number) => {
      if (index < videoRefs.current.length - 1) {
        const nextVideo = videoRefs.current[index + 1];
        if (nextVideo) {
          nextVideo.play().catch(() => {
            // Autoplay failed
          });
        }
      }
    };

    videoRefs.current.forEach((video, index) => {
      if (video) {
        video.addEventListener('ended', () => handleVideoEnd(index));
      }
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.removeEventListener('ended', () => {});
        }
      });
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainer.current) {
      const scrollAmount = 400;
      scrollContainer.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollContainer.current) {
      setShowLeftArrow(scrollContainer.current.scrollLeft > 0);
      setShowRightArrow(
        scrollContainer.current.scrollLeft <
          scrollContainer.current.scrollWidth - scrollContainer.current.clientWidth - 10
      );
    }
  };

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          {title}
        </h2>

        <div className="relative">
          {/* Scroll Container */}
          <div
            ref={scrollContainer}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto pb-4 scroll-smooth"
            style={{ scrollBehavior: 'smooth' }}
          >
            {videos.map((video, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-full md:w-96 lg:w-[28rem]"
              >
                <div className="bg-black rounded-lg overflow-hidden shadow-lg aspect-video">
                  <video
                    ref={(el) => {
                      videoRefs.current[idx] = el;
                    }}
                    src={video.url}
                    className="w-full h-full object-cover"
                    muted
                    controls
                    loading="lazy"
                  />
                </div>
                {video.title && (
                  <p className="mt-3 font-medium text-gray-900 text-center">
                    {video.title}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6 text-gray-900" />
            </button>
          )}

          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6 text-gray-900" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
