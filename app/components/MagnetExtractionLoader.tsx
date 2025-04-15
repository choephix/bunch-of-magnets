export const MagnetExtractionLoader = () => {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="relative w-4 h-4">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin-slow" />
        </div>
        <p className="text-xs text-blue-400 animate-pulse">
          Extracting magnet links from URL...
        </p>
      </div>
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 3s linear infinite;
        }
      `}</style>
    </div>
  );
}; 
