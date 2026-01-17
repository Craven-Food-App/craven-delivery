// Utility functions to generate random but realistic restaurant data

export const generateSalesData = () => {
  const dates = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 === 0 ? 12 : i % 12;
    const period = i < 12 ? 'AM' : 'PM';
    return `${hour} ${period}`;
  });

  return {
    overview: {
      grossSales: Math.floor(Math.random() * 15000) + 5000,
      grossSalesChange: Math.floor(Math.random() * 40) - 10,
      totalOrders: Math.floor(Math.random() * 300) + 100,
      totalOrdersChange: Math.floor(Math.random() * 30) - 5,
      avgTicket: Math.random() * 30 + 25,
      avgTicketChange: Math.floor(Math.random() * 20) - 5,
    },
    timeSeriesData: dates.map((date) => ({
      date,
      current: Math.floor(Math.random() * 3000) + 1000,
      previous: Math.floor(Math.random() * 2500) + 800,
      currentOrders: Math.floor(Math.random() * 50) + 20,
      previousOrders: Math.floor(Math.random() * 45) + 15,
      currentTicket: Math.random() * 10 + 45,
      previousTicket: Math.random() * 10 + 40,
    })),
    dayOfWeekData: dates.map((day) => ({
      day,
      current: Math.floor(Math.random() * 4000) + 1500,
      previous: Math.floor(Math.random() * 3500) + 1200,
    })),
    hourOfDayData: hours.map((hour, index) => {
      // Peak hours logic (11 AM - 2 PM and 5 PM - 8 PM)
      const isPeak = (index >= 11 && index <= 14) || (index >= 17 && index <= 20);
      const sales = isPeak 
        ? Math.floor(Math.random() * 800) + 400
        : Math.floor(Math.random() * 300) + 50;
      return { hour, sales };
    }),
  };
};

export interface ProductMixItem {
  id: string;
  name: string;
  totalSold: number;
  totalSoldChange: number;
  grossSales: number;
  grossSalesChange: number;
  netPrice: number;
  priceChanges: number;
  customerDiscounts: number;
}

export const generateProductMixData = (): ProductMixItem[] => {
  const menuItems = [
    "Classic Burger",
    "Chicken Wings",
    "Caesar Salad",
    "Margherita Pizza",
    "Beef Tacos",
    "Pad Thai",
    "Sushi Roll Combo",
    "BBQ Ribs",
    "Veggie Wrap",
    "Fish & Chips",
    "Chicken Tikka Masala",
    "Pepperoni Pizza",
    "Grilled Salmon",
    "Pasta Carbonara",
    "Steak Frites"
  ];

  return menuItems.map((name, index) => ({
    id: `item-${index + 1}`,
    name,
    totalSold: Math.floor(Math.random() * 200) + 50,
    totalSoldChange: Math.floor(Math.random() * 60) - 20,
    grossSales: Math.random() * 3000 + 500,
    grossSalesChange: Math.floor(Math.random() * 50) - 15,
    netPrice: Math.random() * 25 + 10,
    priceChanges: Math.floor(Math.random() * 5),
    customerDiscounts: Math.random() * 100,
  }));
};

export const generateQualityMetrics = () => {
  return {
    ratings: {
      score: (Math.random() * 0.5 + 4.5).toFixed(1),
      lowRatingsCount: Math.floor(Math.random() * 5),
    },
    waitTime: {
      average: Math.floor(Math.random() * 20) + 10,
      target: 15,
    },
    orders: {
      lateOrders: Math.floor(Math.random() * 3),
      totalOrders: Math.floor(Math.random() * 500) + 200,
    },
    cancellations: {
      rate: (Math.random() * 3).toFixed(1),
      avoidable: Math.floor(Math.random() * 5),
    },
    accuracy: {
      rate: (95 + Math.random() * 5).toFixed(1),
      issues: Math.floor(Math.random() * 10),
    },
    downtime: {
      hours: Math.floor(Math.random() * 2),
      deactivations: Math.floor(Math.random() * 3),
    },
  };
};

export const generateMostLovedData = () => {
  return {
    eligibility: {
      isEligible: Math.random() > 0.5,
      reason: "You didn't meet the minimum order requirements in the last 3 months.",
    },
    metrics: {
      extremeSatisfaction: Math.floor(Math.random() * 100),
      customerExperience: Math.floor(Math.random() * 100),
      strongRatings: Math.floor(Math.random() * 100),
    },
    requirements: {
      completedDeliveries: Math.floor(Math.random() * 50),
      fiveStarRatings: Math.floor(Math.random() * 200),
    },
  };
};
