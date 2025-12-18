# LinkedIn Post Draft — Hackathon Win Announcement

**Demo Video:** https://drive.google.com/file/d/18bEds5xUl1qEV23oSXJu7iPfZ53NxW2b/view

---

## FINAL DRAFT (Story-Style, Gratitude-First)

---

I won my first AI hackathon. 🥇

FeedPrism just took 1st place at the Memory Over Models Hackathon.

THE IDEA

Since the GenAI wave struck me early this year, I've been living under major FOMO. I subscribed to over 30 high-quality AI newsletters and joined many helpful communities.

The result? Almost 50+ content-rich emails flood into my inbox every day. I scroll through all this great content and can only "favorite" these emails, thinking I'll come back to them "someday," or I bookmark some insightful blogs—**if** I happen to open the email at all. If 3 days passed without me looking into my emails, I was doomed. I'd miss workshop invites. Interesting articles vanished into the pile of emails, Events and Workshops got missed.

This has been on my mind forever. This hackathon gave me the much-needed push, as the theme of the hackathon—"Memory Over Models"—resonated deeply with my problem.

THE HACK

So, I built FeedPrism. Like a prism refracts light into a spectrum of colours, FeedPrism takes a messy feed of emails and refracts them into organised categories: Events, Courses, and Blogs.

The original idea was simple—extract content using LLMs, store it in a vector store, and search through it. But then I started exploring Qdrant properly.

I came into this hackathon thinking of Qdrant as "a vector database where you store embeddings." I left realising it's a complete database solution.

- **Named vectors** let me search the same content in different ways.
- Custom **HNSW tuning** meant I could optimise each collection differently.
- **Hybrid search** combined semantic understanding with keyword precision using RRF Fusion.
- **Payload filtering**—the ability to narrow down candidates before vector search even runs—helped me think about performance differently.
- **Grouping API** helped deduplicate similar content in search results.
- **Idempotency checks** via payload queries prevented reprocessing the same emails.
- **DatetimeRange** helped in time-based event filtering.

Qdrant did most of the storage and retrieval heavy lifting for us. We didn't have to use any other database for our use case.

A late-night addition was storing the source email ID with every extracted item. Every event, every course, every blog links back to exactly where it came from. No hallucination is possible. Users can verify the source with just one click.

There's something powerful about building systems that remember and retrieve rather than generate and hope. In this process, I realized that the best AI may not necessarily be about generating new content—it may well be about something that perfectly remembers and retrieves what already exists.

GRATITUDE

Thank you `<Deepak Chawla>` and `<HiDevs>` for creating a hackathon that rewarded depth over flash.

Thank you `<Qdrant>`, `<Neil Kanungo>`, and `<Andre Zayarni>` for building infrastructure that makes this kind of work possible.

Thank you Lamatic.ai for expanding how I think about workflow orchestration.

Thank you to all the organizers for keeping the hackathon engaging, fun, and top quality.

As for what happens next with FeedPrism—I have some ideas brewing. But that's a story for another day.

🎬 Demo: https://drive.google.com/file/d/18bEds5xUl1qEV23oSXJu7iPfZ53NxW2b/view

#AI #VectorDatabase #Qdrant #Hackathon #RAG #MemoryOverModels #HiDevs

---

## PEOPLE TO TAG (When Posting)

Tag these in your post:

- Deepak Chawla — https://www.linkedin.com/in/deepakchawla1307/
- HiDevs — http://linkedin.com/company/hidevs-gen-ai-workforce/
- Qdrant — https://www.linkedin.com/company/qdrant/
- Neil Kanungo — https://www.linkedin.com/in/neilkanungo/
- Andre Zayarni — https://www.linkedin.com/in/zayarni/
- Lamatic.ai — (tag if they have a company page)

---

## WHATSAPP VERSION (For Groups)

---

Hey everyone! 🙌

Just wanted to share some exciting news—FeedPrism, my idea for the "Memory Over Models" Hackathon, has won 1st place! 🥇

It's an email intelligence system that extracts events, courses, and blogs from newsletter chaos and makes them searchable.

The hackathon was organised by HiDevs in partnership with the AI Collective and sponsored by Qdrant. I competed against hundreds of builders over 10 days.


📝 My Thank You post (with Demo Video): https://www.linkedin.com/posts/activity-7406727786658390016-kYCx?utm_source=share&utm_medium=member_desktop


HiDevs Post
https://www.linkedin.com/posts/deepakchawla1307_the-results-activity-7403857581166850048-Of4_?utm_source=share&utm_medium=member_desktop&rcm=ACoAAAGtZikB_TnZuVi6nAl-_-hV_x-69A5MHNA

If you like the Idea, Kindly share your appreciation on the Linked-In Post. Will Help Me a Lot. Thanks.

Grateful for the learning experience. Happy to chat if anyone wants to know more about vector databases or the technical approach!

— Dishant

---

## HACKATHON COMMUNITY MESSAGE (Discord/Slack)

---

Hey Everyone! 👋

Hope you're all still riding the hackathon high! 🚀

For those who reached out about FeedPrism—I've put together a LinkedIn post with the full demo video. Feel free to check it out! 🎬

Thanks again to @Deepak Chawla, @Qdrant, @Aman Sharma & @Shubham from HiDevs for organizing such an insightful event. And congrats to all the participants and winners for your amazing ideas! 🙌

🔗 https://www.linkedin.com/posts/activity-7406727786658390016-kYCx?utm_source=share&utm_medium=member_desktop

— Dishant

---

## FOLLOW-UP POST (AI Learning Journey Thanks — Post 2-3 Days Later)

---

The hackathon win made me reflect on the people who shaped my AI journey.

None of this happens in isolation.

[CUSTOMIZE: Add 5-7 people/communities with one line each about how they helped]

Example structure:

- [Person/Community] — [One sentence about their impact]
- [Person/Community] — [One sentence about their impact]

Building in public means standing on the shoulders of people who share generously.

Who shaped your journey?

---

## ENGAGEMENT TIPS

1. **Post timing:** Tuesday-Thursday, 8-10 AM or 5-7 PM IST
2. **Reply to every comment** in first 2 hours
3. **Tag people** in the post body, not just comments
4. **Edit within 10 min** if needed (no algorithm penalty)

---

*Draft Version: 2.0 — Story-style, gratitude-first*

🎬 Demo video: https://drive.google.com/file/d/18bEds5xUl1qEV23oSXJu7iPfZ53NxW2b/view