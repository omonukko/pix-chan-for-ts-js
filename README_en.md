# This package is the TS|JS version of [this](https://github.com/taka-4602/Pix-Chan/)

[JA](https://github.com/omonukko/pix-chan-for-ts-js/#readme)

Install

```
npm install @omoti/pix-ai
```

# Account Generation Codes:

```typescript
import { PixAI } from '@omoti/pix-ai';

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let pix:PixAI;

async function createPixAIAccount() {
    try {
        await sleep(5000);
        const email = "example@example.com"
        const pass = "password"
        
        pix = new PixAI(mail,pass,false); // If the last boolean is true, it becomes login.
        
        await sleep(5000);

        console.log(`Email: ${email}`);
        console.log(`Password: ${pass}`);        
        await sleep(10000);

        await pix.claimDailyQuota(); // Obtaining Daily Quota
        await pix.claimQuestionnaireQuota(); // Get quota by answering surveys
        console.log(await pix.getQuota()); // If the quota display is normal, you should receive 28,000 quota.
    } catch (error) {
        console.error(error);
    }
}

createPixAIAccount();
```


# Image Generation Codes:

```typescript
import { PixAI } from "@omoti/pix-ai";

async function generateAndFetchMedia(prompt:string) {
    try {
        const pix = new PixAI("You Email","You password",true) // login
        setTimeout(async() => {
            const queryId = await pix.generateImage(args.prompt); // Image Generation Req
            console.log(`Generated Query ID: ${queryId}`);
    
            let mediaIds: string[] | null = null;
    
            while (mediaIds === null) {
                mediaIds = await pix.getTaskById(queryId); // Getting Task ID
                if (mediaIds === null) {
                    console.log("Task is still processing, waiting...");
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
    
            for (const mediaId of mediaIds) {
                const media = await pix.getMedia(mediaId); // Displaying the generated URL
                console.log(media);
    
                const quota = await pix.getQuota(); // Viewing Quotas
                console.log(quota);
            }
        }, 5000);
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

generateAndFetchMedia("apple")
```

# Update Notes:

```diff
- Removed Recaptcha Logs
+ Added get_token() method // return this.token
+ Added README EN Version
```
