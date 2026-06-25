import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Check } from "lucide-react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  action?: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "dashboard-stats",
    title: "Your Stats",
    description: "Track your opportunities, unlocks, and trust score here",
  },
  {
    target: "marketplace-btn",
    title: "Browse Opportunities",
    description: "Find investment opportunities or post your own",
  },
  {
    target: "deal-rooms",
    title: "Deal Rooms",
    description: "Collaborate with investors in secure deal rooms",
  },
  {
    target: "messages",
    title: "Messages",
    description: "Communicate with your contacts and deal partners",
  },
];

interface WelcomeTourProps {
  onComplete: () => void;
}

export const WelcomeTour = ({ onComplete }: WelcomeTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(true);

  // Highlight current target element
  useEffect(() => {
    const target = document.getElementById(TOUR_STEPS[currentStep].target);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-primary", "ring-offset-2");
      return () => {
        target.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      };
    }
  }, [currentStep]);

  const handleNext = () => {
    const step = TOUR_STEPS[currentStep];
    if (step.action) {
      step.action();
    }
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem("hasSeenTour", "true");
    setShow(false);
    onComplete();
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold">{TOUR_STEPS[currentStep].title}</h4>
          <Button variant="ghost" size="sm" onClick={handleComplete}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {TOUR_STEPS[currentStep].description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
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
              Back
            </Button>
            {currentStep < TOUR_STEPS.length - 1 ? (
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

export default WelcomeTour;
