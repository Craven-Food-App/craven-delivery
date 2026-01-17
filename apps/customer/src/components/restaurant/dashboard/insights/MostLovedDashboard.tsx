import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, AlertCircle, MapPin, Award, ChevronRight, Info } from "lucide-react";

const MostLovedDashboard = () => {
  return (
    <div className="space-y-6 pb-8">
      {/* Month Tabs */}
      <Tabs defaultValue="november" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0">
          <TabsTrigger 
            value="november" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
          >
            November (pending)
          </TabsTrigger>
          <TabsTrigger 
            value="october"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
          >
            October (pending)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="november" className="mt-8 space-y-6">
          {/* Earn Badge Section */}
          <div>
            <h2 className="text-2xl font-bold mb-2">Earn Most Loved for this November</h2>
            <p className="text-sm mb-6">
              You must meet the following goals from <span className="text-primary">October 1 - 31, 2025</span> to qualify for Most Loved and its benefits for November.
            </p>
            
            <div className="flex gap-3 p-4 bg-muted rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">No data yet</p>
                <p className="text-sm text-muted-foreground">
                  It may take up to a day for your data to update. Please check back soon to see your Most Loved status.
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Avoidable cancellation rate</h3>
                  <p className="text-sm text-muted-foreground mb-4">Goal: 1.1% or lower</p>
                  <p className="text-3xl font-bold">No data</p>
                </div>
                <Button variant="outline" className="w-full">
                  View cancellations
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Missing or incorrect rate</h3>
                  <p className="text-sm text-muted-foreground mb-4">Goal: 2.0% or lower</p>
                  <p className="text-3xl font-bold">No data</p>
                </div>
                <Button variant="outline" className="w-full">
                  View order accuracy
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Customer rating</h3>
                  <p className="text-sm text-muted-foreground mb-4">Goal: 4.70 or higher</p>
                  <p className="text-3xl font-bold">No data</p>
                </div>
                <Button variant="outline" className="w-full">
                  View ratings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Lifetime Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Lifetime requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store logo and header images */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Store logo and header images (both required)</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">No data yet</span>
                  </div>
                </div>

                {/* Lifetime orders */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Lifetime orders (25 or more required)</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">No data yet</span>
                  </div>
                </div>

                {/* Menu markup rate */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Menu markup rate (10% or lower markup rate)</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">No data yet</span>
                  </div>
                </div>

                {/* Lifetime rating */}
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Lifetime rating (4.50 or higher required)</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">No data yet</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Perks Section */}
          <div>
            <h2 className="text-xl font-bold mb-2">Perks for Most Loved merchants</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Join the ranks of our top-rated merchants and enjoy exclusive benefits
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Better visibility</h3>
                  <p className="text-sm text-muted-foreground">
                    Get featured prominently in search results and recommendations, attracting more customers to your store.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Operational excellence</h3>
                  <p className="text-sm text-muted-foreground">
                    Priority support from our merchant success team and early access to new features and tools.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently asked questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I achieve Most Loved?</AccordionTrigger>
                  <AccordionContent>
                    To achieve Most Loved status, you need to consistently meet high standards across customer satisfaction, order quality, and delivery performance. This includes maintaining high ratings, meeting minimum order volumes, and providing excellent customer experiences.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How are Most Loved results determined?</AccordionTrigger>
                  <AccordionContent>
                    Most Loved status is determined by a combination of factors including customer ratings, extreme satisfaction scores, order accuracy, and overall customer experience metrics over a 3-month rolling period.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How will I know if I win Most Loved?</AccordionTrigger>
                  <AccordionContent>
                    You'll receive an email notification when you achieve Most Loved status. The badge will also appear on your store profile and you'll see it reflected in your merchant dashboard.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>How do I see which stores I can travel to?</AccordionTrigger>
                  <AccordionContent>
                    You can view all Most Loved stores in your area through the Crave'N app or website. Use the filters to see top-rated restaurants and those with the Most Loved badge.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="october" className="mt-8">
          <p className="text-muted-foreground">October data will be available soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MostLovedDashboard;
