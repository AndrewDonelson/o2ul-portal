// file: /components/app/ComponentsPreview.tsx
"use client";
import React, { useState } from 'react';
import { AlertBanner } from "@/components/shared/AlertBanner";
import { ContentCard } from "@/components/shared/ContentCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusIndicator } from "@/components/shared/StatusIndicator";
import { Hero } from "@/components/shared/Hero";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Users, MessageSquare, Shield } from "lucide-react";
import { StatsCard } from "@/components/shared/StatsCard";
import CopyrightNotice from "@/components/shared/CopyrightNotice";
import { DashboardCharts } from "@/components/shared/DashboardCharts";
import TagLine from "@/components/shared/TagLine";
import { UserPlaque } from "@/components/shared/UserPlaque";
import { Id } from "@/convex/_generated/dataModel";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Sample data for DashboardCharts
const sampleMessageData = [
  { name: "Jan", total: 234 },
  { name: "Feb", total: 345 },
  { name: "Mar", total: 276 },
  { name: "Apr", total: 432 },
];

const sampleUserActivityData = [
  { name: "Mon", total: 42 },
  { name: "Tue", total: 53 },
  { name: "Wed", total: 36 },
  { name: "Thu", total: 45 },
];

// Create a mock userId for preview purposes
const MOCK_USER_ID = "abc123" as unknown as Id<"users">;

// UserPlaque Preview Component
function UserPlaquePreview() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  
  if (!isAuthenticated || !user) {
    return (
      <div className="text-muted-foreground text-sm">
        Please sign in to preview the UserPlaque component
      </div>
    );
  }

  return (
    <div className="w-64">
      <UserPlaque
        userId={user.userId}
        username={user.username}
        role={user.role}
        size="md"
        showStatus={true}
        showRole={true}
      />
    </div>
  );
}

const previewComponents = [
  {
    type: 'AlertBanner' as const,
    name: 'Alert Banner',
    render: () => (
      <AlertBanner
        title="Alert Title"
        message="This is an alert message"
        type="info"
        align="center"
        position="top"
        dismissible={true}
      />
    ),
    props: {
      title: 'Alert Title',
      message: 'This is an alert message',
      type: 'info',
      align: 'center',
      position: 'top',
      dismissible: true,
    }
  },
  {
    type: 'ContentCard' as const,
    name: 'Content Card',
    render: () => (
      <ContentCard
        cardTitle="Card Title"
        footerText="Footer text"
        align="center"
        variant="default"
      >
        Card content goes here
      </ContentCard>
    ),
    props: {
      cardTitle: 'Card Title',
      footerText: 'Footer text',
      align: 'center',
      variant: 'default',
      children: 'Card content goes here',
    }
  },
  {
    type: 'LoadingSpinner' as const,
    name: 'Loading Spinner',
    render: () => (
      <LoadingSpinner
        size="md"
        fullScreen={false}
        label="Loading..."
      />
    ),
    props: {
      size: 'md',
      fullScreen: false,
      label: 'Loading...',
    }
  },
  {
    type: 'StatusIndicator' as const,
    name: 'Status Indicator',
    render: () => (
      <StatusIndicator
        status="online"
        size="md"
        align="center"
        showLabel={true}
        pulseAnimation={true}
      />
    ),
    props: {
      status: 'online',
      size: 'md',
      align: 'center',
      showLabel: true,
      pulseAnimation: true,
    }
  },
  {
    type: 'Hero' as const,
    name: 'Hero',
    render: () => (
      <Hero
        primaryText="Hero Title"
        message="Hero message goes here"
        actionButtonText="Action"
        actionButtonUrl="#"
        align="center"
        animate={true}
        variant="default"
      />
    ),
    props: {
      primaryText: 'Hero Title',
      message: 'Hero message goes here',
      actionButtonText: 'Action',
      actionButtonUrl: '#',
      align: 'center',
      animate: true,
      variant: 'default',
    }
  },
  {
    type: 'StatsCard' as const,
    name: 'Stats Card',
    render: () => (
      <StatsCard
        title="Total Users"
        value="1,234"
        icon={Users}
        description="Active users this month"
      />
    ),
    props: {
      title: 'Total Users',
      value: '1,234',
      icon: 'Users (Lucide Icon)',
      description: 'Active users this month',
    }
  },
  {
    type: 'CopyrightNotice' as const,
    name: 'Copyright Notice',
    render: () => (
      <CopyrightNotice align="center" />
    ),
    props: {
      align: 'center',
    }
  },
  {
    type: 'DashboardCharts' as const,
    name: 'Dashboard Charts',
    render: () => (
      <DashboardCharts
        messageData={sampleMessageData}
        userActivityData={sampleUserActivityData}
      />
    ),
    props: {
      messageData: 'Array of message activity data',
      userActivityData: 'Array of user activity data',
    }
  },
  {
    type: 'PageHeader' as const,
    name: 'Page Header',
    render: () => (
      <PageHeader
        title="Example Page"
        description="This is a sample page header with description"
        align="left"
      />
    ),
    props: {
      title: 'Example Page',
      description: 'This is a sample page header with description',
      align: 'left',
    }
  },
  {
    type: 'TagLine' as const,
    name: 'Tag Line',
    render: () => (
      <TagLine />
    ),
    props: {
      className: 'optional className for styling',
    }
  },
  {
    type: 'UserPlaque' as const,
    name: 'User Plaque',
    render: () => <UserPlaquePreview />,
    props: {
      userId: 'Convex User ID (automatically set from authenticated user)',
      username: 'Current user\'s username',
      role: 'User\'s role',
      size: 'md',
      showStatus: true,
      showRole: true,
      className: 'optional className for styling',
    }
  }
] as const;

export type ComponentType = typeof previewComponents[number]['type'];

export default function ComponentPreview() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'preview' | 'props'>('preview');
  
  const currentComponent = previewComponents[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : previewComponents.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < previewComponents.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Component Preview"
        description="Explore and customize shared components"
        className="mb-8"
      />

      <div className="grid gap-8">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handlePrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <h2 className="text-2xl font-bold">{currentComponent.name}</h2>
          <Button variant="outline" onClick={handleNext}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'preview' | 'props')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="props">Properties</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="min-h-[400px] flex items-center justify-center border rounded-lg p-4">
                  {currentComponent.render()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="props" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {Object.entries(currentComponent.props).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 items-center">
                      <label className="font-medium">{key}:</label>
                      <div className="font-mono text-sm">{JSON.stringify(value)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}