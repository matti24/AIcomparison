export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="page-header">
        <div className="container-page">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton mt-4 h-8 w-2/3 max-w-lg" />
          <div className="skeleton mt-3 h-4 w-1/2 max-w-md" />
        </div>
      </div>
      <div className="container-page grid gap-2 py-8">
        {Array.from({ length: 8 }, (_, index) => <div key={index} className="skeleton h-16 w-full" />)}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
