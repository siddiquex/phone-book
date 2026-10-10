import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// h-5 matches text-sm's line box, so the row height does not shift.
const cellClass = "px-3 py-2";
const barClass = "h-5";
// The real table trims right padding on checkbox cells; match it.
const selectCellClass = `${cellClass} pr-0`;

export function ContactsSkeleton({
  showSearchRow,
  showFooter,
}: {
  showSearchRow: boolean;
  showFooter: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showSearchRow && (
        <div className="flex shrink-0 gap-2 pb-3">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      )}

      <div className="table-flat scroll-thin -mr-3.5 min-h-0 flex-1 overflow-y-auto pr-3.5">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className={selectCellClass}>
                <Skeleton className="size-4" />
              </TableHead>
              <TableHead className={cellClass}>
                <Skeleton className="h-3 w-10" />
              </TableHead>
              <TableHead className={cellClass}>
                <Skeleton className="h-3 w-20" />
              </TableHead>
              <TableHead className={cellClass}>
                <Skeleton className="h-3 w-8" />
              </TableHead>
              <TableHead className={cellClass}>
                <Skeleton className="h-3 w-8" />
              </TableHead>
              <TableHead className={cellClass} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 12 }).map((_, row) => (
              <TableRow key={row}>
                <TableCell className={selectCellClass}>
                  <Skeleton className="size-4" />
                </TableCell>
                <TableCell className={cellClass}>
                  <Skeleton className={`${barClass} w-32`} />
                </TableCell>
                <TableCell className={cellClass}>
                  <Skeleton className={`${barClass} w-32`} />
                </TableCell>
                <TableCell className={cellClass}>
                  <Skeleton className={`${barClass} w-24`} />
                </TableCell>
                <TableCell className={cellClass}>
                  <Skeleton className={`${barClass} w-24`} />
                </TableCell>
                <TableCell className={cellClass}>
                  <div className="flex justify-end gap-1">
                    <Skeleton className="size-5 w-10" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showFooter && (
        <div className="flex shrink-0 items-center justify-center border-t border-border py-3">
          <Skeleton className="h-4 w-24" />
        </div>
      )}
    </div>
  );
}
