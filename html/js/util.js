const queue = document.getElementById("queue-list");
const sessionId = makeDownloadSessionId();

document.addEventListener('DOMContentLoaded', () => {
    if (queue.children.length > 0) document.getElementById("dl-button").disabled = false;
    else document.getElementById("dl-button").disabled = true;
});

function isYoutubeUrl(url) {
    if (url.match(/https:\/\/www\.youtube|https:\/\/youtu\.be|https:\/\/youtube\.com/ig)) return true;
    else return false;
}

function updateDownloadProgressLabel(message) {
    const label = document.getElementById("dl-progress-label");
    label.innerHTML = message;
}

function updateDownloadProgressBar(idx) {
    const progress = document.getElementById("dl-progress");
    progress.value = idx;
}

function makeDownloadSessionId(length = 16) {
    const alphanum = '0123456789abcdefghijklmnopqrstuvwxyz';
    let string = "";
    let min = 0;
    let max = alphanum.length - 1;
    for (let i = 0; i < length; i++) {
        string += alphanum[Math.floor(Math.random() * (max - min + 1) + min)];
    }
    return string;
}

// helper functions for fetch to return json response
async function fetchGet(url) {
    try {
        const res = await fetch(url, { method: "GET" });
        const resJson = await res.json();
        return resJson;
    } catch (error) {
        console.error(error);
    }
}

async function fetchPost(url, body) {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const resJson = await res.json();
        return resJson;
    } catch (error) {
        console.error(error);
    }
}

async function fetchDelete(url) {
    try {
        const res = await fetch(url, { method: "DELETE" });
        const resJson = await res.json();
        return resJson;
    } catch (error) {
        console.error(error);
    }
}

async function addQueueItem() {
    const url = document.getElementById("url-input").value;
    if (!isYoutubeUrl(url)) {
        document.getElementById("message").innerHTML = `<i>Please provide a valid Youtube url</i>`;
        return null;
    } else {
        document.getElementById("message").innerHTML = "";
    }

    // check if playlist or not
    // if so, call /api/ytdlp/playlist?url=url to get individual titles and urls
    let isPlaylistUrl = false;
    let playlistData = [0];
    if (url.includes("\/playlist?list=")) {
        isPlaylistUrl = true;
        updateDownloadProgressLabel(`Gathering playlist videos...`);
        const playlistJson = await fetchGet(`/api/ytdlp/playlist?url=${url}`);
        if (playlistJson.success) {
            playlistData = playlistJson.playlist;
            updateDownloadProgressLabel(`${playlistJson.message} (${playlistData.length} videos)`);
            console.log("playlistData", playlistData);
        } else {
            document.getElementById("message").innerHTML = `<i>Error gathering playlist json: ${playlistJson.message}</i>`;
            return null;
        }
    }

    // loop to create one or more queue item
    for (let i = 0; i < playlistData.length; i++) {
        // Create a new list item
        const listItem = document.createElement("li");

        // Create and add title input field
        const titleField = document.createElement("div");
        titleField.innerHTML = `<b>Title:</b> <input type="text" value="${isPlaylistUrl ? playlistData[i].title : "Gathering title..."}" class="title-input"/>`;
        listItem.appendChild(titleField);

        // Create and add spinner, initially hidden
        const spinner = document.createElement("span");
        const spinnerMsg = document.createElement("span");
        spinner.classList.add("spinner", "hidden");
        spinnerMsg.classList.add("hidden");
        spinnerMsg.innerHTML = " Getting video title...";
        titleField.appendChild(spinner);
        titleField.appendChild(spinnerMsg);

        // Create a toggle spoiler
        const toggleSpoiler = document.createElement("div");
        const details = document.createElement("details");
        details.innerHTML = "<summary>Show Details</summary>";
        toggleSpoiler.appendChild(details);
        listItem.appendChild(toggleSpoiler);

        // Create a container for the metadata fields
        const metadataContainer = document.createElement("div");

        // Create a table to layout the metadata fields in a 2x2 grid
        const metadataTable = document.createElement("table");
        metadataTable.classList.add("metadata-table");

        // Create and add URL input field
        const urlField = document.createElement("div");
        urlField.innerHTML = `<b>URL:</b> <input type="text" value="${isPlaylistUrl ? playlistData[i].url : url}" class="url-input"/>`;
        metadataContainer.appendChild(urlField);

        const audioOnlyToggle = document.createElement("div");
        audioOnlyToggle.innerHTML = `<b>Audio only?</b> <input type="checkbox" checked class="audioonly-checkbox"/>`;
        metadataContainer.appendChild(audioOnlyToggle);

        const includeYoutubeThumb = document.createElement("div");
        includeYoutubeThumb.innerHTML = `<b>Include Youtube thumbnail?</b> <input type="checkbox" class="embed-thumbnail-checkbox"/>`
        metadataContainer.appendChild(includeYoutubeThumb);

        const ignoreCustomMetadata = document.createElement("div");
        ignoreCustomMetadata.innerHTML = `<b>Ignore custom metadata?</b> <input type="checkbox" class="ignore-custom-metadata-checkbox"/>`
        metadataContainer.appendChild(ignoreCustomMetadata);

        // Populate the table with the metadata input fields
        metadataTable.innerHTML = `
            <caption>MP3 Metadata Tags</caption>
            <tr>
              <td><b>Artist:</b> <input type="text" class="artist-input" value="" placeholder="Artist name"/></td>
              <td><b>Album:</b> <input type="text" class="album-input" value="" placeholder="Album name"/></td>  
            </tr>
            <tr>
              <td><b>Year:</b> <input type="text" class="year-input" value="" placeholder="Year"/></td>
              <td><b>Genre:</b> <input type="text" class="genre-input" value="" placeholder="Genre"/></td>
            </tr>
            <tr>
              <td><b>Track #:</b> <div style="display: flex; gap: 10px"><input style="width: 50px" type="number" value="1" class="trackno-input"/> of <input type="number" style="width: 50px" value="1" class="trackno-max-input"/></span></td>
              <td><b>Composer:</b> <input type="text" value="" class="composer-input" placeholder="Composer"/></td>
            </tr>
          `;

        // Append the table to the metadata container
        metadataContainer.appendChild(metadataTable);

        // Append the metadata container to the toggle spoiler details
        details.appendChild(metadataContainer);

        const lyricsDiv = document.createElement("div");
        lyricsDiv.innerHTML = `<b>Lyrics:</b><textarea placeholder="Lyrics" class="lyrics-textarea"></textarea>`;
        details.appendChild(lyricsDiv);

        queue.appendChild(listItem);

        // clear youtube url input
        if (!window.location.pathname === "/help.html") {
            document.getElementById("url-input").value = "";
        }

        // get video title from /api/ytdlp/title?url=url if not playlist
        if (!isPlaylistUrl) {
            spinner.classList.remove('hidden');
            spinnerMsg.classList.remove("hidden");
            updateDownloadProgressLabel(`Gathering title for ${url}...`);
            const titleData = await fetchGet(`/api/ytdlp/title?url=${url}`);
            listItem.querySelector("input[type='text']").value = titleData.message;
            spinner.classList.add('hidden');
            spinnerMsg.classList.add("hidden");
        }
    }

    if (queue.children.length > 0) document.getElementById("dl-button").disabled = false;
    else document.getElementById("dl-button").disabled = true;
    setTimeout(() => {
        updateDownloadProgressLabel("Ready to download");
    }, isPlaylistUrl ? 1000 : 500);
}

async function startDownload() {
    const queueItems = document.querySelectorAll("#queue-list li");
    if (queueItems.length < 1) {
        updateDownloadProgressLabel("Nothing to do...");
        return null;
    }

    document.getElementById("dl-progress").max = queueItems.length;

    let idx = 0; // count for updating progress bar and label
    for await (let item of queueItems) {
        // Toggle spinner visibility
        const spinner = item.querySelector(".spinner");
        spinner.classList.toggle("hidden");

        // Get data from input fields
        const title = item.querySelector(".title-input").value;
        const url = item.querySelector(".url-input").value;
        const artist = item.querySelector(".artist-input").value;
        const album = item.querySelector(".album-input").value;
        const year = item.querySelector(".year-input").value;
        const genre = item.querySelector(".genre-input").value;
        const trackno = item.querySelector(".trackno-input").value;
        const tracknoMax = item.querySelector(".trackno-max-input").value;
        const composer = item.querySelector(".composer-input").value;
        const lyrics = item.querySelector(".lyrics-textarea").value;
        const audioOnly = item.querySelector(".audioonly-checkbox").checked;
        const embedYoutubeThumb = item.querySelector(".embed-thumbnail-checkbox").checked;
        const ignoreCustomMetadata = item.querySelector(".ignore-custom-metadata-checkbox").checked;

        const videoData = {
            url: url,
            sessionId: sessionId,
            mp3Metadata: {
                title: title,
                artist: artist,
                album: album,
                year: year,
                genre: genre,
                trackno: trackno,
                tracknoMax: tracknoMax,
                composer: composer,
                lyrics: lyrics
            },
            downloadOptions: {
                audioOnly: audioOnly,
                embedYoutubeThumb: embedYoutubeThumb,
                ignoreCustomMetadata: ignoreCustomMetadata,
                audioFormat: "mp3",
                videoFormat: "mp4"
            }
        };

        updateDownloadProgressLabel(`Downloading ${title}...`);
        const data = await fetchPost("/api/ytdlp/download", videoData);
        console.log(data);
        spinner.classList.add("hidden");

        idx++;
        updateDownloadProgressBar(idx);
    }

    updateDownloadProgressBar(idx);
    updateDownloadProgressLabel(`Finished downloading ${idx} videos~! Starting zip...`);

    console.log("Calling /api/zip with sessionId " + sessionId);
    const zipData = await fetchPost("/api/zip", {sessionId: sessionId});
    console.log(zipData);

    if (zipData.success) {
        updateDownloadProgressLabel("Created zip~! Starting download... Please wait for browser download to appear");
    } else {
        updateDownloadProgressLabel(`Error when creating zip. See browser console...`);
        console.error(zipData.message);
        return null;
    }

    // get chunks to download
    console.log("Calling /api/download with sessionId " + sessionId);
    const downloadRes = await fetch(`/api/download?sessionId=${sessionId}`);
    const reader = downloadRes.body.getReader();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    // create blob + clickable url
    const blob = new Blob(chunks);
    const urlObj = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = zipData.filename;
    document.body.appendChild(a);
    a.click();
    // clean up blob + clickable url
    window.URL.revokeObjectURL(urlObj);
    setTimeout(() => {
        a.parentNode.removeChild(a);
    }, 100);

    // clean up files on the server after download
    console.log("Calling /api/cleanup with sessionId of " + sessionId);
    updateDownloadProgressLabel(`Finished downloading ${zipData.filename}~! Running cleanup on the server...`);
    // const deleteRes = await fetch(`/api/cleanup?sessionId=${sessionId}`, { method: "DELETE" });
    // const deleteResJson = await deleteRes.json();
    const deleteData = await fetchDelete(`/api/cleanup?sessionId=${sessionId}`);
    if (deleteData.success) {
        updateDownloadProgressLabel(`Finished downloading ${zipData.filename}~! Successfully cleaned up after myself!`);
        console.log("Successfully cleaned up files on the server");
    } else {
        updateDownloadProgressLabel(`Error when cleaning up files on the server. See console...`);
        console.error(`Error when cleaning up files: ${deleteData.message}`);
    }
}