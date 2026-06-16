# DETAILED INTEGRATION CODE SNIPPETS

## 1. DealSearchWithFilters - Marketplace.tsx Integration

### Already Implemented (Lines 16-17)
\\\	ypescript
import DealQualityScoreDisplay from "@/components/DealQualityScoreDisplay";
import DealSearchWithFilters from "@/components/DealSearchWithFilters";
\\\

### Usage Example:
\\\	ypescript
<DealSearchWithFilters 
  onSelectDeal={(dealId) => {
    navigate(\/deals/\\);
  }}
/>
\\\

## 2. DealQualityScoreDisplay Integration

### Compact Mode Usage:
\\\	ypescript
<DealQualityScoreDisplay dealId={deal.id} compact={true} />
\\\

## 3. DocumentTemplateSelector - Already Integrated in DealRoomDetail.tsx

Line 229:
\\\	ypescript
{(isOwner || isEditor) && (
  <DocumentTemplateSelector 
    dealRoomId={id} 
    user={user} 
    onDocumentCreated={handleDocumentCreated}
  />
)}
\\\

## 4. VideoConferenceButton - Already Integrated in DealRoomDetail.tsx

Line 177:
\\\	ypescript
{hasRoomAccess && (
  <VideoConferenceButton 
    dealRoomId={id} 
    user={user} 
    dealRoomTitle={room?.title}
  />
)}
\\\

## 5. BulkImportDialog - Admin.tsx Recommended Integration

Add to admin toolbar:
\\\	ypescript
<BulkImportDialog 
  user={user}
  onImportComplete={() => loadDeals()}
/>
\\\

## SERVICE DEPENDENCY MATRIX

| Component | Service | Functions Used |
|-----------|---------|-----------------|
| DealSearchWithFilters | dealSearch | searchDeals(), getFilterOptions(), trackDealView() |
| DealQualityScoreDisplay | dealQualityScoring | getDealScore(), getScoreBadge() |
| DocumentTemplateSelector | documentTemplates | getDocumentTemplates(), useTemplate() |
| VideoConferenceButton | videoConferencing | launchVideoConference(), generateConferenceRoomName() |
| VideoConferenceButton | activityTracking | logDealRoomActivity() |
| BulkImportDialog | bulkImport | importDealsFromCSV(), exportDealsToCSV() |

