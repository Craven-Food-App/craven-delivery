import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

const StatementsDashboard = () => {
  return (
    <div className="space-y-6 pb-8">
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="monthly">Monthly statements</TabsTrigger>
          <TabsTrigger value="tax">Tax forms</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Monthly statements</h2>
              <p className="text-sm text-muted-foreground mb-1">
                These are your monthly statements based on your business activity.
              </p>
              <p className="text-sm text-muted-foreground">
                Monthly statements will be available by the 5th day of every month.
              </p>
            </div>

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 mb-6">
                  <div className="relative">
                    <FileText className="w-full h-full text-muted-foreground" strokeWidth={1} />
                    <FileText 
                      className="w-full h-full text-muted-foreground absolute top-2 left-2" 
                      strokeWidth={1} 
                    />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-2">
                  No monthly statements available yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Check back on the 5th of next month.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Tax forms</h2>
              <p className="text-sm text-muted-foreground">
                Your tax forms will appear here when available.
              </p>
            </div>

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 mb-6">
                  <FileText className="w-full h-full text-muted-foreground" strokeWidth={1} />
                </div>
                
                <h3 className="text-xl font-semibold mb-2">
                  No tax forms available yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tax forms will be available annually.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StatementsDashboard;
