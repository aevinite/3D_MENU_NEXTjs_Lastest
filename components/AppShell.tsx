"use client";

import Header from "./Header";
import ChefCallButton from "./ChefCallButton";
import ChefPopup from "./ChefPopup";
import CartPanel from "./CartPanel";
import ToastHost from "./ToastHost";
import Particles from "./Particles";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Particles />
      <div id="app">
        <div id="menu-page" className="page active">
          <Header />
          {children}
        </div>
        <ChefCallButton />
        <ChefPopup />
        <CartPanel />
        <ToastHost />
      </div>
    </>
  );
}
