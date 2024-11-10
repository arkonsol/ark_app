import React from "react";
import AppWalletProvider from "@/components/AppWalletProvider";
import AuthFlow from "@/components/auth/AuthWrapper";

const NewLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <main className="h-full">
        <AppWalletProvider>
          <AuthFlow>
            {children}
          </AuthFlow>
        </AppWalletProvider>
      </main>
    </div>
  );
};

export default NewLayout;