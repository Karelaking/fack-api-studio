import { PageShell } from "@/components/dashboard/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level skeleton for the projects page.
 *
 * It mirrors the real grid's geometry — same shell padding, same rail width,
 * same two-column card track — so the first paint hands over to the loaded
 * page without a layout shift.
 */
export default function DashboardLoading(): React.JSX.Element {
  return (
    <PageShell aria-busy="true">
      <span className="sr-only">Loading projects</span>

      <div className="space-y-2" aria-hidden="true">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>

      <div
        aria-hidden="true"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <Skeleton className="h-11 w-full rounded-md sm:h-10 sm:max-w-sm" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-11 w-11 rounded-md sm:h-10 sm:w-28" />
          <Skeleton className="h-11 w-24 rounded-lg sm:h-10" />
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-6 lg:gap-8">
        <aside
          aria-hidden="true"
          className="order-2 flex w-full shrink-0 flex-col gap-5 md:order-1 md:w-70 lg:w-[320px] xl:w-85 2xl:w-90"
        >
          {[0, 1, 2].map((section) => (
            <div key={section} className="space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </aside>

        <div
          aria-hidden="true"
          className="order-1 min-w-0 flex-1 space-y-4 md:order-2 md:space-y-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:gap-5">
            {[0, 1, 2, 3].map((card) => (
              <div
                key={card}
                className="bg-card/30 border-border/50 flex flex-col gap-4 rounded-xl border p-5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
