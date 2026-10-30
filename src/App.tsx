import { MotionConfig } from "motion/react";
import { StoreProvider } from "./lib/store";
import { useRoute } from "./lib/router";
import Shell from "./components/Shell";
import Toaster from "./components/Toaster";
import Overview from "./pages/Overview";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

const PAGES = { overview: Overview, orders: Orders, products: Products, customers: Customers, analytics: Analytics, settings: Settings };

export default function App() {
  const route = useRoute();
  const Page = PAGES[route];
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <Shell route={route}>
          <Page key={route} />
          <p className="mx-auto mt-10 max-w-7xl text-center text-xs text-muted">Senja Coffee is a fictional business. All data is generated in your browser. Built by Dinul Iman.</p>
        </Shell>
        <Toaster />
      </StoreProvider>
    </MotionConfig>
  );
}
