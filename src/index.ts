import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';

const gcs = new Storage();

import { tmpdir } from 'os';
import { join, dirname } from 'path';
import * as sharp from 'sharp';
import * as fs from 'fs-extra';

export const generateThumbs = functions.storage
    .object()
    .onFinalize(async (object: any) => {
        const bucket = gcs.bucket(object.bucket);
        const filePath = object.name;
        const fileName = filePath.split('/').pop();
        const bucketDir = dirname(filePath);

        const workingDir = join(tmpdir(), 'thumb');
        const tmpFilePath = join(workingDir, fileName);

        if (fileName.includes('thumb@') || !object.contentType.includes('image')) {
            console.log('exisintg functoin');
            return false
        }

        //1. Ensure thumbnail dir exists
        await fs.ensureDir(workingDir);

        //2. Download Source File
        await bucket.file(filePath).download({
            destination: tmpFilePath
        })

        //3. Resize the images and define an array of upload promises
        const sizes = [256];

        const uploadPromises = sizes.map(async size => {
            const thumbName = `thumb@${size}_${fileName}`;
            const thumbPath = join(workingDir, thumbName);

            // Resize source image
            await sharp(tmpFilePath)
                .resize(size, size)
                .toFile(thumbPath)

            //Upload to GCS
            return bucket.upload(thumbPath, {
                destination: join(`${bucketDir}/thumb@${size}`, thumbName)
            })
        })

        //4. Run the upload operatoins
        await Promise.all(uploadPromises);
        return fs.remove(workingDir)
    })

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
