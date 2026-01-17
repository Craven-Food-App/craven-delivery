import React from "react";
import CtoEvaluationGatePanel from "@/components/cto/CtoEvaluationGatePanel";
import { Card } from "@/components/ui/card";
import { AlertTriangle, User, Crown } from "lucide-react";

/**
 * Admin-only test harness for the CTO Evaluation Gate workflow.
 * This lets you exercise the full flow without going through the Executive Portal.
 */
export const TestCtoEvaluation: React.FC = () => {
  return (
    <div className="space-y-4">
      <Card className="p-4 border border-yellow-400/60 bg-yellow-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">CTO Evaluation Gate (Test Harness)</p>
            <p className="text-sm text-yellow-700">
              This uses the live CTO evaluation tables with the <b>is_test</b> flag. Start an
              evaluation as CEO on the right, then complete gates as CTO on the left using the
              same test record.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-blue-600" />
            <p className="font-semibold text-sm text-blue-700">CTO View (Test)</p>
          </div>
          {/* CTO-mode + test flag: shows what the CTO would see when submitting gates */}
          <CtoEvaluationGatePanel mode="cto" test />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-red-600" />
            <p className="font-semibold text-sm text-red-700">CEO View (Test)</p>
          </div>
          {/* CEO-mode + test flag: initiate + score the same test evaluation */}
          <CtoEvaluationGatePanel mode="ceo" test />
        </Card>
      </div>
    </div>
  );
};


