// src/components/Accordion.tsx

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Accordion as ShadcnAccordion,
} from "@/components/ui/accordion";

import React from "react";

interface AccordionProps {
  items: {
    title: string;
    content: React.ReactNode;
  }[];
}

export const Accordion: React.FC<AccordionProps> = ({ items }) => (
  <ShadcnAccordion type="single" collapsible>
    {items.map((item, index) => (
      <AccordionItem key={index} value={`item-${index}`}>
        <AccordionTrigger>{item.title}</AccordionTrigger>
        <AccordionContent>{item.content}</AccordionContent>
      </AccordionItem>
    ))}
  </ShadcnAccordion>
);
