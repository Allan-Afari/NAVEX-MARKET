import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Check, FileText, MessageSquare, Lock, Users, DollarSign } from "lucide-react";

interface WalkthroughStep {
  target: string;
  title: string;
  description: string;
  icon: any;
  action?: () => void;
}

const DEAL_ROOM_STEPS: WalkthroughStep[] = [
  {
    target: "deal-room-header",
    title: "Deal Room Overview",
    description: "This is your secure collaboration space. Here you can manage all aspects of your deal.",
    icon: FileText,
  },
  {
    target: "deal-room-participants",
    title: "Manage Participants",
    description: "Add or remove participants from your deal room. Only invited users can access this space.",
    icon: Users,
  },
  {
    target: "deal-room-documents",
    title: "Document Management",
    description: "Upload, share, and track access to important documents. All files are encrypted.",
    icon: FileText,
  },
  {
    target: "deal-room-chat",
    title: "Real-time Chat",
    description: "Communicate with all participants in real-time. Messages are securely stored.",
    icon: MessageSquare,
  },
  {
    target: "deal-room-negotiations",
    title: "Negotiation Tracker",
    description: "Track offers, counter-offers, and agreement terms in one place.",
    icon: DollarSign,
  },
  {
    target: "deal-room-agreements",
    title: "Agreements",
    description: "Create, sign, and manage legally binding agreements with e-signature support.",
    icon: Lock,
  },
];

interface DealRoomWalkthroughProps {
  onComplete: () => void;
}

export const DealRoomWalkthrough = ({ onComplete }: DealRoomWalkthroughProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const hasSeenWalkthrough = localStorage.getItem("hasSeenDealRoomWalkthrough");
    if (hasSeenWalkthrough) {
      setShow(false);
      onComplete();
    }
  }, [onComplete]);

  const handleComplete = () => {
    localStorage.setItem("hasSeenDealRoomWalkthrough", "true");
    setShow(false);
    onComplete();
  };

  const handleNext = () => {
    const step = DEAL_ROOM_STEPS[currentStep];
    if (step.action) {
      step.action();
    }
    if (currentStep < DEAL_ROOM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  if (!show) return null;

  const step = DEAL_ROOM_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <h4 className="font-semibold">{step.title}</h4>
          </div>
          <Button variant="ghost" size="sm" onClick={handleComplete}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {DEAL_ROOM_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {currentStep < DEAL_ROOM_STEPS.length - 1 ? (
              <Button size="sm" onClick={handleNext}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleComplete}>
                <Check className="w-4 h-4 mr-1" /> Got it
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealRoomWalkthrough;
