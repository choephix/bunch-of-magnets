import { useCallback } from 'react';
import { appStateActions } from '../stores/appStateStore';
import { getAllSuggestionsSnapshot } from '../stores/appStateStore';

export const SuggestionPills = () => {
  const suggestions = getAllSuggestionsSnapshot();

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('📋 Copied to clipboard:', text);
    } catch (err) {
      console.error('❌ Failed to copy:', err);
    }
  }, []);

  if (suggestions.length === 0) return null;

  return (
    <div className='flex flex-wrap gap-2'>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type='button'
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            appStateActions.applySuggestion(suggestion);
            copyToClipboard(
              suggestion.type === 'season'
                ? `Season ${suggestion.value}`
                : (suggestion.value as string)
            );
          }}
          className={`px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-2 ${
            suggestion.type === 'season'
              ? 'bg-purple-900/50 text-purple-200 hover:bg-purple-800/50'
              : suggestion.type === 'library'
              ? 'bg-green-900/50 text-green-200 hover:bg-green-800/50'
              : 'bg-blue-900/50 text-blue-200 hover:bg-blue-800/50'
          }`}
        >
          <span>
            {suggestion.type === 'season' ? `Season ${suggestion.value}` : suggestion.value}
          </span>
        </button>
      ))}
    </div>
  );
}; 
