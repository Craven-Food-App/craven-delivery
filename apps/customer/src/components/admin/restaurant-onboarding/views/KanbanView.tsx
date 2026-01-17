// @ts-nocheck
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Store, 
  MapPin, 
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Utensils,
  CreditCard,
  Rocket,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { RestaurantOnboardingData, OnboardingStage } from '../types';
import { getOnboardingStage, getTimeAgo, getPriorityLevel } from '../utils/helpers';

interface KanbanViewProps {
  restaurants: RestaurantOnboardingData[];
  onVerifyDocuments?: (restaurant: RestaurantOnboardingData) => void;
  onUpdateStage?: (restaurantId: string, newStage: OnboardingStage) => Promise<void>;
}

interface KanbanColumn {
  id: OnboardingStage;
  title: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
}

const columns: KanbanColumn[] = [
  {
    id: 'documents_pending',
    title: 'Documents Pending',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    description: 'Missing required documents'
  },
  {
    id: 'verification_pending',
    title: 'Verification',
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    description: 'Awaiting admin verification'
  },
  {
    id: 'setup_in_progress',
    title: 'Setup',
    icon: Utensils,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Menu & banking setup'
  },
  {
    id: 'ready_to_launch',
    title: 'Ready to Launch',
    icon: Rocket,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'All requirements met'
  },
  {
    id: 'live',
    title: 'Live',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'Active on platform'
  }
];

export function KanbanView({ 
  restaurants, 
  onVerifyDocuments,
  onUpdateStage 
}: KanbanViewProps) {
  const [draggedRestaurant, setDraggedRestaurant] = useState<RestaurantOnboardingData | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<OnboardingStage | null>(null);

  // Group restaurants by stage
  const restaurantsByStage = restaurants.reduce((acc, restaurant) => {
    const stage = getOnboardingStage(restaurant);
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(restaurant);
    return acc;
  }, {} as Record<OnboardingStage, RestaurantOnboardingData[]>);

  const handleDragStart = (e: React.DragEvent, restaurant: RestaurantOnboardingData) => {
    setDraggedRestaurant(restaurant);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedRestaurant(null);
    setDragOverColumn(null);
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (columnId: OnboardingStage) => {
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: OnboardingStage) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedRestaurant) return;

    const currentStage = getOnboardingStage(draggedRestaurant);
    if (currentStage === targetStage) return;

    // Call the update function
    if (onUpdateStage) {
      await onUpdateStage(draggedRestaurant.restaurant_id, targetStage);
    }

    setDraggedRestaurant(null);
  };

  return (
    <div className="h-[calc(100vh-300px)] overflow-x-auto">
      <div className="flex gap-4 h-full min-w-max pb-4">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnRestaurants = restaurantsByStage[column.id] || [];
          const isHighPriority = columnRestaurants.some(r => getPriorityLevel(r) === 'high');

          return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 flex flex-col rounded-lg border-2 transition-all ${
                dragOverColumn === column.id
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`${column.bgColor} p-4 rounded-t-lg border-b-2 border-gray-200`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${column.color}`} />
                    <h3 className="font-semibold text-sm">{column.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {isHighPriority && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {columnRestaurants.length}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{column.description}</p>
              </div>

              {/* Column Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {columnRestaurants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No restaurants</p>
                  </div>
                ) : (
                  columnRestaurants.map((restaurant) => (
                    <KanbanCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      onDragStart={(e) => handleDragStart(e, restaurant)}
                      onDragEnd={handleDragEnd}
                      onVerifyDocuments={onVerifyDocuments}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  restaurant: RestaurantOnboardingData;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onVerifyDocuments?: (restaurant: RestaurantOnboardingData) => void;
}

function KanbanCard({ 
  restaurant, 
  onDragStart, 
  onDragEnd,
  onVerifyDocuments 
}: KanbanCardProps) {
  const priority = getPriorityLevel(restaurant);
  const timeAgo = getTimeAgo(restaurant.created_at);

  const priorityColors = {
    high: 'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-yellow-500',
    low: 'border-l-4 border-l-green-500',
  };

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-move hover:shadow-md transition-all ${priorityColors[priority]} bg-white`}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* Logo */}
          <div className="flex-shrink-0">
            {restaurant.restaurant.logo_url ? (
              <img
                src={restaurant.restaurant.logo_url}
                alt={restaurant.restaurant.name}
                className="w-10 h-10 rounded object-cover border"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center border">
                <Store className="h-5 w-5 text-orange-600" />
              </div>
            )}
          </div>

          {/* Title & Actions */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate mb-1">
              {restaurant.restaurant.name}
            </h4>
            {priority === 'high' && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Urgent
              </Badge>
            )}
          </div>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onVerifyDocuments?.(restaurant)}>
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-2">
        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">
            {restaurant.restaurant.city}, {restaurant.restaurant.state}
          </span>
        </div>

        {/* Cuisine */}
        {restaurant.restaurant.cuisine_type && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-xs">🍽️</span>
            <span className="truncate">{restaurant.restaurant.cuisine_type}</span>
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex flex-wrap gap-1 pt-1">
          {restaurant.business_info_verified && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
              Verified
            </Badge>
          )}
          {restaurant.menu_preparation_status === 'ready' && (
            <Badge variant="outline" className="text-xs">
              <Utensils className="w-3 h-3 mr-1 text-blue-600" />
              Menu
            </Badge>
          )}
          {restaurant.restaurant.banking_complete && (
            <Badge variant="outline" className="text-xs">
              <CreditCard className="w-3 h-3 mr-1 text-purple-600" />
              Banking
            </Badge>
          )}
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3" />
          <span>{timeAgo}</span>
        </div>
      </CardContent>
    </Card>
  );
}

