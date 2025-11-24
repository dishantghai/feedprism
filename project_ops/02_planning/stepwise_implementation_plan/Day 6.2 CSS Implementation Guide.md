<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# FEEDPRISM IMPLEMENTATION GUIDE (CONTINUED)

### 8.3 Complete CSS Styling

**Create `app/static/styles.css`:**

```css
/**
 * FeedPrism - Complete Stylesheet
 * Arc Browser / Linear / Notion Inspired Design
 * 
 * Structure:
 * 1. CSS Variables (Theme Colors)
 * 2. Reset & Base Styles
 * 3. Layout (Top Bar, Sidebar, Main Content)
 * 4. Components (Cards, Buttons, Modals)
 * 5. Feed Items (Content-Type Specific)
 * 6. Animations (Modular)
 * 7. Responsive Design
 */

/* ============================================================================
   1. CSS VARIABLES - THEME SYSTEM
   ============================================================================ */

:root {
    /* Light Mode Colors */
    --bg-primary: #FAFAFA;
    --bg-secondary: #FFFFFF;
    --bg-tertiary: #F5F5F5;
    --bg-hover: #F0F0F0;
    --bg-active: #E8E8E8;
    
    --text-primary: #1A1A1A;
    --text-secondary: #6B7280;
    --text-tertiary: #9CA3AF;
    --text-inverse: #FFFFFF;
    
    --accent-primary: #3B82F6;
    --accent-primary-hover: #2563EB;
    --accent-primary-active: #1D4ED8;
    
    --accent-event: #8B5CF6;
    --accent-course: #10B981;
    --accent-blog: #F59E0B;
    --accent-action: #EF4444;
    
    --border-color: #E5E7EB;
    --border-hover: #D1D5DB;
    
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
    
    /* Typography */
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
    
    /* Spacing */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    --space-2xl: 48px;
    
    /* Border Radius */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
    --radius-xl: 18px;
    --radius-full: 9999px;
    
    /* Transitions */
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Layout */
    --sidebar-width: 240px;
    --right-sidebar-width: 400px;
    --top-bar-height: 60px;
}

/* Dark Mode */
body.dark-mode {
    --bg-primary: #0F0F0F;
    --bg-secondary: #1A1A1A;
    --bg-tertiary: #151515;
    --bg-hover: #252525;
    --bg-active: #2A2A2A;
    
    --text-primary: #F5F5F5;
    --text-secondary: #A1A1AA;
    --text-tertiary: #71717A;
    --text-inverse: #1A1A1A;
    
    --border-color: #27272A;
    --border-hover: #3F3F46;
    
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.6);
}

/* ============================================================================
   2. RESET & BASE STYLES
   ============================================================================ */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    font-size: 14px;
}

body {
    font-family: var(--font-family);
    background-color: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.6;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

a {
    text-decoration: none;
    color: inherit;
}

button {
    font-family: inherit;
    border: none;
    background: none;
    cursor: pointer;
}

svg {
    width: 20px;
    height: 20px;
    stroke-width: 2;
}

input, select, textarea {
    font-family: inherit;
    font-size: inherit;
}

/* ============================================================================
   3. LAYOUT - TOP BAR
   ============================================================================ */

.top-bar {
    height: var(--top-bar-height);
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-lg);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    backdrop-filter: blur(20px);
    background-color: rgba(255, 255, 255, 0.8);
}

body.dark-mode .top-bar {
    background-color: rgba(26, 26, 26, 0.8);
}

.top-bar-left, .top-bar-center, .top-bar-right {
    display: flex;
    align-items: center;
    gap: var(--space-md);
}

/* Logo */
.logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-weight: 600;
    font-size: 1.1rem;
}

.logo-icon {
    width: 28px;
    height: 28px;
    color: var(--accent-primary);
}

.logo-text {
    color: var(--text-primary);
}

.beta-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 6px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-event));
    color: white;
    border-radius: var(--radius-sm);
    letter-spacing: 0.5px;
}

/* Search Bar */
.search-container {
    position: relative;
    width: 500px;
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: var(--text-tertiary);
    pointer-events: none;
}

.search-input {
    width: 100%;
    height: 38px;
    padding: 0 40px 0 40px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all var(--transition-fast);
}

.search-input:focus {
    outline: none;
    border-color: var(--accent-primary);
    background-color: var(--bg-secondary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
    color: var(--text-tertiary);
}

.search-kbd {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    font-family: var(--font-mono);
    padding: 2px 6px;
    background-color: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-tertiary);
    pointer-events: none;
}

/* Icon Buttons */
.icon-btn {
    position: relative;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
}

.icon-btn:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
}

.icon-btn svg {
    width: 18px;
    height: 18px;
}

/* Metrics Badge */
.metrics-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 0.65rem;
    font-weight: 600;
    padding: 2px 5px;
    background-color: var(--accent-primary);
    color: white;
    border-radius: var(--radius-full);
    min-width: 20px;
    text-align: center;
}

/* Theme Toggle Icons */
.moon-icon.hidden,
.sun-icon.hidden {
    display: none;
}

/* User Avatar */
.user-avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    overflow: hidden;
    border: 2px solid var(--border-color);
}

.user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* ============================================================================
   4. LAYOUT - MAIN LAYOUT
   ============================================================================ */

.main-layout {
    display: flex;
    height: calc(100vh - var(--top-bar-height));
    margin-top: var(--top-bar-height);
}

/* ============================================================================
   5. LAYOUT - LEFT SIDEBAR
   ============================================================================ */

.sidebar {
    width: var(--sidebar-width);
    background-color: var(--bg-secondary);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    transition: transform var(--transition-base);
}

.sidebar-nav {
    padding: var(--space-md);
    flex: 1;
}

/* Nav Items */
.nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.95rem;
    font-weight: 500;
    margin-bottom: 2px;
    transition: all var(--transition-fast);
    cursor: pointer;
}

.nav-item:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
}

.nav-item.active {
    background-color: var(--accent-primary);
    color: white;
}

.nav-item.action-item:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--accent-action);
}

.nav-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.nav-item span:nth-child(2) {
    flex: 1;
}

/* Nav Badges */
.nav-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 8px;
    background-color: var(--bg-hover);
    color: var(--text-secondary);
    border-radius: var(--radius-full);
}

.nav-badge.unread {
    background-color: var(--accent-primary);
    color: white;
}

.nav-badge.priority-high {
    background-color: var(--accent-action);
    color: white;
}

.nav-count {
    font-size: 0.75rem;
    color: var(--text-tertiary);
}

.nav-divider {
    height: 1px;
    background-color: var(--border-color);
    margin: var(--space-md) 0;
}

.nav-section-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary);
    padding: var(--space-sm) var(--space-md);
    margin-top: var(--space-sm);
}

/* Demo Mode Toggle */
.demo-mode {
    margin-top: auto;
}

.toggle-switch {
    position: relative;
    width: 36px;
    height: 20px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-full);
    transition: var(--transition-fast);
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: var(--transition-fast);
}

input:checked + .toggle-slider {
    background-color: var(--accent-primary);
    border-color: var(--accent-primary);
}

input:checked + .toggle-slider:before {
    transform: translateX(16px);
}

/* Sidebar Footer */
.sidebar-footer {
    padding: var(--space-md);
    border-top: 1px solid var(--border-color);
}

.sync-status {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

.sync-indicator {
    width: 8px;
    height: 8px;
    background-color: var(--accent-course);
    border-radius: 50%;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* ============================================================================
   6. LAYOUT - MAIN CONTENT
   ============================================================================ */

.main-content {
    flex: 1;
    overflow-y: auto;
    background-color: var(--bg-primary);
}

.view-container {
    display: none;
    padding: var(--space-2xl);
    max-width: 1200px;
    margin: 0 auto;
}

.view-container.active {
    display: block;
}

/* ============================================================================
   7. FEED VIEW - HEADER
   ============================================================================ */

.feed-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-xl);
}

.feed-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-xs);
}

.feed-subtitle {
    font-size: 0.95rem;
    color: var(--text-secondary);
}

.feed-actions {
    display: flex;
    gap: var(--space-sm);
}

/* Buttons */
.btn-primary, .btn-secondary {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    font-size: 0.95rem;
    font-weight: 500;
    transition: all var(--transition-fast);
}

.btn-primary {
    background-color: var(--accent-primary);
    color: white;
}

.btn-primary:hover {
    background-color: var(--accent-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.btn-primary svg {
    width: 16px;
    height: 16px;
}

.btn-secondary {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
}

.btn-secondary:hover {
    background-color: var(--bg-hover);
    border-color: var(--border-hover);
}

/* ============================================================================
   8. FILTER BAR
   ============================================================================ */

.filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
    padding: var(--space-md);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
}

.filter-group {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
}

/* Filter Chips */
.filter-chip {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    cursor: pointer;
}

.filter-chip:hover {
    background-color: var(--bg-hover);
    border-color: var(--border-hover);
}

.filter-chip.active {
    background-color: var(--accent-primary);
    border-color: var(--accent-primary);
    color: white;
}

.chip-icon {
    font-size: 1rem;
}

.chip-count {
    font-size: 0.75rem;
    padding: 2px 6px;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-full);
}

.filter-chip.active .chip-count {
    background-color: rgba(255, 255, 255, 0.2);
}

/* Filter Select */
.filter-select {
    padding: var(--space-sm) var(--space-md);
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.filter-select:hover {
    background-color: var(--bg-hover);
    border-color: var(--border-hover);
}

.filter-select:focus {
    outline: none;
    border-color: var(--accent-primary);
}

/* ============================================================================
   9. FEED CONTAINER & CARDS
   ============================================================================ */

.feed-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-lg);
}

/* Loading State */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl);
    color: var(--text-secondary);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Feed Card Base */
.feed-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    transition: all var(--transition-fast);
    cursor: pointer;
}

.feed-card:hover {
    border-color: var(--border-hover);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-md);
}

.card-type {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.type-badge {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
}

.type-badge.event {
    background-color: rgba(139, 92, 246, 0.1);
    color: var(--accent-event);
}

.type-badge.course {
    background-color: rgba(16, 185, 129, 0.1);
    color: var(--accent-course);
}

.type-badge.blog {
    background-color: rgba(245, 158, 11, 0.1);
    color: var(--accent-blog);
}

.type-badge.action {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--accent-action);
}

.card-actions {
    display: flex;
    gap: var(--space-xs);
}

.card-action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: var(--text-tertiary);
    transition: all var(--transition-fast);
}

.card-action-btn:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
}

.card-action-btn svg {
    width: 16px;
    height: 16px;
}

.card-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
    line-height: 1.3;
}

.card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
}

.meta-item svg {
    width: 16px;
    height: 16px;
}

.card-description {
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: var(--space-md);
}

.card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
}

.tag {
    padding: 4px 10px;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    color: var(--text-secondary);
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--space-md);
    border-top: 1px solid var(--border-color);
}

.card-source {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

.source-link {
    color: var(--accent-primary);
    cursor: pointer;
    transition: color var(--transition-fast);
}

.source-link:hover {
    text-decoration: underline;
}

.card-footer-actions {
    display: flex;
    gap: var(--space-sm);
}

.btn-small {
    padding: 6px 12px;
    font-size: 0.85rem;
    border-radius: var(--radius-sm);
}

/* Event-Specific Styling */
.feed-card.event {
    border-left: 4px solid var(--accent-event);
}

.event-date-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 8px 14px;
    background: linear-gradient(135deg, var(--accent-event), #9333EA);
    color: white;
    border-radius: var(--radius-md);
    font-weight: 600;
    margin-bottom: var(--space-md);
}

.event-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-md);
}

.detail-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.detail-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-tertiary);
}

.detail-value {
    font-size: 0.95rem;
    color: var(--text-primary);
}

/* Course-Specific Styling */
.feed-card.course {
    border-left: 4px solid var(--accent-course);
}

.course-level {
    display: inline-block;
    padding: 4px 10px;
    background-color: rgba(16, 185, 129, 0.15);
    color: var(--accent-course);
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
}

/* Blog-Specific Styling */
.feed-card.blog {
    border-left: 4px solid var(--accent-blog);
}

.blog-meta {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
}

.blog-author {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.read-time {
    font-size: 0.85rem;
    color: var(--text-tertiary);
}

/* Action Item Styling */
.feed-card.action {
    border-left: 4px solid var(--accent-action);
}

.priority-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 6px 12px;
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    font-weight: 600;
}

.priority-indicator.high {
    background-color: rgba(239, 68, 68, 0.15);
    color: var(--accent-action);
}

.priority-indicator.medium {
    background-color: rgba(245, 158, 11, 0.15);
    color: var(--accent-blog);
}

.priority-indicator.low {
    background-color: rgba(107, 114, 128, 0.15);
    color: var(--text-secondary);
}

.deadline-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 6px 12px;
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    color: var(--text-secondary);
}

/* ============================================================================
   10. RIGHT SIDEBAR (Source Email Display)
   ============================================================================ */

.right-sidebar {
    width: var(--right-sidebar-width);
    background-color: var(--bg-secondary);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform var(--transition-base);
}

.right-sidebar.collapsed {
    transform: translateX(100%);
}

.sidebar-header {
    padding: var(--space-lg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sidebar-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
}

.empty-state {
    text-align: center;
    color: var(--text-tertiary);
    padding: var(--space-2xl);
}

.email-preview {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--text-primary);
}

.email-preview h1, .email-preview h2, .email-preview h3 {
    margin-top: var(--space-lg);
    margin-bottom: var(--space-sm);
}

.email-preview img {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-md);
}

/* ============================================================================
   11. MODALS
   ============================================================================ */

.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.modal.active {
    display: flex;
}

.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
}

.modal-content {
    position: relative;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: modalSlideIn var(--transition-base);
}

.modal-large {
    max-width: 900px;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    padding: var(--space-lg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h2 {
    font-size: 1.3rem;
    font-weight: 600;
}

.modal-body {
    padding: var(--space-lg);
    overflow-y: auto;
    flex: 1;
}

/* ============================================================================
   12. TOAST NOTIFICATIONS
   ============================================================================ */

.toast-container {
    position: fixed;
    bottom: var(--space-lg);
    right: var(--space-lg);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.toast {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    min-width: 300px;
    animation: toastSlideIn var(--transition-base);
}

@keyframes toastSlideIn {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.toast.success {
    border-left: 4px solid var(--accent-course);
}

.toast.error {
    border-left: 4px solid var(--accent-action);
}

.toast.info {
    border-left: 4px solid var(--accent-primary);
}

/* ============================================================================
   13. RESPONSIVE DESIGN
   ============================================================================ */

@media (max-width: 1024px) {
    .search-container {
        width: 350px;
    }
    
    .right-sidebar {
        width: 350px;
    }
}

@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        left: 0;
        top: var(--top-bar-height);
        bottom: 0;
        z-index: 90;
        transform: translateX(-100%);
    }
    
    .sidebar.open {
        transform: translateX(0);
    }
    
    .search-container {
        width: 100%;
    }
    
    .top-bar-center {
        flex: 1;
        margin: 0 var(--space-md);
    }
    
    .view-container {
        padding: var(--space-lg);
    }
    
    .filter-bar {
        flex-direction: column;
        align-items: stretch;
    }
    
    .feed-header {
        flex-direction: column;
        gap: var(--space-md);
    }
}

/* ============================================================================
   14. UTILITY CLASSES
   ============================================================================ */

.hidden {
    display: none !important;
}

.text-center {
    text-align: center;
}

.mt-md {
    margin-top: var(--space-md);
}

.mb-md {
    margin-bottom: var(--space-md);
}

/* ============================================================================
   15. SCROLLBAR STYLING
   ============================================================================ */

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--border-hover);
}
```

Due to character limits, I'll continue with the JavaScript implementation in the next response. The JavaScript will include:

1. **API Integration** - Fetch feed data, search, filters
2. **UI Interactions** - Card clicks, modal handling, sidebar toggle
3. **Feed Rendering** - Dynamic card generation for each content type
4. **Source Traceability** - Show source email in right sidebar/modal
5. **Like/Dislike** - User feedback capture
6. **Demo Mode** - Load sample data
7. **Manual Ingestion** - Trigger pipeline from UI
8. **Real-time Updates** - WebSocket or polling for new emails

Should I continue with the complete JavaScript implementation? 🚀

