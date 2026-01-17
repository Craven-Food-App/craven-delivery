import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const CategorySection = () => {
  const [showComingSoon, setShowComingSoon] = useState<string | null>(null);

  const handleCategoryClick = (categoryName: string, isComingSoon: boolean = false) => {
    if (isComingSoon) {
      setShowComingSoon(categoryName);
      toast.info(`${categoryName} is coming soon!`, {
        description: "We're working hard to bring you this category. Stay tuned!",
        duration: 3000,
      });
    } else {
      // Handle functional categories (like Grocery)
      toast.success(`Browsing ${categoryName}`, {
        description: "Loading available options...",
        duration: 2000,
      });
    }
  };

  const categories = [
    {
      name: "Fast Food",
      image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200&h=200&fit=crop",
      color: "from-red-500 to-orange-500",
      isComingSoon: false
    },
    {
      name: "Pizza",
      image: "https://placehold.co/200x200/FF6B35/ffffff?text=Pizza",
      color: "from-yellow-500 to-red-500",
      isComingSoon: false
    },
    {
      name: "Sushi",
      image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200&h=200&fit=crop",
      color: "from-green-500 to-teal-500",
      isComingSoon: false
    },
    {
      name: "Mexican",
      image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200&h=200&fit=crop",
      color: "from-orange-500 to-red-500",
      isComingSoon: false
    },
    {
      name: "Healthy",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop",
      color: "from-green-400 to-green-600",
      isComingSoon: false
    },
    {
      name: "Desserts",
      image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=200&h=200&fit=crop",
      color: "from-pink-500 to-purple-500",
      isComingSoon: false
    },
    {
      name: "Chinese",
      image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=200&h=200&fit=crop",
      color: "from-yellow-600 to-orange-600",
      isComingSoon: false
    },
    {
      name: "Indian",
      image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&h=200&fit=crop",
      color: "from-orange-600 to-red-600",
      isComingSoon: false
    },
    {
      name: "Grocery",
      image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop",
      color: "from-green-600 to-emerald-600",
      isComingSoon: false
    },
    {
      name: "Quick Stops",
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop",
      color: "from-blue-500 to-indigo-600",
      isComingSoon: true
    },
    {
      name: "CraveStop",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200&h=200&fit=crop",
      color: "from-purple-500 to-pink-600",
      isComingSoon: true
    },
    {
      name: "Cosmetics",
      image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop",
      color: "from-pink-400 to-rose-500",
      isComingSoon: true
    },
    {
      name: "Animals",
      image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=200&h=200&fit=crop",
      color: "from-amber-500 to-orange-500",
      isComingSoon: true
    },
    {
      name: "Self Care",
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=200&h=200&fit=crop",
      color: "from-teal-500 to-cyan-600",
      isComingSoon: true
    }
  ];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            What are you craving?
          </h2>
          <p className="text-muted-foreground text-lg">
            Browse by your favorite cuisine type
          </p>
        </div>

        <div className="overflow-x-auto scrollbar-hide pb-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 min-w-max">
            {categories.map((category, index) => (
              <div 
                key={category.name} 
                className="group cursor-pointer animate-fade-in min-w-[80px] flex-shrink-0"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleCategoryClick(category.name, category.isComingSoon)}
              >
                <div className={`relative overflow-hidden rounded-lg aspect-square mb-2 shadow-card hover:shadow-hover transition-all duration-300 transform hover:scale-105 ${
                  category.isComingSoon ? 'opacity-75' : ''
                }`}>
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-60 group-hover:opacity-40 transition-opacity`}></div>
                  
                  {/* Coming Soon Badge */}
                  {category.isComingSoon && (
                    <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                      Soon
                    </div>
                  )}
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-semibold text-xs sm:text-sm text-center px-2">
                      {category.name}
                    </span>
                  </div>
                  
                  {/* Coming Soon Overlay */}
                  {category.isComingSoon && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="bg-white/90 text-gray-800 text-xs font-bold px-2 py-1 rounded-full">
                        Coming Soon
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            View All Cuisines
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CategorySection;