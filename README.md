# Yt-dlp + Tag Editor

Self hostable yt-dlp web frontend with built-in mp3 metadata tagging support

## How to use

1. Ensure `yt-dlp` and `ffmpeg` are installed on your system and in your `$PATH`
    - Alternatively, edit `config.json` with the paths to your yt-dlp and ffmpeg binaries
    - If you do this, `ffmpeg` and `ffprobe` binaries need to reside in the same directory as `yt-dlp`

2. Clone this repository

3. Cd into the repository

4. Run `npm install`

5. Run `node index.js` to start the server. Visit `http://localhost:6969` to view the site
    - `pm2` or a systemd service are good ways of running nodejs projects

## Webpages

- http://localhost:6969/
- http://localhost:6969/help.html
- http://localhost:6969/about.html
