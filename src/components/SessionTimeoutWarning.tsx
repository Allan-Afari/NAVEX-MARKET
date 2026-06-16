import { useState } from "react";
import { AlertCircle, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutWarning = ({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutWarningProps) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Your session will expire in {minutes}:{seconds.toString().padStart(2, "0")}. Stay active to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-3">
          <AlertDialogCancel onClick={onExtend} className="flex-1">
            Stay Logged In
          </AlertDialogCancel>
          <AlertDialogAction onClick={onLogout} className="flex-1 gap-2 bg-destructive hover:bg-destructive/90">
            <LogOut className="w-4 h-4" />
            Logout
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionTimeoutWarning;
