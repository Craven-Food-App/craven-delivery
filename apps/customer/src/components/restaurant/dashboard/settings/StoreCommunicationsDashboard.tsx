import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const StoreCommunicationsDashboard = () => {
  return (
    <div className="space-y-6 pb-8">
      {/* Description */}
      <p className="text-muted-foreground">
        Manage your preferences around communications about your store
      </p>

      {/* Important Alerts */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-6">Important alerts</h2>
          
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Store deactivations</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage recipients of email alerts when your store is temporarily deactivated
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">tppandco@mail.com</span>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Reporting */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-6">Performance reporting</h2>
          
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Store performance summary</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn about your store's performance and operational efficiency
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-primary">Weekly</span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm font-medium">tppandco@mail.com</span>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreCommunicationsDashboard;
