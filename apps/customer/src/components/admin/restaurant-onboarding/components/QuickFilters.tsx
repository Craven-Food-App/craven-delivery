import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  X, 
  Filter,
  SlidersHorizontal,
  AlertCircle
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import type { OnboardingStage } from '../types';
import { getStageName, getStageIcon } from '../utils/helpers';

interface QuickFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStages: OnboardingStage[];
  onStagesChange: (stages: OnboardingStage[]) => void;
  hasAllDocsFilter?: boolean;
  onHasAllDocsChange?: (value: boolean | undefined) => void;
  priorityFilter?: 'high' | 'medium' | 'low';
  onPriorityChange?: (priority: 'high' | 'medium' | 'low' | undefined) => void;
}

const allStages: OnboardingStage[] = [
  'new_application',
  'documents_pending',
  'under_review',
  'menu_setup',
  'banking_setup',
  'ready_to_launch',
  'live',
  'rejected',
];

export function QuickFilters({
  searchQuery,
  onSearchChange,
  selectedStages,
  onStagesChange,
  hasAllDocsFilter,
  onHasAllDocsChange,
  priorityFilter,
  onPriorityChange,
}: QuickFiltersProps) {
  const activeFilterCount = 
    selectedStages.length + 
    (hasAllDocsFilter !== undefined ? 1 : 0) +
    (priorityFilter ? 1 : 0);

  const toggleStage = (stage: OnboardingStage) => {
    if (selectedStages.includes(stage)) {
      onStagesChange(selectedStages.filter(s => s !== stage));
    } else {
      onStagesChange([...selectedStages, stage]);
    }
  };

  const clearAllFilters = () => {
    onSearchChange('');
    onStagesChange([]);
    onHasAllDocsChange?.(undefined);
    onPriorityChange?.(undefined);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, city, or cuisine..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Advanced Filters Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Filter by Stage</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allStages.map(stage => (
              <DropdownMenuCheckboxItem
                key={stage}
                checked={selectedStages.includes(stage)}
                onCheckedChange={() => toggleStage(stage)}
              >
                <span className="mr-2">{getStageIcon(stage)}</span>
                {getStageName(stage)}
              </DropdownMenuCheckboxItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Other Filters</DropdownMenuLabel>
            
            <DropdownMenuCheckboxItem
              checked={hasAllDocsFilter === true}
              onCheckedChange={(checked) => onHasAllDocsChange?.(checked ? true : undefined)}
            >
              📄 Has All Documents
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuCheckboxItem
              checked={hasAllDocsFilter === false}
              onCheckedChange={(checked) => onHasAllDocsChange?.(checked ? false : undefined)}
            >
              ⚠️ Missing Documents
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            
            <DropdownMenuCheckboxItem
              checked={priorityFilter === 'high'}
              onCheckedChange={(checked) => onPriorityChange?.(checked ? 'high' : undefined)}
            >
              🔴 High Priority
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuCheckboxItem
              checked={priorityFilter === 'medium'}
              onCheckedChange={(checked) => onPriorityChange?.(checked ? 'medium' : undefined)}
            >
              🟡 Medium Priority
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuCheckboxItem
              checked={priorityFilter === 'low'}
              onCheckedChange={(checked) => onPriorityChange?.(checked ? 'low' : undefined)}
            >
              🟢 Low Priority
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            onClick={clearAllFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Quick Stage Filters (Chips) */}
      <div className="flex flex-wrap gap-2">
        {allStages.slice(0, 5).map(stage => (
          <Badge
            key={stage}
            variant={selectedStages.includes(stage) ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/90 transition-colors"
            onClick={() => toggleStage(stage)}
          >
            <span className="mr-1">{getStageIcon(stage)}</span>
            {getStageName(stage)}
          </Badge>
        ))}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
        </div>
      )}
    </div>
  );
}


