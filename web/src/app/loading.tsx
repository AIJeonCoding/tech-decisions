export default function Loading() {
  return (
    <div className="container-wide py-16">
      <div className="space-y-6 animate-pulse">
        <div className="h-9 w-2/3 bg-muted rounded-md" />
        <div className="h-4 w-1/2 bg-muted rounded-md" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="mt-3 h-3 w-full bg-muted rounded" />
              <div className="mt-2 h-3 w-3/4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
