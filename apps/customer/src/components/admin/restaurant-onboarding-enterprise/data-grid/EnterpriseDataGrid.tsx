import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings2,
  Download,
  Filter,
  Search,
  MoreVertical,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { RestaurantOnboardingData } from '../../restaurant-onboarding/types';
import {
  getOnboardingStage,
  getStageName,
  getStageColor,
  getReadinessScore,
  getPriorityLevel,
  getDaysInStage,
  formatDate,
  hasAllDocuments,
} from '../../restaurant-onboarding/utils/helpers';

export interface EnterpriseDataGridProps {
  data: RestaurantOnboardingData[];
  onRowClick?: (restaurant: RestaurantOnboardingData) => void;
  onBulkAction?: (restaurantIds: string[], action: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function EnterpriseDataGrid({
  data,
  onRowClick,
  onBulkAction,
  selectedIds = [],
  onSelectionChange,
}: EnterpriseDataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Sync row selection with selectedIds prop
  useMemo(() => {
    if (selectedIds.length === 0) {
      if (Object.keys(rowSelection).length > 0) {
        setRowSelection({});
      }
      return;
    }
    
    const selection: Record<string, boolean> = {};
    selectedIds.forEach(id => {
      selection[id] = true;
    });
    setRowSelection(selection);
  }, [selectedIds]);

  // Update parent when selection changes
  const handleSelectionChange = (updater: any) => {
    const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
    setRowSelection(newSelection);
    
    // Extract selected IDs (they're already restaurant IDs thanks to getRowId)
    const selectedRowIds = Object.keys(newSelection).filter(key => newSelection[key]);
    onSelectionChange?.(selectedRowIds);
  };

  const columns = useMemo<ColumnDef<RestaurantOnboardingData>[]>(
    () => [
      {
        id: 'select',
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => row.toggleSelected(!!checked)}
              aria-label="Select row"
            />
          </div>
        ),
      },
      {
        accessorKey: 'restaurant.name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Restaurant Name
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const restaurant = row.original;
          const stage = getOnboardingStage(restaurant);
          const priority = getPriorityLevel(restaurant);
          return (
            <div className="flex items-center gap-3 min-w-[250px]">
              {restaurant.restaurant.logo_url ? (
                <img
                  src={restaurant.restaurant.logo_url}
                  alt={restaurant.restaurant.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                  <span className="text-orange-600 font-semibold text-sm">
                    {restaurant.restaurant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <div className="font-semibold truncate">{restaurant.restaurant.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      priority === 'high' ? 'border-red-500 text-red-600' :
                      priority === 'medium' ? 'border-yellow-500 text-yellow-600' :
                      'border-green-500 text-green-600'
                    }`}
                  >
                    {priority === 'high' ? '🔴 Urgent' : priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
                  </Badge>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'stage',
        accessorFn: (row) => getOnboardingStage(row),
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Stage
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const stage = getOnboardingStage(row.original);
          const stageColor = getStageColor(stage);
          return (
            <Badge className={`${stageColor} border font-medium`}>
              {getStageName(stage)}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          const stage = getOnboardingStage(row.original);
          return value.includes(stage);
        },
      },
      {
        accessorKey: 'restaurant.city',
        header: 'Location',
        cell: ({ row }) => {
          const r = row.original.restaurant;
          return (
            <div className="text-sm">
              {r.city && r.state ? `${r.city}, ${r.state}` : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'restaurant.email',
        header: 'Email',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground max-w-[200px] truncate">
            {row.original.restaurant.email || 'N/A'}
          </div>
        ),
      },
      {
        id: 'documents',
        header: 'Documents',
        cell: ({ row }) => {
          const hasAll = hasAllDocuments(row.original);
          return (
            <Badge variant={hasAll ? 'default' : 'destructive'}>
              {hasAll ? '✓ Complete' : '⚠ Missing'}
            </Badge>
          );
        },
      },
      {
        id: 'menu_status',
        accessorKey: 'menu_preparation_status',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Menu Status
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const status = row.original.menu_preparation_status;
          const statusColors = {
            not_started: 'bg-red-100 text-red-700 border-red-300',
            in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-300',
            ready: 'bg-green-100 text-green-700 border-green-300',
          };
          const statusLabels = {
            not_started: 'Not Started',
            in_progress: 'In Progress',
            ready: 'Ready',
          };
          return (
            <Badge variant="outline" className={statusColors[status]}>
              {statusLabels[status]}
            </Badge>
          );
        },
      },
      {
        id: 'readiness',
        accessorFn: (row) => getReadinessScore(row),
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Readiness
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const score = getReadinessScore(row.original);
          return (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    score >= 80 ? 'bg-green-600' :
                    score >= 60 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-medium w-12">{score}%</span>
            </div>
          );
        },
      },
      {
        id: 'days_in_stage',
        accessorFn: (row) => getDaysInStage(row),
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Days in Stage
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const days = getDaysInStage(row.original);
          return (
            <div className={`text-sm font-medium ${
              days > 5 ? 'text-red-600' : days > 3 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {days}d
            </div>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Applied
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDate(row.original.created_at)}
          </div>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick?.(row.original);
                  }}
                >
                  View Details
                </Button>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onRowClick]
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleSelectionChange,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    enableRowSelection: true,
    getRowId: (row) => row.restaurant_id, // Use restaurant_id as row ID
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  const selectedCount = Object.keys(rowSelection).filter(
    key => rowSelection[key]
  ).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search restaurants..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          {selectedCount > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedCount} selected
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-12">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={(e) => {
                        // Don't trigger row click for select checkbox or actions
                        if (cell.column.id === 'select' || cell.column.id === 'actions') {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} restaurants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-center text-sm font-medium w-8">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

