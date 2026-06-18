-- Reset the three Garden starter notes with fresh FCW content.
-- Deletes any existing rows with these titles, then re-inserts for the admin user.

delete from public.garden_notes
where title in (
  'Summer 2026 — Programming Ideas',
  'Fall 2026 — Partner Outreach',
  'Grant Language — Working Copy'
);

insert into public.garden_notes (title, body, tag, pinned, created_by)
select
  'Summer 2026 — Programming Ideas',
  $summer$
<h1>What are we building this summer? 🌱</h1>
<p>This is our season. Six weeks, full energy, rooted in the mission. Let's make it the best one yet.</p>

<hr>

<h2>Themes to explore</h2>
<ul>
  <li><span style="color: #3AB819">Nature + the earth — soil, seeds, growth cycles</span></li>
  <li><span style="color: #3AB819">Creative expression — art, music, movement</span></li>
  <li><span style="color: #3AB819">Community care — what does it mean to show up for each other?</span></li>
  <li><span style="color: #3AB819">Identity + self — who am I, what do I love, what do I stand for?</span></li>
</ul>

<hr>

<h2>Events to plan 📅</h2>
<ol>
  <li>Sunday Funday series — every Sunday, rotating activities</li>
  <li>Juneteenth celebration — arts + culture + community meal</li>
  <li>End of summer showcase — children present what they made / learned</li>
  <li>Nature day — gardening, earth art, outdoor movement</li>
  <li>Collab event — partner activation TBD</li>
</ol>

<hr>

<h2>Partner activations</h2>
<p><span style="background-color: #EFB003">Who do we want in the room this summer?</span></p>
<ul>
  <li>The Hive — co-programming opportunity</li>
  <li>Local photographers — document the season</li>
  <li>Movement / dance instructor — weekly sessions</li>
  <li>Community garden — nature day collab</li>
</ul>

<hr>

<h2>Venues we love 📍</h2>
<ul>
  <li><span style="color: #59341E">Freedom Lab — great for workshops + open space</span></li>
  <li><span style="color: #59341E">Legion Park — outdoor activations, all ages welcome</span></li>
  <li><span style="color: #59341E">Betty T. Ferguson Rec Complex — large groups, indoor + outdoor</span></li>
  <li><span style="color: #59341E">W South Beach — special occasions</span></li>
</ul>

<hr>

<h2>Age group breakdown</h2>

<h3>Ages 5–9</h3>
<ul>
  <li>Shorter sessions · 1–2 hrs max</li>
  <li>Sensory + hands-on activities</li>
  <li>Story time + art as anchors</li>
</ul>

<h3>Ages 10–15</h3>
<ul>
  <li>More autonomy + leadership roles</li>
  <li>Discussion-based + project-based</li>
  <li>Let them help design the programming</li>
</ul>

<hr>

<blockquote>The goal isn't a perfect program. The goal is children who feel seen.</blockquote>

<hr>

<h2>Notes + open questions</h2>
<ul>
  <li><span style="background-color: #3AB819">Confirm venues by end of June</span></li>
  <li>Do we want a summer theme word? Last year: GROW. This year: ?</li>
  <li><s>Reach out to Eventbrite for promo — switching to Luma now ✓</s></li>
</ul>
$summer$,
  'Programming',
  true,
  u.id
from auth.users u
where lower(u.email) = lower('info@flowerchildren.world');

insert into public.garden_notes (title, body, tag, pinned, created_by)
select
  'Fall 2026 — Partner Outreach',
  $fall$
<h1>Building the village, one relationship at a time.</h1>
<p>Fall is our season for reconnecting and planting new seeds. This note tracks who we want to reach out to, what we're asking for, and where conversations stand.</p>

<hr>

<h2>Organizations to reconnect with</h2>
<ul>
  <li><span style="color: #15AAD2">The Hive — co-programming + venue support</span></li>
  <li><span style="color: #15AAD2">Black Men Build — workshop collaboration</span></li>
  <li><span style="color: #15AAD2">The Smile Trust — Earth Day + community events</span></li>
  <li><span style="color: #15AAD2">Local schools — after-school pipeline</span></li>
</ul>

<hr>

<h2>New partners to approach 🌟</h2>
<ul>
  <li>Corporate sponsors — looking for 3 anchor sponsors for fall season</li>
  <li>Local restaurants — community meal programming, catering support</li>
  <li>Mental health practitioners — mindfulness programming for older kids</li>
  <li>Photographers + videographers — document the season, build our archive</li>
</ul>

<hr>

<h2>What we're looking for</h2>

<h3>Venue support</h3>
<ul>
  <li>Indoor space for 20–50 people</li>
  <li>Weekends preferred · Sundays ideal</li>
  <li>South Florida + Boston locations</li>
</ul>

<h3>Funding</h3>
<ul>
  <li>Program supplies + materials</li>
  <li>Facilitator stipends</li>
  <li>Transportation support</li>
</ul>

<h3>Skill-based volunteers</h3>
<ul>
  <li>Artists · musicians · coaches</li>
  <li>Mentors for ages 10–15</li>
  <li>Admin + communications support</li>
</ul>

<h3>Co-programming</h3>
<ul>
  <li>Orgs with aligned missions</li>
  <li>Must center children + families</li>
  <li>CALM framework alignment preferred</li>
</ul>

<hr>

<h2>Follow-up tracker</h2>
<ul>
  <li><span style="background-color: #EFB003">The Hive — email sent, awaiting response</span></li>
  <li><s><span style="color: #3AB819">Black Men Build — confirmed for fall ✓</span></s></li>
  <li><span style="background-color: #EFB003">Corporate sponsor outreach — draft email in progress</span></li>
  <li>New photographer contact — get intro from Jade Lilly</li>
  <li>Mental health practitioner — ask in village network first</li>
</ul>

<hr>

<blockquote>Partnership works when both sides show up for the children. That's the only criteria that matters.</blockquote>
$fall$,
  'Community',
  false,
  u.id
from auth.users u
where lower(u.email) = lower('info@flowerchildren.world');

insert into public.garden_notes (title, body, tag, pinned, created_by)
select
  'Grant Language — Working Copy',
  $grant$
<h1>Our story, in our words.</h1>
<p>Use this note to draft and refine language for grants, sponsorship decks, and funding applications. Highlight sections that need work. Strike through what's been approved and locked.</p>

<hr>

<h2>Who we are</h2>
<p><span style="background-color: #3AB819">APPROVED — use this version</span></p>
<blockquote>Children are the seeds of the future. Rooted in values of love and creative freedom, we empower the flower children to become the greatest versions of themselves — with belief in endless possibilities for growth and development.</blockquote>

<hr>

<h2>What we do</h2>
<p>Flower Children World provides free and low-cost youth programming for children ages 4–16, built around the C.A.L.M. framework:</p>
<ul>
  <li><span style="color: #3AB819">C — Community</span></li>
  <li><span style="color: #15AAD2">A — Arts</span></li>
  <li><span style="color: #776BD9">L — Life Skills</span></li>
  <li><span style="color: #EFB003">M — Mindfulness</span></li>
</ul>
<p>Programming spans workshops, weekend activations, seasonal series, and community events — held across South Florida and Boston.</p>

<hr>

<h2>Impact to date</h2>
<ul>
  <li>Active since 2019</li>
  <li>Programming in Miami, Boston, and surrounding communities</li>
  <li>Consistent Sunday Funday series — running multiple seasons</li>
  <li>Partnerships with community orgs including The Hive, Black Men Build, and The Smile Trust</li>
  <li><span style="background-color: #EFB003">ADD: total children served number here</span></li>
  <li><span style="background-color: #EFB003">ADD: total events hosted (pull from Analytics)</span></li>
</ul>

<hr>

<h2>Funding needs</h2>
<ul>
  <li>Program supplies + art materials — $X per season</li>
  <li>Facilitator + instructor stipends — $X per event</li>
  <li>Venue costs — $X per activation</li>
  <li>Transportation support for families — $X per season</li>
  <li><span style="background-color: #EFB003">ADD: total funding goal for fall 2026</span></li>
</ul>

<hr>

<h2>Boilerplate sentences</h2>
<p>Mix and match these for different applications:</p>
<blockquote>FCW has cultivated a living, breathing community of children, caregivers, and partners who believe in the power of intentional programming.</blockquote>
<blockquote>Every activation is designed to meet children where they are — joyful, curious, and full of possibility.</blockquote>
<blockquote>We are not building programs. We are building people.</blockquote>

<hr>

<p><span style="color: #C53D3D">⚠ Sections highlighted in yellow need to be updated before submitting. Never submit a draft with placeholders.</span></p>
$grant$,
  'Fundraising',
  false,
  u.id
from auth.users u
where lower(u.email) = lower('info@flowerchildren.world');
