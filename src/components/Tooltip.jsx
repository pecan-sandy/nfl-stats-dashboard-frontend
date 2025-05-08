// components/Tooltip.jsx
import React, { useState, useEffect, useRef } from 'react';

// Renamed from InfoTooltip for general use
const Tooltip = ({ text }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const hideTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    // Delay hiding to allow cursor movement onto tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 400); // Keep the 400ms delay
  };

  // Clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    // Wrapper span for positioning context and hover events
    <span 
      className="relative inline-block ml-1 align-middle" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* SVG Icon Trigger */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 text-gray-400 inline-block cursor-help"
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      
      {/* Tooltip Content Box */}
      {showTooltip && (
        <span 
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-md shadow-lg z-20 border border-gray-700"
          onMouseEnter={handleMouseEnter} // Keep tooltip visible when hovering over it
          onMouseLeave={handleMouseLeave} // Start hide timer when leaving content
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
