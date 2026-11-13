import React from "react";
import Screen from "../components/Screen";
import { Badge, TopBar } from "../components/Shared";
import { useOffline } from "../offline/OfflineContext";
import { AlertsPanel, LimitsPanel, PositionPanel, SosOutboxPanel, TripKitPanel } from "../components/offline/OfflinePanels";

export default function OfflineCenter() {
  const { online, swReady, battery, lowPower } = useOffline();
  return (
    <Screen id="offline">
      <TopBar title="Offline safety center" right={<Badge tone={online ? "green" : "orange"}><span data-testid="network-state">{online ? "LINK AVAILABLE" : "OFFLINE"}</span></Badge>} />
      <div className="offline-page">
        <div className="offline-hero">
          <div>
            <span className="eyebrow-sm">ORCA OFFLINE-FIRST MODE</span>
            <h1>Know what remains trusted when the signal disappears.</h1>
            <p>Maps, harbors, boundaries and the forecast live on this phone. GPS works without internet. A phone alone cannot guarantee an SOS is delivered.</p>
          </div>
          <div className="offline-hero-badge" data-testid="device-readiness">
            <span className="offline-pulse" />{online ? "CONNECTED" : "AIRPLANE / NO LINK"}
            <small>App available offline: {swReady ? "yes" : "installing…"}</small>
            <small>Battery: {battery ? `${Math.round(battery.level * 100)}%${battery.charging ? " · charging" : ""}${lowPower ? " · low-power GPS" : ""}` : "not reported by this browser"}</small>
          </div>
        </div>
        <div className="offline-grid">
          <TripKitPanel />
          <PositionPanel />
          <LimitsPanel />
          <AlertsPanel />
          <SosOutboxPanel />
        </div>
      </div>
    </Screen>
  );
}
