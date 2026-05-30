"use client";

import { useEffect, useState } from "react";
import Header from "./Header";
import ChefCallButton from "./ChefCallButton";
import ChefPopup from "./ChefPopup";
import Particles from "./Particles";
import IntroSplash from "./IntroSplash";
import Maintenance from "./Maintenance";
import { getSettings } from "@/lib/menu";

export default function AppShell({ children }: { children: React.ReactNode }) {
  // General-tab toggles: bubble effect on/off, and service (maintenance) mode.
  const [bubbles, setBubbles] = useState(true);
  const [serviceMode, setServiceMode] = useState(false);
  useEffect(() => {
    getSettings()
      .then((s) => {
        setBubbles(s.bubblesEnabled);
        setServiceMode(s.serviceMode);
      })
      .catch(() => {});
  }, []);

  // Service mode replaces the whole menu with the maintenance screen.
  if (serviceMode) return <Maintenance />;

  return (
    <>
      <IntroSplash />
      {bubbles && <Particles />}
      <div id="app">
        <div id="menu-page" className="page active">
          <Header />
          {children}
        </div>
        <ChefCallButton />
        <ChefPopup />
      </div>
    </>
  );
}
