const { spawn } = require('child_process');
const config = require('./config.json');
const YTDLP_BINARY = config.YTDLP_BINARY;

/**
 * Gets the current version
 * @returns {Promise<String>} Resoves with the output of --version
 */
function getVersion() {
    return new Promise(function(resolve, reject) {
        const ytdlp = spawn(YTDLP_BINARY, ['--version']);
        let output = "";

        ytdlp.stdout.on('data', data => {
            output = data.toString().trim();
        });

        ytdlp.on('error', error => {
            console.error(error);
            reject(error.message);
        });

        ytdlp.stderr.on('data', data => {
            console.error(data.toString().trim());
        });

        ytdlp.on('exit', code => {
            if (code > 0) {
                reject('Proccess failed with exit code ' + code);
            } else {
                resolve(output);
            }
        });
    });
}

/**
 * Uses yt-dlp to get the video output title
 * @param {String} url youtube url
 * @returns {Promise}
 */
function getTitle(url) {
    const args = [
        '--ignore-errors',
        "--print", "filename",
        "-o", "%(title)s",
        url
    ];

    return new Promise((resolve, reject) => {
        const ytdlp = spawn(YTDLP_BINARY, args);
        let returnValue = "";

        ytdlp.stdout.on('data', data => {
            let output = data.toString().trim();
            if (output === `WARNING: [youtube:tab] YouTube said: INFO - 1 unavailable video is hidden`) reject(output);
            returnValue = output;
        });

        ytdlp.on('error', error => {
            reject(error.message);
        });

        ytdlp.stderr.on('data', data => {
            reject(data.toString().trim());
        });

        ytdlp.on('exit', code => {
            if (code > 0) {
                reject('Proccess failed with exit code ' + code);
            } else {
                resolve(returnValue);
            }
        });
    });
}

/**
 * Use yt=dlp to downnload audio from a youtube url
 * @param {String} url youtube url
 * @param {String} destination download destination
 * @param {String} filename desired filename
 * @param {Object} options array of yt-dlp options
 * @returns {Promise}
 */
function downloadAudio(url, destination, filename, options = { format: "bestaudio", audioformat: "mp3", embedthumbnail: false }) {
    const args = [
        "--ignore-errors",
        "-P", destination,
        "--format", options.format,
        "--extract-audio",
        "--audio-format", options.audioformat,
        "--audio-quality", "0",
        "--output", filename,
        url
    ];

    const thumbnailArgs = [
        "--ignore-errors",
        "-P", destination,
        "--format", options.format,
        "--extract-audio",
        "--audio-format", options.audioformat,
        "--audio-quality", "0",
        "--embed-thumbnail",
        "--output", filename,
        url
    ]

    return new Promise((resolve, reject) => {
        const ytdlp = spawn(YTDLP_BINARY, !options.embedthumbnail ? args : thumbnailArgs);

        ytdlp.stdout.on('data', data => {
            let output = data.toString().trim();
            console.log(output);
            if (output.includes(`: error:`)) reject(false);
        });

        ytdlp.on('error', error => {
            console.error(error.message);
            reject(false);
        });

        ytdlp.stderr.on('data', data => {
            console.error(data.toString().trim());
            reject(false);
        });

        ytdlp.on('exit', code => {
            if (code > 0) {
                reject(false);
            } else {
                resolve(true);
            }
        });
    });
}

/**
 * Use yt=dlp to download video from a youtube url
 * @param {String} url youtube url
 * @param {String} destination download destination
 * @param {String} filename desired filename
 * @param {Object} options array of yt-dlp options
 * @returns {Promise}
 */
function downloadVideo(url, destination, filename, options = { extension: "mp4", embedthumbnail: false }) {
    const args = [
        "--ignore-errors",

        // set download dest
        "-P", destination,
        "-S", `res,ext:${options.extension}:m4a`,
        "--recode", options.extension,
        "--output", filename,
        url
    ];

    const thumbnailArgs = [
        "--ignore-errors",
        "-P", destination,
        "-S", `res,ext:${options.extension}:m4a`,
        "--recode", options.extension,
        "--embed-thumbnail",
        "--output", filename,
        url
    ];

    return new Promise((resolve, reject) => {
        const ytdlp = spawn(YTDLP_BINARY, !options.embedthumbnail ? args : thumbnailArgs);

        ytdlp.stdout.on('data', data => {
            let output = data.toString().trim();
            console.log(output);
            if (output.includes(`: error:`)) reject(false);
        });

        ytdlp.on('error', error => {
            console.error(error.message);
            reject(false);
        });

        ytdlp.stderr.on('data', data => {
            console.error(data.toString().trim());
            reject(false);
        });

        ytdlp.on('exit', code => {
            if (code > 0) {
                reject(false);
            } else {
                resolve(true);
            }
        });
    });
}

function getPlaylistJson(url) {
    const args = [
        "--ignore-errors",
        "--flat-playlist",
        "--print", "{\"url\": \"%(url)s\", \"title\": \"%(title)s\"}",
        `${url}`
    ];

    console.log(`getting playlist data for ${url}`);

    return new Promise((resolve, reject) => {
        const ytdlp = spawn(YTDLP_BINARY, args);
        let dataArray = [];

        ytdlp.stdout.on('data', data => {
            let output = data.toString().trim();
            dataArray.push(output);
            console.log(output);
        });

        ytdlp.on('error', error => {
            console.log(error);
            reject(error);
        });

        ytdlp.stderr.on('data', data => {
            console.log(data.toString().trim());
            // reject(data.toString().trim());
        });

        ytdlp.on('exit', code => {
            if (code > 0) {
                reject(false);
            } else {
                let newArr = [];
                for (let json of dataArray) {
                    try {
                        let j = JSON.parse(json);
                        if (j.title !== "[Deleted video]") {
                            newArr.push({
                                url: j.url,
                                title: j.title
                            });
                        }
                    } catch (error) {
                        console.error(error.message);
                    }
                }
                resolve(newArr);
            }
        });
    });
}

module.exports = {
    getVersion,
    getTitle,
    downloadAudio,
    downloadVideo,
    getPlaylistJson
}
