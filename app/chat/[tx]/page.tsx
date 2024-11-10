"use client"
import React from "react";
import { useParams } from "next/navigation";
import PAOChatInterface from "@/components/chat/Primary";
import { mockPAOs } from "@/components/chat/Mock";

const ChatDetailPage: React.FC = () => {
  const params = useParams();
  const initialPAO = typeof params.tx === 'string' 
    ? mockPAOs.find(pao => pao.id === params.tx) || null 
    : null;

  return <PAOChatInterface initialPAO={initialPAO} allPAOs={mockPAOs} />;
};

export default ChatDetailPage;