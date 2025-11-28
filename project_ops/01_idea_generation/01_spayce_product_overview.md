# Spayce - Product Overview: Personal Learning Management System

## Core Vision

Create a Personal Learning Management System that transforms fragmented learning experiences into an AI-orchestrated, unified environment where students and professionals can discover, organize, schedule, and engage with learning content through intelligent automation and personalized recommendations.

## Core Concept

Users create **Spaces** (Folders) and **Sub-Spaces** (SubFolders) to organize content in a hierarchical structure. These spaces can contain:
- Links
- Local File Paths
- Remote File Paths
- Notes
- Audio/Video
- Recordings
- Any learning content

The system seamlessly integrates content from multiple sources including course platforms, email newsletters, blog subscriptions, and event recordings into a single searchable interface with intelligent categorization.

## Content Explorer / Content Browser

The centerpiece of the system is the **Content Explorer**, which serves as both a content discovery tool and an embedded browser.

### Dual View Modes

The Content Explorer offers two distinct visualization modes to suit different user preferences and workflows:

#### 1. Detailed Visual View (Blog View)
- Rich visual presentation with images, text, descriptions, and action buttons
- Perfect for browsing and discovering content
- Provides comprehensive information at a glance

#### 2. Compressed Folder View
- Streamlined interface showing content organized as folders and subfolders
- Efficient navigation through hierarchical structures
- Ideal for quick access and organization-focused workflows

### Graph-Based Content Structure

Both views are powered by a **graph-based hierarchical structure** that organizes content with clear relationships and hierarchy. This enables:
- Intelligent content categorization
- Topic and subtopic organization
- Clear navigation paths through related content
- AI-driven content relationship mapping

### Browser-Like Interface

The system is designed as a **standalone browser** where:
- The folder structure functions as advanced bookmarks
- Opening any content launches it in a browser tab
- Multiple tabs support parallel learning activities
- Arc browser-inspired navigation and organization
- Embedded browser within the web/Flutter/desktop application

### Tab Management
- Support for multiple tabs within the Content Browser
- Subfolder navigation similar to Arc browser's folder-like view
- Seamless switching between different learning resources

## Content Sources

A revolutionary **Content Sources** concept that defines where content originates and how it flows into the system:

### Source Types

Content can be automatically extracted from various sources:

1. **Website Sources**
   - Medium profiles (specific user articles)
   - Blog subscriptions
   - Course platforms

2. **Email Integration**
   - Gmail integration as a primary source
   - Functions as an email client within the system
   - Automatic email parsing and classification

3. **Course Platforms**
   - Direct integration with learning platforms
   - Event recording archives

### Automated Email Parsing Workflow

The system includes an intelligent workflow that automatically processes emails:

#### Content Tag Triggers
- Users define **content tags** (e.g., "AI event", "Machine Learning", "Upcoming AI events", "Past AI events")
- These tags trigger automated workflows

#### Email Processing Pipeline
1. **Automatic Email Retrieval**: System fetches emails from connected accounts
2. **Text Classification**: Uses ML models (fine-tuned on email data) or Google LangExtract for intelligent parsing
3. **Content Extraction**: Identifies and extracts relevant content based on tags
4. **Structured Output Generation**: Creates organized content entries with:
   - Content tag
   - Content source (email)
   - Content heading
   - Content description
   - Content image
   - Source reference (direct link to original email)

#### Multi-Content Email Handling
- Intelligently parses emails containing multiple content types
- Example: A newsletter with both AI Ops and AI content is categorized under both relevant tags
- Maintains relationships between related content

### Content Library Building

All extracted content populates a comprehensive **Content Library** with:
- User-provided content tags
- System-generated internal tags for meaningful organization
- AI-driven content hierarchy and relationships
- Complete traceability to source

### Source-Content Navigability

**Critical Feature**: Bidirectional navigation between content and its source
- Direct links from content entries to their source (e.g., specific email)
- Users can jump directly to the original source context
- Maintains full context and provenance of all learning materials

## Intelligent Content Organization

### AI-Powered Content Hierarchy

An **AI agent** generates and maintains the hierarchical relationship between content items:

**Top-Level Categories** (Examples):
- AI Evaluations
- AI Tools
- Machine Learning Frameworks

**Subcategories**: 
- Further organized by themes, topics, or specialized areas
- Dynamic categorization based on content analysis
- LLM-powered understanding of content relationships

### Content Tags System

**Dual Tagging Approach**:
1. **User-Provided Tags**: Custom tags defined by users for personal organization
2. **Internal System Tags**: AI-generated tags for semantic organization and agent understanding

This dual approach ensures both personal relevance and system intelligence.

## Dashboard & Default View

The default landing page features a comprehensive **dashboard** displaying:
- Content-related events
- Personal learning plan
- Schedule and calendar integration
- To-do lists
- Quick access to recent content
- Recommended learning paths

From the dashboard, users can jump directly into:
- Individual content items
- Blog posts
- Newsletters
- Any learning resource in the system

## Browser Integration Features

The system includes powerful features inspired by modern browsers:

### AI Integration
- Combine various contexts from different folders
- Creative liberty to merge contexts in multiple ways
- Perform actions and creative workflows using available contexts
- AI understands and processes any context type

### Additional Integrations
- **Email Integration**: Full email client functionality within the system
- **Calendar**: Synchronized calendar for event tracking and scheduling
- **Notes Integration**: Seamless note-taking and organization

## Arc Browser-Inspired Sharing

### Shareable Folder Links

Similar to Arc browser's share folder feature:
- Users can share multiple links as a single shareable URL
- All links within a folder are stored on the server
- Recipients receive one master link
- Opening the shared link displays all contained links in:
  - Folder view within the Content Explorer
  - Organized and ready for browsing

This enables efficient knowledge sharing and collaborative learning.

## Key Features Summary

### Email Content Extraction
Extract information from emails in various customizable views based on specific goals:

**Predefined Views**:
- AI/ML events with segregated resources
- Upcoming events not yet on calendar (with intelligent event preference learning)
- Resource lists organized for optimal learning journeys
- Content segregated by abstraction level (Data Engineer, Data Scientist, AI Engineer, Product Manager, CEO, CTO, etc.)

**Custom Views**:
- Create totally new views based on specific needs
- Save custom views to Spaces/Sub-Spaces for reuse

#### Examples:

1. **Event Discovery**
   - Get all AI/ML related events
   - Segregate shared resources from event emails
   - Identify events missing from calendar
   - Learn user preferences over time
   - Maintain discarded items list for review

2. **Learning Path Creation**
   - Extract all resources (videos, courses, blogs, articles) from emails
   - Order them into optimal learning journeys
   - Organize by role/abstraction level
   - Create personalized curriculum paths

### Multi-Source Integration
- Seamlessly integrates content from multiple sources
- Course platforms, email newsletters, blog subscriptions, event recordings
- Single searchable interface
- Intelligent categorization using pre-specified tags
- Automatic routing to pre-designated Spaces or Sub-Spaces

### Intelligent Automation
- Automated email parsing and classification
- AI-driven content organization
- Workflow automation based on content tags
- Continuous learning from user behavior


SHOULD BE BUILT WITH SCALABILITY IN MIND, AS THIS CAN BE EXPANDED TO BE USED AS A PROFESSIONAL PRODUCTIVITY CUM CONTENT MANAGEMENT CUM WORKSPACE CUM RESEARCH AND IMPLEMENTATION TOOL. WHO KNOWS WE CAN ADD PROGRAMMING IDE AS A SUB-FEATURE IN FUTURE. THE PRODUCT SHOULD BE BUILD WITH EXTENSIBILITY AND SCALABILITY IN MIND.