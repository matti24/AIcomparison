export default function Loading() {
  return (
    <div className="content-width py-12" role="status" aria-label="Loading models">
      <div className="skeleton h-3 w-32" /><div className="skeleton mt-5 h-10 w-3/4 max-w-xl" /><div className="skeleton mt-5 h-4 w-2/3 max-w-lg" />
      <div className="model-grid mt-10">{Array.from({ length: 6 }, (_, index) => <div key={index} className="panel"><div className="flex items-center gap-3"><div className="skeleton size-11" /><div className="skeleton h-4 w-1/2" /></div><div className="skeleton mt-6 h-3 w-full" /><div className="skeleton mt-3 h-3 w-4/5" /><div className="skeleton mt-8 h-12 w-full" /><div className="skeleton mt-6 h-6 w-2/5" /></div>)}</div>
      <span className="sr-only">Loading the AI model catalog...</span>
    </div>
  );
}
