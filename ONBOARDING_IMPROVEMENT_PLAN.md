# Onboarding & User Guidance Improvement Plan

## Current State Analysis

### Existing OnboardingFlow
- **4-step wizard**: Role → Profile → Preferences → Verification
- **Verification step**: Optional but not integrated with Smile ID
- **Progress tracking**: Simple progress bar
- **Issues**:
  - No interactive guidance after onboarding
  - Verification step is informational only
  - No contextual help during onboarding
  - No feature discovery tour

### Current Dashboard
- **Complex layout**: Stats, opportunities, deal rooms, quick links
- **No guidance**: New users see full dashboard immediately
- **Missing**: Tooltips, walkthrough, contextual help

## Improvement Strategy

### Phase 1: Enhanced Onboarding Flow

#### 1.1 Integrate Real Verification
```typescript
// Update OnboardingFlow.tsx step 3
import SmileIdVerifyButton from "@/components/SmileIdVerifyButton";

// Replace informational step with actual verification
{currentStep === 3 && (
  <div className="space-y-4">
    <div className="text-center py-4">
      <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
      <h3 className="font-semibold mb-2">Verify Your Identity</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Verify now to unlock all features and build trust
      </p>
    </div>
    <div className="flex justify-center">
      <SmileIdVerifyButton user={user} onVerified={() => setCurrentStep(4)} />
    </div>
    <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)} className="w-full">
      Skip for now (verify later in profile)
    </Button>
  </div>
)}
```

#### 1.2 Add Contextual Tooltips
```typescript
// Add tooltip component
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Add tooltips to each field
<div className="relative">
  <label className="block text-sm font-medium mb-2">
    Business Name *
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <HelpCircle className="w-3 h-3 ml-1 inline text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">The legal name of your business as registered</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </label>
  <Input ... />
</div>
```

#### 1.3 Add Welcome Tour Component
```typescript
// Create src/components/WelcomeTour.tsx
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
    action: () => navigate("/marketplace"),
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

export const WelcomeTour = ({ onComplete }: { onComplete: () => void }) => {
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

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold">{TOUR_STEPS[currentStep].title}</h4>
          <Button variant="ghost" size="sm" onClick={() => { setShow(false); onComplete(); }}>
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
              <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => { setShow(false); onComplete(); }}>
                <Check className="w-4 h-4 mr-1" /> Got it
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Phase 2: Contextual Help System

#### 2.1 Add Help Tooltip Component
```typescript
// Create src/components/HelpTooltip.tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export const HelpTooltip = ({ content, position = "top" }: HelpTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground" />
      </TooltipTrigger>
      <TooltipContent side={position}>
        <p className="text-xs max-w-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
```

#### 2.2 Add Help Center Page
```typescript
// Create src/pages/Help.tsx
import { Navbar } from "@/components/landing/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Book, Video, MessageCircle, Shield } from "lucide-react";

const Help = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container px-4 pt-24 pb-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Help Center</h1>
      <p className="text-muted-foreground mb-8">Find answers and learn how to use Navex Market</p>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search for help..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background"
        />
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card className="hover:border-primary cursor-pointer transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5 text-primary" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Learn the basics of using Navex Market</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary cursor-pointer transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Video Tutorials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Watch step-by-step video guides</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary cursor-pointer transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">How to verify your identity with Smile ID</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary cursor-pointer transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Get help from our support team</p>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {/* FAQ items would go here */}
      </div>
    </div>
  </div>
);
```

### Phase 3: Progressive Feature Disclosure

#### 3.1 Add Feature Flags for New Users
```typescript
// Create src/lib/featureFlags.ts
export const getFeatureFlags = (user: any) => {
  const daysSinceSignup = user?.created_at
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    // Always available
    basicMarketplace: true,
    basicMessaging: true,

    // Available after verification
    advancedSearch: user?.verification_status === "verified",
    dealRooms: user?.verification_status === "verified",

    // Available after 3 days
    analytics: daysSinceSignup >= 3,
    marketIntelligence: daysSinceSignup >= 3,

    // Available after 7 days
    portfolioManagement: daysSinceSignup >= 7,
    advancedCompliance: daysSinceSignup >= 7,

    // Premium features
    bulkImport: user?.subscription_tier === "premium",
    apiAccess: user?.subscription_tier === "premium",
  };
};
```

#### 3.2 Add Feature Announcement Cards
```typescript
// Create src/components/FeatureAnnouncement.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

interface FeatureAnnouncementProps {
  title: string;
  description: string;
  action?: () => void;
  onDismiss: () => void;
}

export const FeatureAnnouncement = ({
  title,
  description,
  action,
  onDismiss,
}: FeatureAnnouncementProps) => (
  <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mb-3">{description}</p>
          {action && (
            <Button size="sm" variant="outline" onClick={action}>
              Try it now
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);
```

### Phase 4: Dashboard Integration

#### 4.1 Update Dashboard to Include Tour
```typescript
// In Dashboard.tsx
import { WelcomeTour } from "@/components/WelcomeTour";
import { FeatureAnnouncement } from "@/components/FeatureAnnouncement";
import { getFeatureFlags } from "@/lib/featureFlags";

const Dashboard = () => {
  const [showTour, setShowTour] = useState(false);
  const [dismissedTour, setDismissedTour] = useState(false);

  useEffect(() => {
    // Show tour for newly onboarded users
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (onboarded && !hasSeenTour && !dismissedTour) {
      setShowTour(true);
    }
  }, [onboarded, dismissedTour]);

  const handleTourComplete = () => {
    localStorage.setItem("hasSeenTour", "true");
    setShowTour(false);
    setDismissedTour(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {showTour && <WelcomeTour onComplete={handleTourComplete} />}

      {/* Feature announcements based on flags */}
      {getFeatureFlags(user).analytics && (
        <FeatureAnnouncement
          title="Analytics Unlocked!"
          description="You now have access to market analytics and insights"
          action={() => navigate("/analytics")}
          onDismiss={() => {}}
        />
      )}

      {/* Rest of dashboard */}
    </div>
  );
};
```

## Implementation Priority

### High Priority (Immediate Impact)
1. Integrate Smile ID verification in onboarding
2. Add contextual tooltips to onboarding fields
3. Create WelcomeTour component
4. Add Help Center page

### Medium Priority (Significant Improvement)
5. Implement feature flags system
6. Add feature announcement cards
7. Create HelpTooltip component
8. Add FAQ content

### Low Priority (Nice to Have)
9. Video tutorials integration
10. Interactive walkthroughs for complex features
11. Contextual help in deal rooms
12. Progressive disclosure for admin features

## Expected Outcomes

### User Experience Improvements
- **Reduced time-to-value**: Users understand key features faster
- **Higher verification completion**: Integrated verification flow
- **Lower support tickets**: Self-service help center
- **Better feature discovery**: Progressive disclosure prevents overwhelm

### Metrics to Track
- Onboarding completion rate
- Verification completion rate
- Time to first deal room creation
- Time to first message sent
- Support ticket volume
- Feature adoption rates

## Next Steps
1. Update OnboardingFlow with real verification
2. Create WelcomeTour component
3. Add Help Center page and route
4. Implement feature flags system
5. Test onboarding flow with new users
6. Gather feedback and iterate
