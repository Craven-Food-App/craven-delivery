import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Store, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  MessageCircle,
  MoreVertical,
  FileText
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import type { RestaurantOnboardingData } from '../types';
import {
  getOnboardingStage,
  getReadinessScore,
  getStageColor,
  getStageName,
  getDaysInStage,
  getTimeAgo,
  getPriorityLevel,
  getMissingDocuments,
  hasAllDocuments
} from '../utils/helpers';

interface RestaurantCardProps {
  restaurant: RestaurantOnboardingData;
  onView?: (restaurant: RestaurantOnboardingData) => void;
  onApprove?: (restaurant: RestaurantOnboardingData) => void;
  onReject?: (restaurant: RestaurantOnboardingData) => void;
  onChat?: (restaurant: RestaurantOnboardingData) => void;
  onVerifyDocuments?: (restaurant: RestaurantOnboardingData) => void;
  onSelectRestaurant?: (restaurant: RestaurantOnboardingData, selected: boolean) => void;
  isSelected?: boolean;
  bulkSelectionMode?: boolean;
}

export function RestaurantCard({
  restaurant,
  onView,
  onApprove,
  onReject,
  onChat,
  onVerifyDocuments,
  onSelectRestaurant,
  isSelected = false,
  bulkSelectionMode = false,
}: RestaurantCardProps) {
  const stage = getOnboardingStage(restaurant);
  const readiness = getReadinessScore(restaurant);
  const priority = getPriorityLevel(restaurant);
  const daysInStage = getDaysInStage(restaurant);
  const missingDocs = getMissingDocuments(restaurant);

  const stageColor = getStageColor(stage);
  const stageName = getStageName(stage);

  const priorityColors = {
    high: 'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-yellow-500',
    low: 'border-l-4 border-l-green-500',
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${priorityColors[priority]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Restaurant Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Logo */}
            <div className="flex-shrink-0">
              {restaurant.restaurant.logo_url ? (
                <img
                  src={restaurant.restaurant.logo_url}
                  alt={restaurant.restaurant.name}
                  className="w-14 h-14 rounded-lg object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center border-2 border-orange-300">
                  <Store className="h-7 w-7 text-orange-600" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                {bulkSelectionMode && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelectRestaurant?.(restaurant, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                  />
                )}
                <h3 className="font-semibold text-lg truncate flex-1">{restaurant.restaurant.name}</h3>
                {priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Urgent
                  </Badge>
                )}
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                {restaurant.restaurant.cuisine_type && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">🍽️</span>
                    <span className="truncate">{restaurant.restaurant.cuisine_type}</span>
                  </div>
                )}
                {restaurant.restaurant.city && restaurant.restaurant.state && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{restaurant.restaurant.city}, {restaurant.restaurant.state}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Applied {getTimeAgo(restaurant.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stage Badge & Actions */}
          <div className="flex flex-col items-end gap-2">
            <Badge className={`${stageColor} border font-medium`}>
              {stageName}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.preventDefault();
                  onVerifyDocuments?.(restaurant);
                }}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.preventDefault();
                  onVerifyDocuments?.(restaurant);
                }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Verify Documents
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChat?.(restaurant)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat with Merchant
                </DropdownMenuItem>
                {stage === 'under_review' && (
                  <>
                    <DropdownMenuItem onClick={() => onApprove?.(restaurant)}>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onReject?.(restaurant)}>
                      <AlertCircle className="mr-2 h-4 w-4 text-red-600" />
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Readiness Score</span>
            <span className={`font-bold ${readiness >= 80 ? 'text-green-600' : readiness >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {readiness}%
            </span>
          </div>
          <Progress value={readiness} className="h-2" />
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Documents */}
          <div className="flex items-center gap-2 text-sm">
            {hasAllDocuments(restaurant) ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Docs ✓</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-600 font-medium">{missingDocs.length} missing</span>
              </>
            )}
          </div>

          {/* Verification */}
          <div className="flex items-center gap-2 text-sm">
            {restaurant.business_info_verified ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Verified</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-muted-foreground">Pending</span>
              </>
            )}
          </div>

          {/* Menu */}
          <div className="flex items-center gap-2 text-sm">
            {restaurant.menu_preparation_status === 'ready' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Menu ✓</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-muted-foreground capitalize">{restaurant.menu_preparation_status?.replace('_', ' ')}</span>
              </>
            )}
          </div>
        </div>

        {/* Time Warning */}
        {daysInStage > 3 && stage !== 'live' && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              In {stageName} for {daysInStage} days
            </span>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          {restaurant.restaurant.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">{restaurant.restaurant.email}</span>
            </div>
          )}
          {restaurant.restaurant.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{restaurant.restaurant.phone}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onVerifyDocuments?.(restaurant)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          
          {stage === 'under_review' && hasAllDocuments(restaurant) && (
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onApprove?.(restaurant)}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
          )}
          
          {stage === 'documents_pending' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 border-orange-300 text-orange-600"
              onClick={() => onChat?.(restaurant)}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Request Docs
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

