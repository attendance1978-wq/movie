const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

// Set ffmpeg path (adjust based on your system)
// For Ubuntu/Debian: ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
// For Windows: ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');

module.exports = {
    createThumbnail: (inputPath, outputPath, time = '00:00:05') => {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .screenshots({
                    timestamps: [time],
                    filename: 'thumbnail.jpg',
                    folder: outputPath,
                    size: '640x360'
                })
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
    },
    
    createVideoVariants: (inputPath, outputDir, resolutions) => {
        const promises = resolutions.map(res => {
            return new Promise((resolve, reject) => {
                const outputPath = path.join(outputDir, `${res.height}p.mp4`);
                ffmpeg(inputPath)
                    .size(`${res.width}x${res.height}`)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .output(outputPath)
                    .on('end', () => resolve({ resolution: res, path: outputPath }))
                    .on('error', reject)
                    .run();
            });
        });
        return Promise.all(promises);
    }
};