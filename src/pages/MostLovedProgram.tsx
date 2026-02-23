import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Search, Award, CheckCircle2, ShoppingBag, TrendingDown, AlertCircle, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MostLovedProgram = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <Heart className="w-10 h-10 text-red-600 fill-red-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-4">
                Become <span className="text-red-600">Most Loved</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Rewarding the top-ranked stores that deliver exceptional customer experiences.
              </p>
            </div>
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              Check your eligibility
            </Button>
          </div>

          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg h-80 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-48 h-48 bg-white rounded-lg shadow-lg mx-auto flex items-center justify-center">
                <div className="text-6xl">👨‍🍳</div>
              </div>
              <p className="text-sm text-muted-foreground">Restaurant Excellence</p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-center mb-4">The benefits of being Most Loved</h2>
            <p className="text-center text-muted-foreground mb-8">
              Most Loved merchants are top-ranked for more customer priority, recognition, and more account perks.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Better Visibility */}
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center">
                  <Search className="w-12 h-12 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">BETTER VISIBILITY</h3>
                  <p className="text-sm text-muted-foreground">
                    Most Loved restaurants on Crave'n are prioritized in search and customers see more products.
                  </p>
                </div>
              </div>

              {/* Recognition */}
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center">
                  <Award className="w-12 h-12 text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">RECOGNITION</h3>
                  <p className="text-sm text-muted-foreground">
                    A Most Loved badge and logo shows on your store/page, showcasing your high-level
                  </p>
                </div>
              </div>

              {/* Operational Excellence */}
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">OPERATIONAL EXCELLENCE</h3>
                  <p className="text-sm text-muted-foreground">
                    Our sales and refunds are higher in Most Loved stores.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How to Become Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg h-80 flex items-center justify-center">
            <div className="text-6xl">🥗</div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold">How to become a Most Loved merchant</h2>
            <p className="text-muted-foreground">
              You need to maintain excellent quality and service to be considered a Most Loved restaurant.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">25+ lifetime orders</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">4.7+ average store rating</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">Minimized flags & founder charges to solve stage</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">Strictly following orders in time ensuring</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">Meet monthly performance goals</p>
              </div>
            </div>

            <Button className="bg-red-600 hover:bg-red-700 text-white">
              Check your eligibility
            </Button>
          </div>
        </div>

        {/* Monthly Performance Goals */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Monthly Performance Goals</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Cancellation Rate */}
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">LESS THAN 1% AVOIDABLE CANCELLATION RATE</h3>
                  <p className="text-sm text-muted-foreground">
                    Maintain low cancellation of confirmed orders to keep customers happy and satisfied.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                  Learn more
                </Button>
              </CardContent>
            </Card>

            {/* Incorrect Orders */}
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">LESS THAN 2% MISSING/OR INCORRECT RATE</h3>
                  <p className="text-sm text-muted-foreground">
                    Maintain low rates of missing or incorrect items to ensure order accuracy
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                  Learn more
                </Button>
              </CardContent>
            </Card>

            {/* Customer Rating */}
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                  <Star className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">4.7+ AVERAGE MONTHLY CUSTOMER RATING</h3>
                  <p className="text-sm text-muted-foreground">
                    The average of your store's customer ratings from orders in the last month
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                  Learn more
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Testimonial Section */}
        <div className="bg-gradient-to-r from-red-900 to-red-800 rounded-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="p-8 md:p-12 text-white space-y-6">
              <blockquote className="text-2xl font-bold leading-relaxed">
                "My sales are up about 25 to 30% since being awarded Most Loved. When all the hard work pays off, that's what it's all about."
              </blockquote>
              <div>
                <p className="font-semibold">SHAZIA MIRZA</p>
                <p className="text-sm opacity-90">OWNER, MEDITERRANEAN GRILL</p>
              </div>
              <Button variant="secondary" className="bg-white text-red-900 hover:bg-gray-100">
                Read her story
              </Button>
            </div>

            <div className="h-96 bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
              <div className="text-8xl">🍲</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MostLovedProgram;
