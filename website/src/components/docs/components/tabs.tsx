// src/components/Tabs.tsx

import {
  Tabs as ShadcnTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import React from "react";

interface TabsProps {
  tabs: {
    title: string;
    content: React.ReactNode;
  }[];
}

export const Tabs: React.FC<TabsProps> = ({ tabs }) => (
  <ShadcnTabs defaultValue="tab-0">
    <TabsList>
      {tabs.map((tab, index) => (
        <TabsTrigger key={index} value={`tab-${index}`}>
          {tab.title}
        </TabsTrigger>
      ))}
    </TabsList>
    {tabs.map((tab, index) => (
      <TabsContent key={index} value={`tab-${index}`}>
        {tab.content}
      </TabsContent>
    ))}
  </ShadcnTabs>
);
