const { spawn } = require('child_process');
const config = require('./config.json');
const FFMPEG_BINARY = config.FFMPEG_BINARY;

/**
 * Spawn ffmpeg to create a clip from an input file
 * 
 * Rejects with error code or Error
 * 
 * ffmpeg command: `ffmpeg -i inputFil -ss timestamps.start -to timestamps.end -c copy outputFile`
 * 
 * @param {string} inputFile the input file to create clips from
 * @param {string} outputFile the output clip file name
 * @param {object} timestamps object containing `start` and `end` timestamps
 * @param {string} timestamps.start start time in HH:MM:SS
 * @param {string} timestamps.end end time in HH:MM:SS
 * @returns {Promise<resolve, reject>}
 */
async function createClip(inputFile, outputFile, timestamps) {
    return new Promise((resolve, reject) => {
        const ffmpegProcess = spawn(FFMPEG_BINARY, [
            '-i', inputFile,
            '-ss', timestamps.start,
            '-to', timestamps.end,
            '-c', 'copy',
            outputFile
        ]);

        ffmpegProcess.stdout.on('data', data => {
            console.log(`stdout: ${data}`);
        });

        ffmpegProcess.stderr.on('data', data => {
            console.error(`stderr: ${data}`);
        });

        ffmpegProcess.on('close', code => {
            if (code === 0) resolve();
            else {
                console.error(`FFMPEG eited with code ${code}`);
                reject(code);
            }
        });

        ffmpegProcess.on("error", err => {
            console.error(`Failed to start ffmpeg`, err);
            reject(err);
        })
    });
}

module.exports = {
    createClip
};