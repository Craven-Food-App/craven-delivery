import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Lightbulb, Star, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { toast } from "sonner";

const RatingsReviewsDashboard = () => {
  const { restaurant } = useRestaurantData();
  const [dateRange, setDateRange] = useState("last-7-days");
  const [showTip, setShowTip] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (restaurant?.id) {
      fetchReviews();
    }
  }, [restaurant?.id, dateRange]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      if (dateRange === "last-7-days") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === "last-30-days") {
        startDate.setDate(startDate.getDate() - 30);
      } else if (dateRange === "last-3-months") {
        startDate.setMonth(startDate.getMonth() - 3);
      }

      const { data, error } = await supabase
        .from("customer_reviews")
        .select(`
          *,
          orders(order_number)
        `)
        .eq("restaurant_id", restaurant?.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      if (data && data.length > 0) {
        const avgRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setStats({ avgRating, totalReviews: data.length });
      } else {
        setStats({ avgRating: 0, totalReviews: 0 });
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToReview = async (reviewId: string, response: string) => {
    try {
      const { error } = await supabase
        .from("customer_reviews")
        .update({ response, responded_at: new Date().toISOString() })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success("Response submitted successfully");
      fetchReviews();
    } catch (error) {
      console.error("Error responding to review:", error);
      toast.error("Failed to submit response");
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Description */}
      <div>
        <p className="text-muted-foreground mb-2">
          Track your customer ratings and respond to their feedback.
        </p>
        <p className="text-sm text-muted-foreground">
          Respond to customer feedback within 7 days of receiving it to show your appreciation, and encourage them to come back.
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-4 items-center">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7 days</SelectItem>
            <SelectItem value="last-30-days">Last 30 days</SelectItem>
            <SelectItem value="last-3-months">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">Loading reviews...</div>
              </CardContent>
            </Card>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Star className="w-12 h-12 text-muted-foreground" />
                </div>
                <p className="text-center text-muted-foreground">
                  You didn't receive any ratings for the selected timeframe.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${star <= review.rating ? 'fill-primary text-primary' : 'text-muted'}`} 
                            />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Order #{review.orders?.order_number} • {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-sm mb-3">{review.comment}</p>
                    )}

                    {review.food_quality && (
                      <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                        <span>Food Quality: {review.food_quality}/5</span>
                        {review.delivery_speed && <span>Delivery: {review.delivery_speed}/5</span>}
                        {review.order_accuracy && <span>Accuracy: {review.order_accuracy}/5</span>}
                      </div>
                    )}

                    {review.response ? (
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Your Response:</p>
                        <p className="text-sm">{review.response}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Responded {new Date(review.responded_at).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Textarea 
                          placeholder="Respond to this review..." 
                          id={`response-${review.id}`}
                          className="mb-2"
                        />
                        <Button 
                          size="sm"
                          onClick={() => {
                            const textarea = document.getElementById(`response-${review.id}`) as HTMLTextAreaElement;
                            if (textarea?.value) {
                              handleRespondToReview(review.id, textarea.value);
                            }
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Respond
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tip Card */}
          {showTip && (
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => setShowTip(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="font-semibold mb-2">
                  Drive more sales by responding to customer reviews
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Restaurants responding to reviews typically see an increase in sales and orders.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Ratings Summary Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Ratings during this period</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Data for selected timeframe
              </p>
              
              <div className="space-y-4">
                {stats.totalReviews > 0 ? (
                  <>
                    <div>
                      <div className="text-4xl font-bold mb-1">{stats.avgRating.toFixed(1)}</div>
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${star <= Math.round(stats.avgRating) ? 'fill-primary text-primary' : 'text-muted'}`} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Average rating
                      </p>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">{stats.totalReviews}</span>
                        <span className="text-xs text-muted-foreground">ratings</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="text-4xl font-bold mb-1">NA</div>
                    <p className="text-xs text-muted-foreground">
                      Not available due to 0 ratings
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RatingsReviewsDashboard;
