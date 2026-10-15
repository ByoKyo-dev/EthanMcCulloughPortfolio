# Ethan McCullough: Portfolio Site

A static site (plain HTML, CSS and a little JavaScript) built for GitHub Pages. There's no build step: edit a file, upload it, and the site updates.

```
index.html                 Home: hero, work grid, about, resume, contact form
work/*.html                One page per project (6 placeholder projects)
404.html                   "Page not found" page
favicon.svg                Browser tab icon
assets/css/style.css       All styling (colors and fonts are at the top)
assets/js/main.js          Mobile menu, work filters, contact form
assets/img/                Your portrait, placeholder images, social share image
```

---

## Section nicknames

Use these names when you ask for changes. Each section is also marked in the HTML with a comment like `<!-- ===== [HERO] ===== -->`, so you can search for the name to find its code.

**Home page (`index.html`)**

| Nickname | What it is |
|---|---|
| **Topbar** | Name and menu at the top of every page |
| **Hero** | Navy opening section with your name, intro, buttons and photo |
| **Ticker** | Blue scrolling strip of disciplines under the Hero |
| **Work Grid** | "Selected Work" heading and the project cards |
| **Filters** | The All / Packaging / Print / Identity / Motion buttons |
| **About** | "About" heading and your bio text |
| **Skill Box** | Shaded "Skill Summary" box inside About |
| **Resume** | Experience and Education |
| **Resume Download** | Outlined strip with the "Download PDF" button |
| **Contact** | Navy "Get in Touch" section with the form |
| **Footer** | Copyright line and social icons at the bottom of every page |

**Project pages (`work/*.html`)**

| Nickname | What it is |
|---|---|
| **Case Header** | Back link, tags, project title, lede and the Client/Role/Year/Tools row |
| **Cover Shot** | First big image (`hero.jpg`) |
| **Brief** | "The Brief" text |
| **Detail Pair** | Two square images side by side |
| **Process** | "Process" text |
| **Production Specs** | "Production" text and the Substrate/Print method/Color/Finish boxes |
| **Wide Shot** | Full-width image near the end (`wide.jpg`) |
| **Result** | "Result" text |
| **Next Up** | Light-blue "Next project" link at the bottom |

---

## 1. Put it on GitHub Pages

1. Create a new **public** repository named **`<your-username>.github.io`**, using your GitHub username.
   With this exact name the site lives at the root (`https://<your-username>.github.io/`), so every link works, including the 404 page.
2. Upload **everything inside this folder** to the repo, not the folder itself. Use **Add file → Upload files**, then drag in the contents. `index.html` must sit at the top level of the repo.
   The `.nojekyll` file is hidden on most computers. Upload it too if you can, but the site works without it.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then click **Save**.
4. Wait a minute or two, then visit `https://<your-username>.github.io/`.

## 2. Activate the contact form (one-time)

The form sends messages through **FormSubmit** (formsubmit.co), a free service that needs no account and no server.

1. Once the site is live, open it and send yourself a test message through the form.
2. FormSubmit emails **ethanmccullough01@gmail.com** a confirmation link. Click **Activate Form**. Check your spam folder if you don't see it.
3. From then on, every message goes straight to your inbox. The subject line is "New message from your portfolio site".

**Optional: hide your email address from the page source.** After activating, FormSubmit sends you a random alias string. In `index.html`, find
`data-endpoint="https://formsubmit.co/ajax/ethanmccullough01@gmail.com"` and replace the email address with that string.

## 3. Add the custom domain later

1. Buy the domain from any registrar, such as Namecheap, Porkbun, Cloudflare or Squarespace Domains.
2. In the repo, go to **Settings → Pages → Custom domain**. Enter `yourname.com` and click **Save**. GitHub adds a `CNAME` file to the repo for you.
3. At your registrar, add these DNS records:
   - **A** records for `@`, pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`
   - **CNAME** record for `www`, pointing to `<your-username>.github.io`
4. DNS changes can take up to a day to take effect. Once GitHub shows the domain as verified, tick **Enforce HTTPS**.
5. Optional: add the domain under **Settings → Pages → Verified domains** on your account to protect it.

---

## Replacing the placeholders

### Images
Every placeholder image is labeled with its file path and the size it should be. To swap one in, **save your image under the same file name** in the same folder. You don't need to edit any HTML.

| File | Size | Used for |
|---|---|---|
| `work/<project>/cover.jpg` | 1600 × 1200 (4:3) | Thumbnail on the home page grid |
| `work/<project>/hero.jpg` | 2000 × 1125 (16:9) | Top of the project page |
| `work/<project>/detail-1.jpg`, `detail-2.jpg` | 1200 × 1200 (square) | Side-by-side detail shots |
| `work/<project>/wide.jpg` | 2000 × 1000 (2:1) | Full-width image near the end |
| `og-image.jpg` | 1200 × 630 | Preview image when the link is shared on LinkedIn, iMessage and similar |

Export JPGs at around 80% quality from Photoshop. Keep each image under 500 KB so the site loads fast.

**Motion work:** to show a video instead of an image, replace an `<img ...>` tag with:
```html
<video src="../assets/img/work/motion-graphics/reel.mp4" autoplay muted loop playsinline width="2000" height="1125"></video>
```
Keep video files under about 25 MB, since GitHub rejects files over 100 MB. For longer reels, upload to Vimeo or YouTube and link to them.

### Project text
- **Project pages:** open `work/<project>.html` and replace the title, lede, Client/Role/Year/Tools, and each section's text.
- **Home page cards:** the title and tags for each card are in `index.html`, inside the `work-grid` section.
- **Rename a project:** rename both the HTML file and its image folder, then update the links in `index.html` and the "Next project" link on the project page before it.
- **Add or remove projects:** copy or delete a card in `index.html` and its matching file in `work/`. Each card's `data-cats` attribute (`packaging`, `print`, `identity`, `motion`) controls which filter buttons it appears under.

### Social links
At the bottom of every page, replace each `href="#"` in the `socials` list with your LinkedIn, Behance and Instagram URLs. Find and replace across files works well for this.

### Resume download
The **Download PDF** button points to `assets/EthanMcCullough_Resume.pdf`. Export a web version of your resume **without the references or phone numbers**, name it `EthanMcCullough_Resume.pdf`, and put it in the `assets/` folder.

### Fonts
Your resume uses **Degular**. Until it's set up, the site uses **Bricolage Grotesque**, a free Google Font with a similar feel. To use Degular itself:
1. Go to fonts.adobe.com, open Degular, and click **Add to Web Project**. Include Regular, Bold, Black and Thin (or Light).
2. Adobe gives you a line like `<link rel="stylesheet" href="https://use.typekit.net/xxxxxxx.css">`.
3. Paste it into the `<head>` of every HTML file, just above the `style.css` line.

The CSS already lists `"degular"` first, so the site switches over automatically. Note that Adobe web projects need an active Creative Cloud subscription.

### Colors
These are at the top of `assets/css/style.css` and were sampled from your resume: navy `#13293d`, blue `#1b98e0` and ink `#231f20`.

---

## Admin mode (positioning and replacing images on the live site)

Click the small **lock button** in the bottom-right corner of any page and enter your password. The starting password is **`portfolio-admin`**. Change it the first time you log in (see step 1).

In admin mode, every image frame gets a dashed blue outline and its own controls:

- **Drag** the image to move it within the frame.
- **Zoom** with the slider.
- **Reset** puts the image back to centered, with no zoom.
- **Replace** uploads a new photo into that frame. It's resized to at most 2400 px automatically, and you can position it right away.

Project cards don't open while you're editing. A bar at the bottom shows how many changes you haven't saved yet. Click **Save changes** to publish them. They go live in about a minute, once GitHub Pages rebuilds. Each page saves separately, so save before moving to another page. The site warns you if you try to leave with unsaved changes.

### One-time setup: connect admin mode to GitHub
The site has no server, so admin mode saves by committing straight to your GitHub repo. The first time you click **Save changes**, it asks for:

1. Your **GitHub username** and **repository**. These fill in automatically on `username.github.io`.
2. A **fine-grained access token**:
   - Go to GitHub → Settings → Developer settings → Fine-grained tokens → **Generate new token**.
   - Under Repository access, choose **Only select repositories** and pick this site's repo.
   - Under Repository permissions, set **Contents** to **Read and write**.
   - Generate the token and paste it into admin mode.
3. Optional: a **new admin password**. Fill in the "New admin password" field in Settings.

The token is stored only in the browser you entered it in. To edit from another computer, enter it there too.

### How secure is it?
The password only keeps visitors from wandering into admin mode. This is a static site, so the password can't be fully secret. Your GitHub token is what actually protects the site: without it nobody can save anything, even with the password. Don't share the token, and only enter it on your own devices.

### Where the settings live
- `assets/data/frames.json`: saved position, zoom and image version for each frame. Admin mode writes this file. You can also edit it by hand.
- `assets/data/admin.json`: a scrambled (hashed) copy of your admin password.
