const { spawn } = require('child_process');
const config = require('./config.json');
const FFMPEG_BINARY = config.FFMPEG_BINARY;

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