import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, Users, UserPlus, Star } from "lucide-react";

const PricingDashboard = () => {
  return (
    <div className="space-y-6 pb-8">
      {/* Description */}
      <p className="text-muted-foreground">
        Review how your menu pricing may affect your business performance and view opportunities to grow your sales.
      </p>

      {/* Review Alert */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-semibold">We're reviewing your submission</span>
              </p>
              <p className="text-sm text-muted-foreground">
                You recently uploaded a copy of your in-store menu.{" "}
                <span className="text-primary">Please allow</span> up to 7 days for changes to reflect in your account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Information */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">We are missing your information</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We don't have enough information to give an estimate of your performance with this menu markup at this time.
          </p>
          <Button variant="destructive" size="lg">
            Upload in-store menu
          </Button>
        </CardContent>
      </Card>

      {/* Compared to Similar Stores */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-sm text-muted-foreground mb-2">Compared to similar stores</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Current markup</span>
              </div>
            </div>
          </div>
          
          {/* Markup Scale - Visual only */}
          <div className="relative h-2 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full mb-8">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-6 bg-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Preview Markup Changes */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Preview markup changes</h3>
          
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">If your markup was</p>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold">0%</span>
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </div>

          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="py-8">
              <div className="flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  We don't have enough information to give an estimate of your performance with this menu markup at this time.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="py-8">
              <div className="flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  We don't have enough information to give an estimate of your performance with this menu markup at this time.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="customers" className="py-8">
              <div className="flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  We don't have enough information to give an estimate of your performance with this menu markup at this time.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Customer Feedback */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Customer feedback</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Ratings and reviews about your pricing from the past 6 months.
          </p>

          <div className="space-y-4">
            {/* Feedback items - placeholder */}
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-start gap-3 py-3 border-b">
                <div className="flex-shrink-0">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-muted stroke-muted" />
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Benefits of matching your in-store prices</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Reach out to our team for questions at{" "}
            <a href="mailto:pricing@craven.com" className="text-primary underline">
              pricing@craven.com
            </a>
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 flex-shrink-0">
                <TrendingUp className="w-12 h-12 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Higher visibility</h4>
                <p className="text-sm text-muted-foreground">
                  Research shows that stores that are priced the same or lower prices on Crave'N than in-store may be surfaced higher on the homepage and are more easily discovered by customers.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 flex-shrink-0">
                <Users className="w-12 h-12 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">More repeat orders</h4>
                <p className="text-sm text-muted-foreground">
                  Customers are 3x more likely to place when they see higher prices all Crave'N than in-store.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 flex-shrink-0">
                <UserPlus className="w-12 h-12 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold mb-2">Attract new customers</h4>
                <p className="text-sm text-muted-foreground">
                  We found that customers are 2x more likely to try a new restaurant if the prices are similar to what they contribute.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingDashboard;
