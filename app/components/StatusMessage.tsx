interface StatusMessageProps {
  status: {
    type: 'success' | 'error';
    message: string;
  } | null;
}

export const StatusMessage = ({ status }: StatusMessageProps) => {
  if (!status) return null;

  return (
    <div
      className={`mt-3 p-3 rounded-lg text-sm ${
        status.type === 'success'
          ? 'bg-green-900/50 text-green-200 border border-green-800'
          : 'bg-red-900/50 text-red-200 border border-red-800'
      }`}
    >
      {status.message}
    </div>
  );
}; 
