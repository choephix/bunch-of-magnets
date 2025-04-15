import { appStateActions, useAppState } from '../stores/appStateStore';

export const SaveDir = () => {
  const { savePath } = useAppState();

  return (
    <div>
      <label htmlFor='savePath' className='block text-xs font-medium mb-1 text-gray-300'>
        Save Directory
      </label>
      <input
        type='text'
        id='savePath'
        value={savePath}
        onChange={e => appStateActions.setSavePath(e.target.value)}
        className='w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all'
        placeholder='/path/to/save/directory'
        required
      />
    </div>
  );
}; 
