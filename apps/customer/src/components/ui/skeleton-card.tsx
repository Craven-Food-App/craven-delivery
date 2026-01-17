import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const RestaurantCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full rounded-t-lg" />
      <CardContent className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
};

export const MenuItemSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <Skeleton className="h-24 w-24 rounded-lg flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </Card>
  );
};

export const OrderCardSkeleton = () => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <div className="flex items-center justify-between mt-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
    </Card>
  );
};
