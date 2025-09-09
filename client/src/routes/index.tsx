import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import Login from "@/pages/Login";

// Lazy load heavy pages for better code splitting
const Home = lazy(() => import("@/pages/Home"));
const PurchaseContracts = lazy(() => import("@/pages/PurchaseContracts"));
const CreatePurchaseContract = lazy(() => import("@/pages/CreatePurchaseContract"));
const CreateSubContract = lazy(() => import("@/pages/CreateSubContract"));
const EditSubContract = lazy(() => import("@/pages/EditSubContract"));
const ViewSubContract = lazy(() => import("@/pages/ViewSubContract"));
const ViewContract = lazy(() => import("@/pages/ViewContract"));
const EditContract = lazy(() => import("@/pages/EditContract"));
const SaleContracts = lazy(() => import("@/pages/SaleContracts"));
const CreateSaleContract = lazy(() => import("@/pages/CreateSaleContract"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Import ContractDetail normally instead of lazy loading to fix module loading issue
import ContractDetail from "@/pages/ContractDetail";

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/home" component={Home} />
        <Route path="/purchase-contracts" component={PurchaseContracts} />
        <Route path="/purchase-contracts/create/:contractId?" component={CreatePurchaseContract} />
        <Route path="/purchase-contracts/:contractId/sub-contracts/create" component={CreateSubContract} />
        <Route path="/purchase-contracts/:contractId/sub-contracts/:subContractId/edit" component={EditSubContract} />
        <Route path="/purchase-contracts/:contractId/sub-contracts/:subContractId/view" component={ViewSubContract} />
        <Route path="/purchase-contracts/:contractId/view" component={ViewContract} />
        <Route path="/purchase-contracts/:contractId/edit" component={EditContract} />
        <Route path="/purchase-contracts/:id" component={ContractDetail} />
        <Route path="/sale-contracts" component={SaleContracts} />
        <Route path="/sale-contracts/create/:contractId?" component={CreateSaleContract} />
        <Route path="/sale-contracts/:contractId/sub-contracts/create" component={CreateSubContract} />
        <Route path="/sale-contracts/:contractId/sub-contracts/:subContractId/edit" component={EditSubContract} />
        <Route path="/sale-contracts/:contractId/sub-contracts/:subContractId/view" component={ViewSubContract} />
        <Route path="/sale-contracts/:contractId/view" component={ViewContract} />
        <Route path="/sale-contracts/:contractId/edit" component={EditContract} />
        <Route path="/sale-contracts/:id" component={ContractDetail} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}