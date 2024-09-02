const express = require("express");
const AdmZip = require("adm-zip");
const http = require("http");
const MP3Tag = require("mp3tag.js");
const path = require("path");
const fs = require('fs');
const Ytdlp = require("./ytdlp.js");
const config = require("./config.json");

const app = express();
app.use(express.json());
app.use(express.static('html'));
app.use('/favicon.ico', express.static(path.join(__dirname, 'favicon', 'favicon.ico')));
const server = http.createServer(app);

function isPlaylist(url) {
    if (url.includes("\/playlist?list=")) return true;
    else return false;
}

function sanitizeUrl(url) {
    if (isPlaylist(url)) return url;
    return url.replace(/\?list=LL|\?list=LL&index=[0-9]/ig, "");
}

function isYoutubeUrl(url) {
    if (url.match(/https:\/\/www\.youtube|https:\/\/youtu\.be|https:\/\/youtube\.com/ig)) return true;
    else return false;
}

// Pages

app.get('/', (req, res) => {
    try {
        return res.sendFile("./html/index.html");
    } catch (error) {
        console.error(error);
        return res.send(`<html><body><h1>500 Error</h1><p>${error.message}</p</body></html>`);
    }
});

// APIs

app.get('/api/ytdlp/version', async (req, res) => {
    try {
        const version = await Ytdlp.getVersion();
        console.log(version);
        return res.json({ success: true, message: version });
    } catch (error) {
        console.error(`Error in /api/ytdlp/version: ${error.message}`);
        return res.json({ success: false, message: error.message });
    }
});

app.get('/api/ytdlp/title', async (req, res) => {
    try {
        if (typeof req.query.url === "undefined") return res.json({ success: false, message: "No url was passed" });
        if (!isYoutubeUrl(req.query.url)) return res.json({ success: false, message: "Url provided was not a valid youtube url" });
        if (isPlaylist(req.query.url)) return res.json({ success: false, message: "Url provided was a playlist url" });

        const url = sanitizeUrl(req.query.url);
        const data = await Ytdlp.getTitle(url);
        return res.json({ success: true, message: data });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
});

app.get('/api/ytdlp/playlist', async (req, res) => {
    try {
        if (typeof req.query.url === "undefined") return res.json({ success: false, message: "No url was provided" });
        if (!isYoutubeUrl(req.query.url)) return res.json({ success: false, message: "Url provided was not a valid youtube url" });
        if (!isPlaylist(req.query.url)) return res.json({ success: false, message: "Url provided was not a playlist url" });

        const url = sanitizeUrl(req.query.url);
        const data = await Ytdlp.getPlaylistJson(url);
        return res.json({ success: true, message: "Successfully retrieved playlist json", playlist: data });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
});

app.post('/api/ytdlp/download', async (req, res) => {
    try {
        if (typeof req.body === "undefined") return res.json({ success: false, message: "'body' was not provided" });
        if (typeof req.body.url === "undefined" || typeof req.body.url !== "string") return res.json({ success: false, message: "'url' was either not provided or not a valid string" });
        if (!isYoutubeUrl(req.body.url)) return res.json({ success: false, message: "url provided was not a Youtube url" });
        if (isPlaylist(req.body.url)) return res.json({ success: false, message: "url provided is a playlist url" });

        const url = req.body.url;
        const sessionId = req.body.sessionId;
        const metadata = req.body.mp3Metadata;
        const downloadOptions = req.body.downloadOptions;

        console.log("Downloading url: " + url);
        console.log("SessionId: " + sessionId);
        console.log("Metadata:", metadata);
        console.log("Download options:", downloadOptions);

        const downloadDestination = path.resolve(`./downloads/${sessionId}`);
        const fullFilePath = `${downloadDestination}/${metadata.title}.${downloadOptions.audioOnly ? downloadOptions.audioFormat : downloadOptions.videoFormat}`;

        // ensure download path exists
        try {
            await fs.promises.mkdir(downloadDestination, { recursive: true });
        } catch (error) {
            console.error(error);
            return res.json({ success: false, message: `Failed to create download directory: ${error.message}` });
        }

        if (downloadOptions.audioOnly) {
            console.log("Downloading audio only...");
            const resp = await Ytdlp.downloadAudio(url, downloadDestination, metadata.title, { format: "bestaudio", audioformat: "mp3", embedthumbnail: downloadOptions.embedYoutubeThumb });
            console.log(`Success: ${resp}`);
        } else {
            console.log("Downloading video...");
            const resp = await Ytdlp.downloadVideo(url, downloadDestination, metadata.title, { extension: "mp4", embedthumbnail: downloadOptions.embedYoutubeThumb });
            console.log(`Success: ${resp}`);
        }

        // custom metadata
        if (!downloadOptions.ignoreCustomMetadata && downloadOptions.audioOnly) {
            console.log("Editing metadata...");
            console.log(`Reading ${fullFilePath}`);
            const buffer = await fs.promises.readFile(fullFilePath);
            const mp3tag = new MP3Tag(buffer, true);
            await mp3tag.read();
            if (metadata.title !== "") mp3tag.tags.title = metadata.title;
            if (metadata.artist !== "") mp3tag.tags.artist = metadata.artist;
            if (metadata.album !== "") mp3tag.tags.album = metadata.album;
            if (metadata.year !== "") mp3tag.tags.year = metadata.year;
            if (metadata.trackno !== "" && metadata.tracknoMax !== "") mp3tag.tags.track = `${metadata.trackno}/${metadata.tracknoMax}`;
            if (metadata.genre !== "") mp3tag.tags.genre = metadata.genre;
            if (metadata.lyrics !== "") mp3tag.tags.comment = metadata.lyrics;
            await mp3tag.save();

            if (mp3tag.error !== '') throw new Error(mp3tag.error);

            await mp3tag.read();
            console.log("tags", mp3tag.tags);

            await fs.promises.writeFile(fullFilePath, mp3tag.buffer);
        }

        return res.json({ success: true, message: "Finished downloading :3" });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
});

app.post("/api/zip", async (req, res) => {
    try {
        if (typeof req.body.sessionId === "undefined") return res.json({ success: false, message: "'sessionId' was not provided" });

        const sessionId = req.body.sessionId;
        const zip = new AdmZip();
        const outputFile = path.resolve(`./downloads/${sessionId}.zip`);
        const sessionFolder = path.resolve(`./downloads/${sessionId}`);

        console.log(`Adding contents of ${sessionFolder}`);
        await zip.addLocalFolderPromise(`./downloads/${sessionId}`);

        console.log("Writing zip...");
        await zip.writeZipPromise(outputFile);

        console.log("Done writing zip");
        return res.json({ success: true, message: `Created ${outputFile}`, filename: path.basename(outputFile) });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
});

app.get("/api/download", async (req, res) => {
    try {
        if (typeof req.query.sessionId === "undefined") return res.json({ success: false, message: "'sessionId' was not provided" });
        const sessionId = req.query.sessionId;

        const file = path.resolve(`./downloads/${sessionId}.zip`);

        try {
            await fs.promises.access(file);
        } catch (err) {
            console.log(`${file} does not exist!`);
            return res.json({ success: false, message: `Failed to send ${file} to the browser. File not found...` });
        }

        let name = path.basename(file);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${name}`);
        console.log("Starting data pipe...");
        const stream = fs.createReadStream(file);
        stream.pipe(res);
        console.log("Done laying pipe");
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message() });
    }
});

app.delete("/api/cleanup", async (req, res) => {
    try {
        if (typeof req.query.sessionId === "undefined") return res.json({ success: false, message: "'sessionId' was not provided" });
        const sessionId = req.query.sessionId;

        const folderPath = path.resolve(`./downloads/${sessionId}`);
        const zipPath = path.resolve(`./downloads/${sessionId}.zip`);

        try {
            await fs.promises.access(folderPath);
        } catch (error) {
            console.error(`Folder ${folderPath} not found`);
            return res.json({ success: false, message: `Folder ${folderPath} not found` });
        }

        try {
            await fs.promises.access(zipPath);
        } catch (error) {
            console.error(`File ${zipPath} not found`);
            return res.json({ success: false, message: `File ${zipPath} not found` });
        }

        await fs.promises.rm(folderPath, { recursive: true });
        await fs.promises.rm(zipPath);
        return res.json({ success: true, message: `Successfully cleaned up files` });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
});

server.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
});
