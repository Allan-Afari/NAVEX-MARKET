# Integration Guide - Critical Gaps Fix

## Quick Start: How to Integrate the Fixes

### Step 1: Apply Database Migrations

Run these migrations in Supabase:

```bash
# Option A: Using Supabase CLI
supabase migration up

# Option B: Manual - Copy migration contents to Supabase SQL Editor
# Files to copy:
# - supabase/migrations/20250503_create_deal_room_activity.sql
# - supabase/migrations/20250503_add_negotiation_dispute_compliance.sql
# - supabase/migrations/20250503_create_realtime_chat.sql
```

### Step 2: Update TypeScript Types

Generate updated types from your Supabase schema:

```bash
# Using Supabase CLI
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Step 3: Update DealRoomDetail Component

Add the new components to your deal room detail page:

```tsx
import { ActivityAuditDashboard } from "@/components/ActivityAuditDashboard";
import { DealNegotiationTerms } from "@/components/deal-rooms/DealNegotiationTerms";
import { DisputeResolution } from "@/components/deal-rooms/DisputeResolution";

export const DealRoomDetail = () => {
  // ... existing code ...

  return (
    <div className="space-y-6">
      {/* Existing components */}
      <DocumentUpload {...props} />
      <ParticipantManager {...props} />
      
      {/* New components */}
      <DealNegotiationTerms 
        dealRoomId={id} 
        user={user} 
        isEditor={isEditor} 
      />
      
      <DisputeResolution 
        dealRoomId={id}
        participantIds={participantIds}
        user={user}
        isEditor={isEditor}
      />
      
      {/* Admin-only */}
      {isAdmin && (
        <ActivityAuditDashboard 
          dealRoomId={id} 
          isAdmin={true}
        />
      )}
    </div>
  );
};
```

### Step 4: Update DealRoomChat for Real-time

Replace your current chat implementation with real-time:

```tsx
import { useEffect, useState, useRef } from "react";
import { realtimeChatService } from "@/lib/realtimeChat";
import { logDealRoomActivity } from "@/lib/activityTracking";

export const DealRoomChat = ({ dealRoomId, user }) => {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Subscribe to real-time messages
    realtimeChatService.subscribeToChat(
      dealRoomId,
      (message) => {
        setMessages((prev) => [...prev, message]);
        // Log activity
        logDealRoomActivity(user.id, {
          deal_room_id: dealRoomId,
          action: "message_sent",
          description: `Message: ${message.content.substring(0, 50)}...`,
        });
      },
      (typing) => {
        if (typing.is_typing) {
          setTypingUsers((prev) => new Set([...prev, typing.user_id]));
        } else {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(typing.user_id);
            return next;
          });
        }
      }
    );

    // Load message history on mount
    realtimeChatService.loadMessageHistory(dealRoomId).then(setMessages);

    // Cleanup
    return () => realtimeChatService.unsubscribeFromChat(dealRoomId);
  }, [dealRoomId]);

  const handleSendMessage = async (content: string) => {
    const message = await realtimeChatService.sendMessage(
      dealRoomId,
      user.id,
      content
    );
    if (message) {
      // Message will appear automatically via subscription
    }
  };

  const handleTyping = async (isTyping: boolean) => {
    await realtimeChatService.updateTypingStatus(dealRoomId, user.id, isTyping);
  };

  return (
    // Your existing chat UI
    // Use messages, typingUsers state
    // Call handleSendMessage, handleTyping
  );
};
```

### Step 5: Add Compliance Checks to Deal Creation

In your DealRoomCreate or deal submission:

```tsx
import { performComplianceCheck } from "@/lib/complianceChecks";
import { logDealRoomActivity } from "@/lib/activityTracking";

const handleCreateDeal = async (dealData) => {
  // Run compliance check first
  const complianceResult = await performComplianceCheck(
    user.id,
    dealRoomId,
    dealData.fundingAmount
  );

  if (!complianceResult.passed) {
    if (complianceResult.riskScore > 85) {
      // Block transaction
      toast.error("Transaction blocked due to compliance concerns. Admin will review.");
      return;
    }
    
    // Show warnings
    complianceResult.recommendations.forEach((rec) => {
      toast.warning(rec);
    });
  }

  // Log the activity
  await logDealRoomActivity(user.id, {
    deal_room_id: dealRoomId,
    action: "deal_created",
    description: dealData.title,
    metadata: {
      complianceScore: complianceResult.riskScore,
      flags: complianceResult.flags.length,
    },
  });

  // Continue with deal creation...
};
```

### Step 6: Add Privacy Controls to Profile Page

```tsx
import { 
  getUserPrivacySettings, 
  updateUserPrivacySettings,
  exportUserData,
  deleteUserAccount,
  enforceDataRetention 
} from "@/lib/dataPrivacy";

export const PrivacySettings = ({ userId }) => {
  const [settings, setSettings] = useState(null);

  const handleExportData = async () => {
    const data = await exportUserData(userId);
    // Download as JSON
    const blob = new Blob([JSON.stringify(data, null, 2)]);
    // ... download logic
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure? This cannot be undone.")) {
      const success = await deleteUserAccount(userId);
      if (success) {
        // Redirect to logout
      }
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleExportData}>
        Download My Data (GDPR)
      </Button>
      <Button variant="destructive" onClick={handleDeleteAccount}>
        Delete My Account
      </Button>
      {/* Privacy setting toggles */}
    </div>
  );
};
```

### Step 7: Run Tests

```bash
# Test activity logging
npm test -- src/lib/activityTracking.test.ts

# Test compliance checks
npm test -- src/lib/complianceChecks.test.ts

# Test real-time chat
npm test -- src/lib/realtimeChat.test.ts

# Build and check for errors
npm run build
```

---

## Usage Examples

### Log an Activity
```tsx
import { logDealRoomActivity } from "@/lib/activityTracking";

await logDealRoomActivity(user.id, {
  deal_room_id: "room-123",
  action: "document_uploaded",
  description: "Uploaded financial statements",
  metadata: { document_id: "doc-456", file_size: 2048 },
});
```

### Perform Compliance Check
```tsx
import { performComplianceCheck } from "@/lib/complianceChecks";

const result = await performComplianceCheck(
  user.id,
  dealRoomId,
  1000000 // funding amount in GH₵
);

// result.passed: boolean
// result.riskScore: 0-100
// result.flags: ComplianceFlag[]
// result.recommendations: string[]
```

### Subscribe to Real-time Chat
```tsx
import { realtimeChatService } from "@/lib/realtimeChat";

realtimeChatService.subscribeToChat(
  dealRoomId,
  (message) => {
    console.log("New message:", message.content);
  },
  (typing) => {
    console.log(`User ${typing.user_id} is ${typing.is_typing ? 'typing' : 'not typing'}`);
  }
);
```

### Export Audit Trail
```tsx
import { exportActivityAuditTrail } from "@/lib/activityTracking";

const csv = await exportActivityAuditTrail(dealRoomId, "csv");
// Download CSV file
```

### Set Data Retention Policy
```tsx
import { setDataRetentionPolicy } from "@/lib/dataPrivacy";

await setDataRetentionPolicy(user.id, {
  retention_days: 90,
  auto_delete: true,
  encryption_enabled: true,
});
```

---

## Configuration

### Compliance Risk Thresholds
Edit in `src/lib/complianceChecks.ts`:
```tsx
const RISK_THRESHOLDS = {
  high_value: 100000,           // GH₵ - Triggers review
  critical_countries: ["KP", "IR", "SY"], // OFAC list
  max_deal_value: 10000000,     // GH₵ - Auto-block
};
```

### Activity Retention
Edit in `src/lib/dataPrivacy.ts`:
```tsx
const DEFAULT_RETENTION_DAYS = 90;
const AUTO_DELETE_OLD_DOCUMENTS = true;
```

### Chat Message History Limit
Edit in `src/lib/realtimeChat.ts`:
```tsx
async loadMessageHistory(dealRoomId: string, limit: number = 50)
                                                    // ^ Change limit
```

---

## Admin Dashboard Access

Add to your admin routes:

```tsx
<Route path="/admin/compliance" element={<ComplianceDashboard />} />
<Route path="/admin/audit" element={<ActivityAuditDashboard isAdmin={true} />} />
<Route path="/admin/disputes" element={<DisputeManagement />} />
```

---

## Monitoring & Alerts

### Set up automated checks

Add to your backend job scheduler:
```tsx
// Run daily
async function enforcePolicies() {
  const users = await getAllUsers();
  for (const user of users) {
    await enforceDataRetention(user.id);
  }
}

// Run hourly
async function checkComplianceFlagEscalations() {
  const flags = await getComplianceFlags();
  const escalated = flags.filter(f => f.severity === 'critical');
  
  for (const flag of escalated) {
    await notifyAdmins(flag);
  }
}
```

---

## Support & Debugging

### Enable debug logging
```tsx
// In your environment file
VITE_DEBUG_COMPLIANCE=true
VITE_DEBUG_ACTIVITY=true
VITE_DEBUG_CHAT=true
```

### Check Supabase logs
- Visit Supabase dashboard → Logs
- Filter by table: `deal_room_activity`
- Filter by function: `log_deal_room_activity()`

### Common Issues

**Issue: Activities not being logged**
- Check migration was applied: `SELECT * FROM deal_room_activity LIMIT 1`
- Check RLS policies are correct
- Check user_id is valid

**Issue: Real-time messages not syncing**
- Enable Realtime in Supabase dashboard
- Check websocket connection: Check browser console
- Verify RLS policies on `deal_room_messages`

**Issue: Compliance flags not triggering**
- Check threshold values in `complianceChecks.ts`
- Verify user profile data is complete
- Check browser console for errors

---

## Next Phase: Advanced Features

After this integration is complete, consider:

1. **AML Integration** - Third-party AML screening
2. **Webhooks** - Send events to external systems
3. **Automated Rules** - Custom compliance rule engine
4. **Bulk Operations** - Batch compliance checks
5. **Machine Learning** - Anomaly detection
6. **Advanced Reporting** - Custom report builder

---

## Questions?

Refer to the main analysis document: `CRITICAL_GAPS_FIXED.md`
