import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AdminSettings from "@/pages/admin-settings";
import Intake from "@/pages/intake";
import Progress from "@/pages/progress";
import ComprehensiveProgress from "@/pages/comprehensive-progress";
import StatisticsOverview from "@/pages/statistics-overview";
import SettlementsInquiry from "@/pages/settlements-inquiry";
import SettlementAction from "@/pages/settlement-action";
import NotFound from "@/pages/not-found";
import { StatisticsLayout } from "@/components/statistics-layout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin-settings" component={AdminSettings} />
      <Route path="/intake" component={Intake} />
      <Route path="/progress" component={Progress} />
      <Route path="/comprehensive-progress" component={ComprehensiveProgress} />
      <Route path="/statistics">
        {() => (
          <StatisticsLayout>
            <StatisticsOverview />
          </StatisticsLayout>
        )}
      </Route>
      <Route path="/settlements">
        {() => (
          <StatisticsLayout>
            <SettlementsInquiry />
          </StatisticsLayout>
        )}
      </Route>
      <Route path="/statistics/settlement-action">
        {() => (
          <StatisticsLayout>
            <SettlementAction />
          </StatisticsLayout>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
