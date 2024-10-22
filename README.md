# 本パッケージは[これの](https://github.com/taka-4602/Pix-Chan/) TS|JS 版です

# アカウント生成のコード

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
        
        pix = new PixAI(mail,pass,false); //最後のbooleanがtrueだとloginになる
        
        await sleep(5000);

        console.log(`Email: ${email}`);
        console.log(`Password: ${pass}`);        
        await sleep(10000);

        await pix.claimDailyQuota(); // Daily Quotaの取得
        await pix.claimQuestionnaireQuota(); // アンケートを答えるともらえるQuotaの取得
        console.log(await pix.getQuota()); // Quotaの表示正常だと28000Quotaもらえるはず
    } catch (error) {
        console.error(error);
    }
}

createPixAIAccount();
```


# 画像生成の元

```typescript
import { PixAI } from "@omoti/pix-ai";

async function generateAndFetchMedia(prompt:string) {
    try {
        const pix = new PixAI("You Email","You password",true) // login
        setTimeout(async() => {
            const queryId = await pix.generateImage(args.prompt); // 画像生成のリクエスト
            console.log(`Generated Query ID: ${queryId}`);
    
            let mediaIds: string[] | null = null;
    
            while (mediaIds === null) {
                mediaIds = await pix.getTaskById(queryId); // タスクIDを取得
                if (mediaIds === null) {
                    console.log("Task is still processing, waiting...");
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
    
            for (const mediaId of mediaIds) {
                const media = await pix.getMedia(mediaId); // 生成されたurlの表示
                console.log(media);
    
                const quota = await pix.getQuota(); // Quotaの表示
                console.log(quota);
            }
        }, 5000);
    } catch (error) {
        console.error("Error occurred:", error);
    }
}

generateAndFetchMedia("apple")
```
