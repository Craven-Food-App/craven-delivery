import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionsDashboard from "./financials/TransactionsDashboard";
import PayoutsDashboard from "./financials/PayoutsDashboard";
import StatementsDashboard from "./financials/StatementsDashboard";

const FinancialsDashboard = () => {
  return (
    <div className="w-full h-full bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold mb-4">Financials</h1>
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="bg-muted">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              <TabsTrigger value="statements">Statements</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <TransactionsDashboard />
            </TabsContent>

            <TabsContent value="payouts" className="mt-6">
              <PayoutsDashboard />
            </TabsContent>

            <TabsContent value="statements" className="mt-6">
              <StatementsDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default FinancialsDashboard;