"use client"
import React from "react";
import PAOChatInterface from "@/components/chat/Primary";
import { mockPAOs } from "@/components/chat/Mock";

const Page: React.FC = () => {
  return <PAOChatInterface initialPAO={null} allPAOs={mockPAOs} />;
};

export default Page;