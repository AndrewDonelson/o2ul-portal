// file: /hooks/useHealthCheck.ts
// feature: System - Health check hook for monitoring system status

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export interface HealthStatus {
  latency: number | null;
  timestamp: number | null;
  status: 'up' | 'down' | 'unknown';
  lastUpdated: number;
}

export interface GlobalHealthStatus {
  activeUsers: number;
  averageLatency: number;
  status: string;
  sampleSize?: number;
  limited?: boolean;
}

export function useHealthCheck(pingInterval = 60000) {
  const recordPing = useMutation(api.health.recordPing);
  const recordRTT = useMutation(api.health.recordRTT);
  const healthData = useQuery(api.health.getUserHealth);
  const globalHealth = useQuery(api.health.getGlobalHealth) as GlobalHealthStatus | undefined;
  
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    latency: null,
    timestamp: null,
    status: 'unknown',
    lastUpdated: Date.now()
  });

  // Function to send a ping and measure RTT
  const sendPing = async () => {
    try {
      const clientStartTime = Date.now();
      const region = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Step 1: Send ping to server
      const pingResult = await recordPing({ 
        clientTimestamp: clientStartTime,
        region 
      });
      
      if (!pingResult) {
        throw new Error("Ping failed");
      }
      
      // Step 2: Calculate RTT (when response comes back)
      const clientEndTime = Date.now();
      const rtt = clientEndTime - clientStartTime;
      
      // Step 3: Record the RTT measurement
      const result = await recordRTT({
        rtt,
        serverTimestamp: pingResult.serverTimestamp,
        region: pingResult.region
      });
      
      if (result) {
        setHealthStatus({
          latency: rtt, // This is the actual RTT, not server-calculated
          timestamp: result.timestamp,
          status: 'up',
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error('Health check ping failed:', error);
      setHealthStatus(prev => ({
        ...prev,
        status: 'down',
        lastUpdated: Date.now()
      }));
    }
  };

  // Update local state when server data changes
  useEffect(() => {
    if (healthData) {
      setHealthStatus({
        latency: healthData.latency,
        timestamp: healthData.timestamp,
        status: healthData.status,
        lastUpdated: Date.now()
      });
    }
  }, [healthData]);

  // Set up recurring ping interval
  useEffect(() => {
    // Send initial ping
    sendPing();
    
    // Set up interval
    const intervalId = setInterval(sendPing, pingInterval);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [pingInterval]);

  return {
    health: healthStatus,
    globalHealth,
    sendPing
  };
}