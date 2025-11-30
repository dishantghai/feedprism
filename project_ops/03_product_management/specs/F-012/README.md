# F-012: Duplicate Content Viewer with Source Tracking

> **Quick Links:** [Main Spec](./spec.md) | [Visual Mockups](./images/)

## 📋 What This Feature Does

Shows users when the same content appears in multiple newsletters with:
- **Visual badges** showing source count ("Seen in 8 sources" 🔥)
- **Expandable source lists** showing all newsletters
- **Click-to-view** any source email in a modal
- **Source navigation** to browse between emails

## 🎯 Why This Matters

- **Reduces noise:** See 1 canonical item instead of 5 duplicates
- **Social proof:** "Seen in 8 sources" = important/popular content
- **Verification:** Compare same content from multiple sources
- **Provenance:** Complete traceability to original emails

## 🏗️ Implementation (10 hours)

| Phase | Time | What to Build |
|-------|------|---------------|
| Backend | 2h | Grouping API integration, sources array |
| Core UI | 3h | DuplicateSourceBadge, SourceListItem |
| Modal Integration | 2h | Source navigation in EmailModal |
| Polish | 2h | Animations, responsive, accessibility |
| Testing | 1h | Cross-browser, performance, edge cases |

## 🚀 Quick Start

### 1. Backend (2 hours)
```python
# app/services/search.py
def _get_sources_for_canonical_item(canonical_id, content_type):
    # Scroll collection with filter on canonical_item_id
    # Extract: email_id, sender, subject, received_at
    # Sort by received_at (descending)
    return sources

# Update search() to return sources array
results.append({
    'is_duplicate': len(sources) > 1,
    'source_count': len(sources),
    'sources': sources
})
```

### 2. Frontend Types (15 min)
```typescript
// src/types/index.ts
export interface Source {
  email_id: string;
  sender: string;
  sender_email: string;
  subject: string;
  received_at: string;
}

export interface FeedItem {
  // ... existing fields
  canonical_item_id?: string;
  is_duplicate?: boolean;
  source_count?: number;
  sources?: Source[];
}
```

### 3. Core Component (2 hours)
```tsx
// src/components/DuplicateSourceBadge.tsx
export function DuplicateSourceBadge({ sources, itemTitle }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  
  if (sources.length === 1) {
    return <SimpleEmailLink source={sources[0]} />;
  }
  
  const variant = sources.length >= 6 ? 'viral' : 
                  sources.length >= 4 ? 'popular' : 'moderate';
  
  return (
    <>
      <button className={`badge ${variant}`} onClick={() => setIsExpanded(!isExpanded)}>
        {variant === 'viral' && '🔥'} Seen in {sources.length} sources
      </button>
      
      {isExpanded && (
        <SourceList sources={sources} onViewEmail={setSelectedEmailId} />
      )}
      
      {selectedEmailId && (
        <EmailModal 
          emailId={selectedEmailId}
          sources={sources}
          onNavigateSource={(idx) => setSelectedEmailId(sources[idx].email_id)}
        />
      )}
    </>
  );
}
```

### 4. Styling (1 hour)
```css
/* Viral badge (6+ sources) */
.badge.viral {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
  50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
}
```

## 📊 Success Metrics

- **Deduplication Rate:** 30%+ of results are duplicates
- **Performance:** Search with grouping < 500ms (p95)
- **Engagement:** 40%+ users expand badges
- **Navigation:** 2+ sources viewed per session

## 🎬 Demo Script (Hackathon)

1. **Show problem:** "Notice duplicate 'NeurIPS 2025' from 3 newsletters"
2. **Reveal solution:** "FeedPrism deduplicates using Qdrant Grouping API"
3. **Show badge:** "This viral badge means 8 sources mentioned it"
4. **Expand sources:** "See all newsletters and when they mentioned it"
5. **View email:** "Click to see original email from any source"
6. **Navigate:** "Browse between sources to verify information"
7. **Explain tech:** "Canonical IDs + Grouping API + source tracking"

## 🏆 Why This Wins

✅ Advanced Qdrant features (Grouping API)  
✅ Real user value (40% noise reduction)  
✅ Premium UI with animations  
✅ Complete backend + frontend  
✅ Measurable metrics  

## 📁 Files

- **README.md** (this file) - Quick reference
- **spec.md** - Complete specification with all details
- **images/** - Visual mockups

## 🔗 Dependencies

- ✅ F-008: Source Email Modal (must exist)
- ✅ Phase 4: Qdrant Grouping API (backend)
- ✅ Deduplicator Service (already exists)

---

**Estimated Time:** 10 hours  
**Impact:** Top 3 hackathon differentiator  
**Status:** Ready to implement
