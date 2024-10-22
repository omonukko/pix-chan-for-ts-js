import axios, { AxiosHeaders } from 'axios';

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class PixError extends Error {}

export class PixAI {
    private headers: Record<string, string>;
    private token?: any;
    private user_id?: string;
    private proxy?: { [key: string]: string };

    constructor(email: string, password: string, login: boolean = true, token?: string, proxy?: { [key: string]: string }) {
        this.proxy = proxy;
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
            "Content-Type": "application/json",
            "Origin": "https://pixai.art",
            "Priority": "u=1, i",
            "Referer": "https://pixai.art/",
            "Sec-Ch-Ua": "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": "\"Windows\"",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
        };

        if (token) {
            this.token = token;
            this.headers["authorization"] = `Bearer ${this.token}`;
        } else {
            this.registerOrLogin(email, password, login);
        }
    }

    private async captcha(retries: number = 3): Promise<string | false> {
        try {
            const response = await fetch("https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Ld_hskiAAAAADfg9HredZvZx8Z_C8FrNJ519Rc6&co=aHR0cHM6Ly9waXhhaS5hcnQ6NDQz&hl=ja&v=aR-zv8WjtWx4lAw-tRCA-zca&size=invisible&cb=u2wj0bvs99s6", {
                method: 'GET',
            });
    
            if (!response.ok) {
                throw new PixError("first request failed");
            }
    
            const text = await response.text();
            const recaptchaToken = text.split('recaptcha-token" value="')[1]?.split('">')[0];
    
            if (!recaptchaToken) {
                new PixError("Failed to extract recaptcha token from the initial response.");
                return false;
            }
    
            await sleep(2300);
    
            const payload = new URLSearchParams({
                v: "aR-zv8WjtWx4lAw-tRCA-zca",
                reason: "q",
                c: recaptchaToken,
                k: "6Ld_hskiAAAAADfg9HredZvZx8Z_C8FrNJ519Rc6",
                co: "aHR0cHM6Ly9waXhhaS5hcnQ6NDQz",
                hl: "ja",
                size: "invisible",
            });
    
            const postResponse = await fetch("https://www.google.com/recaptcha/api2/reload?k=6Ld_hskiAAAAADfg9HredZvZx8Z_C8FrNJ519Rc6", {
                method: 'POST',
                body: payload,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
    
            if (!postResponse.ok) {
                throw new PixError("Captcha Reload Failed");
            }
    
            await sleep(1900);
    
            const postText = await postResponse.text();
            const token = postText.split('"rresp","')[1]?.split('"')[0];
    
            if (!token) {
                new PixError("Failed to extract token from the post response.");
                return false;
            }
    
            return token;
        } catch (error) {
            new PixError("Captcha failed:", error);
            if (retries > 0) {
                console.log("now retrying...");
                return await this.captcha(retries - 1);
            }
            return false;
        }
    }
    

    private async registerOrLogin(email: string, password: string, login: boolean): Promise<void> {
        const recaptchaToken = await this.captcha();
        if (!recaptchaToken) {
            throw new PixError("キャプチャー失敗");
        }
        let query:string;
        if (login === true) {
            query = `mutation login($input: RegisterOrLoginInput!) {
                login(input: $input) {
                    ...UserDetail
                }
            }
    
            fragment UserDetail on User {
                ...UserBase
                coverMedia {
                    ...MediaBase
                }
                followedByMe
                followingMe
                followerCount
                followingCount
                inspiredCount
            }
    
            fragment UserBase on User {
                id
                email
                emailVerified
                username
                displayName
                createdAt
                updatedAt
                avatarMedia {
                    ...MediaBase
                }
                membership {
                    membershipId
                    tier
                }
                isAdmin
            }
    
            fragment MediaBase on Media {
                id
                type
                width
                height
                urls {
                    variant
                    url
                }
                imageType
                fileUrl
                duration
                thumbnailUrl
                hlsUrl
                size
                flag {
                    ...ModerationFlagBase
                }
            }
    
            fragment ModerationFlagBase on ModerationFlag {
                status
                isSensitive
                isMinors
                isRealistic
                isFlagged
                isSexyPic
                isSexyText
                shouldBlur
                isWarned
            }`;
        } else if (login === false) {
            query = `mutation register($input: RegisterOrLoginInput!) { 
                register(input: $input) { 
                    ...UserBase 
                } 
            }
            
            fragment UserBase on User { 
                id 
                email 
                emailVerified 
                username 
                displayName 
                createdAt 
                updatedAt 
                avatarMedia { 
                    ...MediaBase 
                } 
                membership { 
                    membershipId 
                    tier 
                } 
                isAdmin 
            } 
            
            fragment MediaBase on Media { 
                id 
                type 
                width 
                height 
                urls { 
                    variant 
                    url 
                } 
                imageType 
                fileUrl 
                duration 
                thumbnailUrl 
                hlsUrl 
                size 
                flag { 
                    ...ModerationFlagBase 
                } 
            } 
            
            fragment ModerationFlagBase on ModerationFlag { 
                status 
                isSensitive 
                isMinors 
                isRealistic 
                isFlagged 
                isSexyPic 
                isSexyText 
                shouldBlur 
                isWarned 
            }`;
        } else {
            throw new PixError("loginの値はtrueまたはfalseである必要があります。");
        }
    
        const payload = {
            query,
            variables: {
                input: {
                    email,
                    password,
                    recaptchaToken
                }
            }
        };    

    
        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers });
        
        if ("errors" in response.data) {
            throw new PixError(JSON.stringify(response.data.errors));
        }
    
        const headers = response.headers;
        let token;
        if (headers instanceof AxiosHeaders && headers.get('Token')) {
            token = headers.get('Token');
        }
    
        if (token) {
            this.token = token;
            this.headers["authorization"] = `Bearer ${this.token}`;
        } else {
            throw new PixError("Token Get Failed");
        }
    
        if (!login) {
            this.user_id = response.data.data.register.id;
            await this.setPreferences();
        } else {
            this.user_id = response.data.data.login.id;
        }
    }
    

    private async setPreferences(): Promise<void> {
        const agePayload = {
            query: `mutation setPreferences($value: JSONObject!) { setPreferences(value: $value) }`,
            variables: {
                value: {
                    experienceLevel: "beginner",
                    ageVerificationStatus: "OVER18"
                }
            }
        };
        await axios.post("https://api.pixai.art/graphql", agePayload, { headers: this.headers });
    }

    public async getQuota(): Promise<number> {
        const payload = { query: `query getMyQuota { me { quotaAmount } }`, variables: {} };
        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers});
        if ("errors" in response.data) {
            throw new PixError(JSON.stringify(response.data.errors));
        }
        return response.data.data.me.quotaAmount;
    }

    public async getMedia(media_id: string): Promise<string> {
        const payload = {
            query: `query getMedia($id: String!) { media(id: $id) { ...MediaBase } } fragment MediaBase on Media { id type width height urls { variant url } imageType fileUrl duration thumbnailUrl hlsUrl size flag { ...ModerationFlagBase } } fragment ModerationFlagBase on ModerationFlag { status isSensitive isMinors isRealistic isFlagged isSexyPic isSexyText shouldBlur isWarned }`,
            variables: { id: media_id }
        };

        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers});
        if ("errors" in response.data) {
            throw new PixError(JSON.stringify(response.data.errors));
        }

        return response.data.data.media.urls[0].url;
    }

    public async claimDailyQuota(): Promise<any> {
        const payload = { query: `mutation dailyClaimQuota { dailyClaimQuota }` };
        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers});
        if ("errors" in response.data) {
            throw new PixError(JSON.stringify(response.data.errors));
        }
        return response.data;
    }

    public async claimQuestionnaireQuota(wait: number = 3): Promise<any> {
        const formData = new URLSearchParams({
            'entry.64278853': `${this.user_id}`,
            'entry.2090837715': '趣味に身を投じる人', 
            'entry.238512000': '18-25', 
            'entry.1451582794': '日本', 
            'entry.571931610': 'AI生成ツールをほとんど使ったことがない', 
            'entry.1078511207': 'Twitter', 
            'entry.1446121912': '好きなキャラクター', 
            'entry.2087342135': 'カートゥーン', 
            'entry.1264482712': '壁紙・プロフィール画像用', 
            'entry.1293236062': '7', 
        });

        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        };
    
        try {
            const res = await axios.post(
                "https://docs.google.com/forms/u/0/d/e/1FAIpQLSdYvAY6PDOVBl3Bd2FgnkCoz-G0KXk8OV_63gG96FIVYm0mEw/formResponse",
                formData,
                { headers }
            );
        } catch (error) {
            throw new PixError("Google Forms submission failed: " + error);
        }

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        const payload = {
            query: `mutation claimQuestReward($id: ID!) { rewardQuest(id: $id) { count } }`,
            variables: { id: "1723830082652557313" }
        };

        if (wait > 0) {
            await sleep(10000);
        }
        try {
            const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers });
            if (response.data.errors) {
                throw new PixError(JSON.stringify(response.data.errors));
            }
            return response.data;
        } catch (error) {
            throw new PixError("API request failed: " + error);
        }
    }
    
    public async getTaskById(query_id: string): Promise<string[] | null> {
        const payload = {
            query: `query getTaskById($id: ID!) { task(id: $id) { ...TaskDetail } } fragment TaskDetail on Task { ...TaskBase favoritedAt artworkId artworkIds artworks { createdAt hidePrompts id isNsfw isSensitive mediaId title updatedAt flag { ...ModerationFlagBase } } media { ...MediaBase } type { type model } } fragment TaskBase on Task { id userId parameters outputs status priority runnerId startedAt endAt createdAt updatedAt retryCount paidCredit moderationAction { promptsModerationAction } } fragment ModerationFlagBase on ModerationFlag { status isSensitive isMinors isRealistic isFlagged isSexyPic isSexyText shouldBlur isWarned } fragment MediaBase on Media { id type width height urls { variant url } imageType fileUrl duration thumbnailUrl hlsUrl size flag { ...ModerationFlagBase } }`,
            variables: { id: query_id }
        };

        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers});
        if ("errors" in response.data) {
            throw new PixError(JSON.stringify(response.data.errors));
        }

        try {
            if (response.data.data.task.status !== "completed") {
                return null;
            }
        } catch {
            return null;
        }

        const mediaIds: string[] = [];
        try {
            for (const batch of response.data.data.task.outputs.batch) {
                mediaIds.push(batch.mediaId);
            }
        } catch {
            mediaIds.push(response.data.data.task.outputs.mediaId);
        }

        return mediaIds;
    }

    public async generateImage(prompts: string, width: number = 768, height: number = 1280, x4: boolean = false): Promise<string> {
        const payload = {
            query: `mutation createGenerationTask($parameters: JSONObject!) { createGenerationTask(parameters: $parameters) { ...TaskBase } } fragment TaskBase on Task { id userId parameters outputs status priority runnerId startedAt endAt createdAt updatedAt retryCount paidCredit moderationAction { promptsModerationAction } }`,
            variables: {
                parameters: {
                    prompts,
                    extra: {},
                    negativePrompts: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, quality bad, hands bad, eyes bad, face bad, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name\n",
                    samplingSteps: 25,
                    samplingMethod: "Euler a",
                    cfgScale: 6,
                    seed: "",
                    priority: 1000,
                    width,
                    height,
                    clipSkip: 1,
                    modelId: "1709400693561386681",
                    controlNets: [],
                    batchSize: x4 ? 4 : 1
                }
            }
        };
    
        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers});
        if ("errors" in response.data) {
            throw new PixError(JSON.stringify(response.data.errors));
        }
    
        return response.data.data.createGenerationTask.id;
    }
    
}
