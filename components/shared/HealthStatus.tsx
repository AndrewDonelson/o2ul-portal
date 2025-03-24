// file: /components/system/HealthStatus.tsx
// feature: System - Health status indicator for connection monitoring
/* 
// Default badge style - good for headers
<HealthStatus pingInterval={30000} showLatency={true} />

// Icon style - for status bars or subtle indicators
<HealthStatus variant="icon" pingInterval={60000} />

// Card style - for dashboards or settings pages
<HealthStatus variant="card" title="API Status" />

// Graph style - for monitoring pages
<HealthStatus variant="graph" pingInterval={5000} />

// Without border (for nested usage)
<HealthStatus variant="graph" showBorder={false} />

// Content alignment
<HealthStatus variant="card" contentAlign="right" />
*/
'use client';

import { useHealthCheck } from '@/hooks/useHealthCheck';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, Wifi, WifiOff, BarChart, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface HealthStatusProps {
  pingInterval?: number;
  showLatency?: boolean;
  variant?: 'badge' | 'icon' | 'card' | 'graph';
  className?: string;
  title?: string;
  showBorder?: boolean;
  contentAlign?: 'left' | 'center' | 'right';
}

export function HealthStatus({
  pingInterval = 60000,
  showLatency = true,
  variant = 'badge',
  className = '',
  title = 'System Health',
  showBorder = true,
  contentAlign = 'left'
}: HealthStatusProps) {
  const { health, globalHealth, sendPing } = useHealthCheck(pingInterval);
  const [visible, setVisible] = useState(true);
  const [historyData, setHistoryData] = useState<{time: number, latency: number}[]>([]);
  
  // Helper functions for formatting and styling
  const formatLatency = (latency: number | null) => {
    if (latency === null) return 'N/A';
    return `${latency}ms`;
  };

  const getStatusColor = (status: string, latency: number | null): "default" | "destructive" | "secondary" | "outline" => {
    if (status === 'down') return 'destructive';
    if (status === 'unknown') return 'secondary';
    
    if (latency === null) return 'secondary';
    if (latency < 100) return 'default';
    if (latency < 300) return 'outline';
    return 'destructive';
  };
  
  const getLatencyColorClass = (latency: number | null) => {
    if (latency === null) return "text-muted-foreground";
    if (latency < 100) return "text-green-500";
    if (latency < 200) return "text-green-400";
    if (latency < 300) return "text-blue-500";
    if (latency < 400) return "text-yellow-500";
    if (latency < 500) return "text-orange-400";
    return "text-red-500";
  };

  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((Date.now() - health.lastUpdated) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  // Determine alignment class based on contentAlign prop
  const getAlignmentClass = () => {
    switch (contentAlign) {
      case 'center': return 'text-center items-center';
      case 'right': return 'text-right items-end';
      default: return 'text-left items-start';
    }
  };

  // Maintain history for graph
  useEffect(() => {
    if (health.latency !== null && health.timestamp !== null) {
      setHistoryData(prev => {
        const newData = [...prev, { time: health.timestamp as number, latency: health.latency as number }];
        return newData.slice(-20);
      });
    }
  }, [health.latency, health.timestamp]);

  // Check for stale data
  useEffect(() => {
    const checkStatusAge = () => {
      const timeSinceUpdate = Date.now() - health.lastUpdated;
      setVisible(timeSinceUpdate < pingInterval * 2);
    };
    
    const interval = setInterval(checkStatusAge, 1000);
    return () => clearInterval(interval);
  }, [health.lastUpdated, pingInterval]);

  // Generic health info for tooltips and popovers
  const HealthInfo = () => (
    <>
      <p>Status: {health.status.toUpperCase()}</p>
      <p>Latency: <span className={getLatencyColorClass(health.latency)}>{formatLatency(health.latency)}</span></p>
      <p>Your Connection: {health.status === 'up' ? 'Active' : 'Inactive'}</p>
      {globalHealth?.limited ? (
        <p className="text-xs text-yellow-500 mt-2">
          System health information is limited to reduce server load.
        </p>
      ) : (
        <>
          <p>Active Users: {globalHealth?.activeUsers || 0}</p>
          <p>Avg. Latency: {globalHealth?.averageLatency || 0}ms</p>
        </>
      )}
      <p className="text-xs text-muted-foreground mt-1">Last update: {getTimeSinceUpdate()}</p>
    </>
  );

  // Offline state
  if (!visible) {
    if (variant === 'card' || variant === 'graph') {
      return variant === 'card' 
        ? <HealthCard status="offline" />
        : <HealthGraph status="offline" />;
    }
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Badge variant="outline" className={className}>
            <WifiOff className="h-3 w-3 mr-1" />
            Offline
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <p>Connection may be offline. Last update: {getTimeSinceUpdate()}</p>
          <button 
            onClick={() => { sendPing(); }}
            className="text-xs text-primary underline mt-1"
          >
            Test Connection
          </button>
        </PopoverContent>
      </Popover>
    );
  }

  // Card variant
  if (variant === 'card') {
    return <HealthCard status={health.status} />;
  }

  // Graph variant
  if (variant === 'graph') {
    return <HealthGraph status={health.status} />;
  }

  // Icon-only variant
  if (variant === 'icon') {
    const status = health.status;
    const latency = health.latency;
    let colorClass = getLatencyColorClass(latency);
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <span className={className}>
            {status === 'up' ? (
              <Wifi className={`h-4 w-4 ${colorClass}`} />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-1">
            <HealthInfo />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Default badge variant
  const statusColor = getStatusColor(health.status, health.latency);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge variant={statusColor} className={className}>
          <Activity className="h-3 w-3 mr-1" />
          {health.status === 'up' ? 'Online' : health.status === 'down' ? 'Error' : 'Checking...'}
          {showLatency && health.latency !== null && `: ${formatLatency(health.latency)}`}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-1">
          <HealthInfo />
        </div>
      </PopoverContent>
    </Popover>
  );

  // Card variant implementation
  function HealthCard({ status }: { status: string }) {
    const isOffline = status === 'offline';
    const latency = health.latency;
    const latencyColor = getLatencyColorClass(latency);
    const trendIcon = latency && latency < 300 
      ? <ArrowDownRight className="h-4 w-4 text-green-500" /> 
      : <ArrowUpRight className="h-4 w-4 text-yellow-500" />;
    
    const alignClass = getAlignmentClass();
    
    return (
      <Card className={cn(
        className,
        'w-full',
        !showBorder && 'border-0 shadow-none bg-transparent'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${contentAlign === 'center' ? 'justify-center' : contentAlign === 'right' ? 'justify-end' : ''}`}>
            {isOffline ? (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span>System Offline</span>
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                <span>{title}</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isOffline ? (
            <div className={`space-y-2 ${alignClass}`}>
              <p className="text-sm text-muted-foreground">
                Connection lost. Last update: {getTimeSinceUpdate()}
              </p>
              <button 
                onClick={() => sendPing()}
                className="text-xs text-primary underline"
              >
                Test Connection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`font-medium ${status === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Latency</span>
                <div className="flex items-center gap-1">
                  {trendIcon}
                  <span className={`font-medium ${latencyColor}`}>
                    {formatLatency(latency)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <span className="font-medium">{globalHealth?.activeUsers || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Updated</span>
                <span className="text-xs">{getTimeSinceUpdate()}</span>
              </div>
              
              <div className={contentAlign === 'center' ? 'text-center' : contentAlign === 'right' ? 'text-right' : ''}>
                <button 
                  onClick={() => sendPing()}
                  className="text-xs text-primary underline"
                >
                  Refresh Now
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Graph variant implementation
  function HealthGraph({ status }: { status: string }) {
    const renderHistoryGraph = () => {
      if (historyData.length < 2) return null;
      
      const maxLatency = Math.max(...historyData.map(d => d.latency), 100);
      const maxBarHeight = 50;
      
      return (
        <div className="pt-2 h-16">
          <div className="relative h-full w-full flex items-end justify-between gap-1">
            {historyData.map((dataPoint, i) => {
              const height = Math.max(4, (dataPoint.latency / maxLatency) * maxBarHeight);
              const color = getLatencyColorClass(dataPoint.latency);
              
              return (
                <div 
                  key={i} 
                  className={`w-2 ${color} rounded-t`}
                  style={{ height: `${height}px` }}
                  title={`${dataPoint.latency}ms`}
                />
              );
            })}
          </div>
        </div>
      );
    };
    
    const isOffline = status === 'offline';
    const alignClass = getAlignmentClass();
    
    return (
      <Card className={cn(
        className,
        'w-full',
        !showBorder && 'border-0 shadow-none bg-transparent'
      )}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${contentAlign === 'center' ? 'justify-center' : contentAlign === 'right' ? 'justify-end' : ''}`}>
            {isOffline ? (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span>System Offline</span>
              </>
            ) : (
              <>
                <BarChart className="h-4 w-4" />
                <span>Latency Monitor</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isOffline ? (
            <div className={`space-y-2 ${alignClass}`}>
              <p className="text-sm text-muted-foreground">
                Connection lost. Last update: {getTimeSinceUpdate()}
              </p>
              <button 
                onClick={() => sendPing()}
                className="text-xs text-primary underline"
              >
                Test Connection
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className={`font-medium ${getLatencyColorClass(health.latency)}`}>
                  {formatLatency(health.latency)}
                </span>
              </div>
              
              {renderHistoryGraph()}
              
              <div className="flex items-center justify-between text-xs pt-1">
                <span>Min: {historyData.length ? formatLatency(Math.min(...historyData.map(d => d.latency))) : 'N/A'}</span>
                <span>Avg: {historyData.length ? formatLatency(Math.round(historyData.reduce((sum, d) => sum + d.latency, 0) / historyData.length)) : 'N/A'}</span>
                <span>Max: {historyData.length ? formatLatency(Math.max(...historyData.map(d => d.latency))) : 'N/A'}</span>
              </div>
              
              <div className="flex justify-between pt-1">
                <span className="text-xs text-muted-foreground">{getTimeSinceUpdate()}</span>
                <button 
                  onClick={() => sendPing()}
                  className="text-xs text-primary underline"
                >
                  Refresh Now
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}