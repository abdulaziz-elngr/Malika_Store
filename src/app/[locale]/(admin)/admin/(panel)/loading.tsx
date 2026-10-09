import { Skeleton } from "@/components/admin/primitives";

export default function PanelLoading() {
  return (
    <div className="space-y-8" role="status" aria-busy="true">
      <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-12 w-80 max-w-full" /></div>
      <div className="flex gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-24" />)}</div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  );
}
