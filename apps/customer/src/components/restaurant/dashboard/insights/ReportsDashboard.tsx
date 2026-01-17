import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Plus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CreateReportModal } from "@/components/merchant/CreateReportModal";
import { ReportCard } from "@/components/merchant/ReportCard";
import { useRestaurantData } from "@/hooks/useRestaurantData";

const ReportsDashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { restaurant } = useRestaurantData();

  useEffect(() => {
    if (restaurant?.id) {
      fetchReports();
      fetchSchedules();
    }
  }, [restaurant?.id]);

  const fetchReports = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('restaurant_reports')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const fetchSchedules = async () => {
    if (!restaurant?.id) return;

    const { data: reportData } = await supabase
      .from('restaurant_reports')
      .select('id')
      .eq('restaurant_id', restaurant.id);

    if (!reportData || reportData.length === 0) return;

    const reportIds = reportData.map(r => r.id);

    const { data, error } = await supabase
      .from('restaurant_report_schedules')
      .select('*, report:restaurant_reports(*)')
      .in('report_id', reportIds)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching schedules:', error);
    } else {
      setSchedules(data || []);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold mb-2">Reports</h2>
          <p className="text-muted-foreground">
            Create and manage the reports that provide access to sales, operations, and financial data for your store on Crave'N.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create report
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0">
          <TabsTrigger 
            value="available" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
          >
            Available
          </TabsTrigger>
          <TabsTrigger 
            value="scheduled"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent"
          >
            Scheduled ({schedules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-12">
          {loading ? (
            <div className="text-center py-12">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-32 h-32 mb-6 opacity-50">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="100" r="80" fill="#E5E7EB" opacity="0.3"/>
                  <rect x="60" y="50" width="80" height="100" rx="4" fill="#9CA3AF"/>
                  <rect x="70" y="60" width="50" height="70" rx="2" fill="white"/>
                  <line x1="75" y1="70" x2="115" y2="70" stroke="#D1D5DB" strokeWidth="2"/>
                  <line x1="75" y1="80" x2="115" y2="80" stroke="#D1D5DB" strokeWidth="2"/>
                  <line x1="75" y1="90" x2="115" y2="90" stroke="#D1D5DB" strokeWidth="2"/>
                  <line x1="75" y1="100" x2="105" y2="100" stroke="#D1D5DB" strokeWidth="2"/>
                  <line x1="75" y1="110" x2="110" y2="110" stroke="#D1D5DB" strokeWidth="2"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">No reports</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                You haven't created any reports yet. When you do, you'll find all of your Crave'N reports here.
              </p>
              <Button variant="outline" className="gap-2" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4" />
                Create report
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onDelete={fetchReports}
                  onSchedule={(report) => {
                    console.log('Schedule report:', report);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-12">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-32 h-32 mb-6 opacity-50">
                <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="100" r="80" fill="#E5E7EB" opacity="0.3"/>
                  <rect x="60" y="50" width="80" height="100" rx="4" fill="#9CA3AF"/>
                  <rect x="70" y="60" width="50" height="70" rx="2" fill="white"/>
                  <line x1="75" y1="70" x2="115" y2="70" stroke="#D1D5DB" strokeWidth="2"/>
                  <line x1="75" y1="80" x2="115" y2="80" stroke="#D1D5DB" strokeWidth="2"/>
                  <line x1="75" y1="90" x2="115" y2="90" stroke="#D1D5DB" strokeWidth="2"/>
                  <line x1="75" y1="100" x2="105" y2="100" stroke="#D1D5DB" strokeWidth="2"/>
                  <line x1="75" y1="110" x2="110" y2="110" stroke="#D1D5DB" strokeWidth="2"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">No scheduled reports</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                You haven't scheduled any reports yet. Schedule reports to receive them automatically at your preferred frequency.
              </p>
              <Button variant="outline" className="gap-2" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4" />
                Create report
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{schedule.report?.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {schedule.frequency} at {schedule.time_of_day}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Next run: {new Date(schedule.next_run_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateReportModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        restaurantId={restaurant?.id || ''}
        onSuccess={fetchReports}
      />
    </div>
  );
};

export default ReportsDashboard;
