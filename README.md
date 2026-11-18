# Hunter Liang — portfolio site

Plain HTML, CSS and JavaScript. No build step, no framework. GitHub Pages serves these files as they are.

Publish it from a repository named **`lianghunter.github.io`**. The site will then be live at https://lianghunter.github.io.

## What's in here

| File | What it is |
| --- | --- |
| `index.html` | All the page content. This is the file you'll edit most. |
| `style.css` | Colors, fonts, layout. Colors are variables at the top. |
| `script.js` | Shows a placeholder when a clip/image is missing; plays clips only while they're on screen. |
| `render.js` | The little ray tracer that draws the hero image. |
| `assets/resume.pdf` | Your resume. Every "Resume" link points here. |
| `assets/projects/` | Put your clips and images here (you add these). |

## 1. Replace the last placeholder

Anything highlighted yellow on the page is a placeholder. Only one is left: the engine and tools line under Dragon Kisser. Search `index.html` for `todo`.

## 2. Your resume

`assets/resume.pdf` is the resume from Nov 16. To update it later, replace that file and keep the name `resume.pdf`.

Anyone can download this file once the site is live, so it makes your phone number public. To avoid that, export a copy without the phone number and use that instead.

## 3. Add clips and images

Each project already expects a file at a specific path:

| Project | Drop the file at |
| --- | --- |
| Dragon Kisser | `assets/projects/dragonkisser.mp4` |
| VR locomotion research | `assets/projects/vr-locomotion.mp4` |
| C++ ray tracer | `assets/projects/raytracer.mp4` |
| Minotaur Maze | `assets/projects/minotaur-maze.mp4` |

Once the file exists, it shows up automatically. Until then the frame says which file it's waiting for.

**Using a still image instead of a clip:** replace that project's `<video ...></video>` line with

```html
<img src="assets/projects/minotaur-maze.jpg" alt="Short description of the image" loading="lazy">
```

**Keep clips small.** They autoplay muted on a loop, so think 5–20 second highlight loops:

- MP4 (H.264), 1280 px wide, 30 fps, no audio
- Aim for under 10 MB each. GitHub's web uploader rejects files over 25 MB, and git pushes reject files over 100 MB.
- Put full-length videos (trailers, talks) on YouTube and link to them instead.

To shrink a clip with [ffmpeg](https://ffmpeg.org/):

```bash
ffmpeg -i input.mov -t 15 -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 26 -preset slow -an -movflags +faststart dragonkisser.mp4
```

`-t 15` keeps the first 15 seconds; add `-ss 30` before `-i` to start 30 seconds in. Raise `-crf` (e.g. 28–30) for a smaller file.

## 4. Optional links

These are already in `index.html` as comments. Remove the `<!--` and `-->` around one to turn it on:

- LinkedIn, in the contact section
- "Source code" links for the ray tracer and Minotaur Maze, if their repos are public on GitHub

## 5. Add another project

In `index.html`, find the block marked `TEMPLATE`, copy the `<article class="project">…</article>` inside it, paste it above the template, and fill it in.

To change which project is featured at the top, swap the contents of the `project-featured` article with another one.

## Preview locally

Double-click `index.html` to open it in your browser. For the most accurate preview, run a local server from this folder:

```bash
python3 -m http.server 8000
```

then visit http://localhost:8000.

## Publish changes

Commit and push (or upload through the GitHub website). The live site updates within a few minutes.
