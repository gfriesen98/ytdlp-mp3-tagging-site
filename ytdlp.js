const { spawn } = require('child_process');
const config = require('./config.json');
const YTDLP_BINARY = config.YTDLP_BINARY;

const functionTypes = {
    title: "getTitle",
    audio: "downloadAudio",
    video: "downloadVideo",
    playlist: "getPlaylistJson"
};

const optionsTemplate = {
    audio: {
        audioonly: true,
        format: "bestaudio",
        audioformat: "mp3"
    },
    video: {
        extension: "mp4",
    },
    embedthumbnail: false
}

function buildOpts(type, url = "", destination = "", filename = "", options = optionsTemplate) {
    if (typeof type === "undefined") return new Error("'type' is required");
    if (!Object.values(functionTypes).includes(type)) return new Error("'type' must be one of 'functionTypes'");

    switch (type) {
        case "getTitle":
            return ['--ignore-errors', '--print', 'filename', '-o', "%(title)s", url];

        case "downloadAudio":
            console.log(options);
            if (!options.embedthumbnail) return ['--ignore-errors', '-P', destination, '--format', options.audio.format, '--extract-audio', '--audio-format', options.audio.audioformat, '--audio-quality', '0', '--output', filename, url];
            else return ['--ignore-errors', '-P', destination, '--format', options.audio.format, '--extract-audio', '--audio-format', options.audio.audioformat, '--audio-quality', '0', '--embed-thumbnail', '--output', filename, url];

        case "downloadVideo":
            if (!options.embedthumbnail) return ['--ignore-errors', '-P', destination, '-S', `res,ext:${options.video.extension}:m4a`, '--recode', options.video.extension, '--output', filename, url];
            else return ['--ignore-errors', '-P', destination, '-S', `res,ext:${options.video.extension}:m4a`, '--recode', options.video.extension, '--embed-thumbnail', '--output', filename, url];

        case "getPlaylistJson":
            return ['--ignore-errors', '--flat-playlist', '--print', "{\"url\": \"%(url)s\", \"title\": \"%(title)s\"}", `${url}`];

        default:
            return new Error("'type' not found");
    }
}

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
    return new Promise((resolve, reject) => {
        const ytdlp = spawn(YTDLP_BINARY, buildOpts(functionTypes.title, url));
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
 * Use yt=dlp to download audio from a youtube url
 * @param {String} url youtube url
 * @param {String} destination download directory
 * @param {String} filename desired filename
 * @param {Object} options optionsTemplate
 * @returns {Promise}
 */
function downloadAudio(url, destination, filename, options = optionsTemplate) {
    return new Promise((resolve, reject) => {
        const opts = buildOpts(functionTypes.audio, url, destination, filename, options);
        const ytdlp = spawn(YTDLP_BINARY, opts);

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
 * Use yt=dlp to download a video from a youtube url
 * @param {String} url youtube url
 * @param {String} destination download directory
 * @param {String} filename desired filename
 * @param {Object} options optionsTemplate
 * @returns {Promise}
 */
function downloadVideo(url, destination, filename, options = optionsTemplate) {
    return new Promise((resolve, reject) => {
        const opts = buildOpts(functionTypes.video, url, destination, filename, options);
        const ytdlp = spawn(YTDLP_BINARY, opts);

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
 * Use yt-dlp to get json output for a playlist
 * @param {String} url youtube url
 * @returns {Promise}
 */
function getPlaylistJson(url) {
    return new Promise((resolve, reject) => {
        const opts = buildOpts(functionTypes.playlist, url);
        const ytdlp = spawn(YTDLP_BINARY, opts);
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
