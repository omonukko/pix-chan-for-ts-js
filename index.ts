import axios from 'axios';

//

async function captcha(proxy: any) {
    const response = await axios.get("https://www.google.com/recaptcha/api2/anchor?ar=1&k=6Ld_hskiAAAAADfg9HredZvZx8Z_C8FrNJ519Rc6&co=aHR0cHM6Ly9waXhhaS5hcnQ6NDQz&hl=ja&v=aR-zv8WjtWx4lAw-tRCA-zca&size=invisible&cb=u2wj0bvs99s6", { proxy });
    const recaptchaToken = response.data.split('recaptcha-token" value="')[1].split('">')[0];
    const payload = {
        v: "aR-zv8WjtWx4lAw-tRCA-zca",
        reason: "q",
        c: recaptchaToken,
        k: "6Ld_hskiAAAAADfg9HredZvZx8Z_C8FrNJ519Rc6",
        co: "aHR0cHM6Ly9waXhhaS5hcnQ6NDQz",
        hl: "en",
        size: "invisible",
        chr: "",
        vh: "",
        bg: ""
    };

    const postResponse = await axios.post("https://www.google.com/recaptcha/api2/reload?k=6Ld_hskiAAAAADfg9HredZvZx8Z_C8FrNJ519Rc6", payload, { proxy });
    try {
        const token = postResponse.data.split('"rresp","')[1].split('"')[0];
        return token;
    } catch {
        return false;
    }
}

class PixError extends Error {}

class PixAI {
    proxy: any;
    headers: any;
    token: string | undefined;
    user_id: string | undefined;

    constructor(email: string, password: string, login: boolean = true, token: string | undefined = undefined, proxy: any = undefined) {
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
            this.user_id = undefined;
        } else {
            const payload = {
                query: `
                    mutation register($input: RegisterOrLoginInput!) {
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
                    }`,
                variables: {
                    input: {
                        email,
                        password,
                        recaptchaToken: captcha(this.proxy)
                    }
                }
            };

            if (!payload.variables.input.recaptchaToken) {
                throw new PixError("Captcha Failed");
            }

            if (login) {
                payload.query = `
                    mutation login($input: RegisterOrLoginInput!) {
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
            }

            axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers, proxy: this.proxy })
                .then((res) => {
                    if (res.data.errors) {
                        throw new PixError(res.data.errors);
                    }
                    this.token = res.headers.Token;
                    this.headers["authorization"] = `Bearer ${this.token}`;
                    if (!login) {
                        this.user_id = res.data.data.register.id;
                        const agePayload = {
                            query: `
                                mutation setPreferences($value: JSONObject!) {
                                    setPreferences(value: $value)
                                }`,
                            variables: {
                                value: {
                                    experienceLevel: "beginner",
                                    ageVerificationStatus: "OVER18"
                                }
                            }
                        };
                        axios.post("https://api.pixai.art/graphql", agePayload, { headers: this.headers, proxy: this.proxy });
                    } else {
                        this.user_id = res.data.data.login.id;
                    }
                });
        }
    }

    async getQuota() {
        const payload = {
            query: `
                query getMyQuota {
                    me {
                        quotaAmount
                    }
                }`
        };

        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers, proxy: this.proxy });
        if (response.data.errors) {
            throw new PixError(response.data.errors);
        }

        return parseInt(response.data.data.me.quotaAmount);
    }

    async getMedia(media_id: string) {
        const payload = {
            query: `
                query getMedia($id: String!) {
                    media(id: $id) {
                        ...MediaBase
                    }
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
                }`,
            variables: { id: media_id }
        };

        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers, proxy: this.proxy });
        if (response.data.errors) {
            throw new PixError(response.data.errors);
        }

        return response.data.data.media.urls[0].url;
    }

    async claimDailyQuota() {
        const payload = {
            query: `
                mutation dailyClaimQuota {
                    dailyClaimQuota
                }`
        };

        const response = await axios.post("https://api.pixai.art/graphql", payload, { headers: this.headers, proxy: this.proxy });
        if (response.data.errors) {
            throw new PixError(response.data.errors);
        }

        return response.data;
    }

    async claimQuestionnaireQuota(wait: number = 3) {
        const formData = {
            'entry.64278853': this.user_id,
            'entry.2090837715': '趣味に身を投じる人',
            'entry.238512000': '18-25',
            'entry.1451582794': '日本',
            'entry.571931610': 'AI生成ツールをほとんど使ったことがない',
            'entry.1078511207': 'Twitter',
            'entry.1446121912': '好きなキャラクター',
            'entry.2087342135': 'カートゥーン',
            'entry.257503117': 'Inspiration',
            'entry.1413585023': '友達',
            'fvv': '1',
            'draftResponse': '[]',
            'pageHistory': '0'
        };

        const response = await axios.post("https://docs.google.com/forms/u/0/d/e/1FAIpQLSfiLpQt8KHiFqO7kvkOtF3Jo0cFZ7keZXhMZ3N7JY4Ht1xg6g/formResponse", formData, { headers: this.headers, proxy: this.proxy });
        await new Promise(resolve => setTimeout(resolve, wait * 1000));
        await this.claimDailyQuota();
    }
    async getAllTasks(): Promise<string[][]> {
        const payload = {
            query: `
                query listMyTasks($status: String, $before: String, $after: String, $first: Int, $last: Int) {
                    me {
                        tasks(status: $status, before: $before, after: $after, first: $first, last: $last) {
                            pageInfo {
                                hasNextPage
                                hasPreviousPage
                                endCursor
                                startCursor
                            }
                            edges {
                                node {
                                    ...TaskWithMedia
                                }
                            }
                        }
                    }
                }

                fragment TaskWithMedia on Task {
                    ...TaskBase
                    favoritedAt
                    artworkIds
                    media {
                        ...MediaBase
                    }
                }

                fragment TaskBase on Task {
                    id
                    userId
                    parameters
                    outputs
                    status
                    priority
                    runnerId
                    startedAt
                    endAt
                    createdAt
                    updatedAt
                    retryCount
                    paidCredit
                    moderationAction {
                        promptsModerationAction
                    }
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
                }
            `,
            variables: {
                last: 30
            }
        };

        try {
            const response = await axios.post('https://api.pixai.art/graphql', payload, {
                headers: this.headers,
                proxy: this.proxy
            });

            const edges = response.data.data.me.tasks.edges;
            const mediaIdsAll: string[][] = [];

            for (const edge of edges) {
                const mediaIds: string[] = [];
                const taskPayload = {
                    query: `
                        query getTaskById($id: ID!) {
                            task(id: $id) {
                                ...TaskDetail
                            }
                        }

                        fragment TaskDetail on Task {
                            ...TaskBase
                            favoritedAt
                            artworkId
                            artworkIds
                            artworks {
                                createdAt
                                hidePrompts
                                id
                                isNsfw
                                isSensitive
                                mediaId
                                title
                                updatedAt
                                flag {
                                    ...ModerationFlagBase
                                }
                            }
                            media {
                                ...MediaBase
                            }
                            type {
                                type
                                model
                            }
                        }
                    `,
                    variables: {
                        id: edge.node.id
                    }
                };

                const taskResponse = await axios.post('https://api.pixai.art/graphql', taskPayload, {
                    headers: this.headers,
                    proxy: this.proxy
                });

                if (taskResponse.data.errors) {
                    throw new Error(taskResponse.data.errors);
                }

                if (taskResponse.data.data.task.status !== 'completed') {
                    mediaIds.push(null!);
                    continue;
                }

                try {
                    for (const batch of taskResponse.data.data.task.outputs.batch) {
                        mediaIds.push(batch.mediaId);
                    }
                } catch {
                    mediaIds.push(taskResponse.data.data.task.outputs.mediaId);
                }

                mediaIdsAll.push(mediaIds);
            }

            return mediaIdsAll;
        } catch (error: any) {
            throw new Error(`Error fetching tasks: ${error.message}`);
        }
    }

    async getLatestTask(): Promise<string[] | null> {
        const payload = {
            query: `
                query listMyTasks($status: String, $before: String, $after: String, $first: Int, $last: Int) {
                    me {
                        tasks(status: $status, before: $before, after: $after, first: $first, last: $last) {
                            pageInfo {
                                hasNextPage
                                hasPreviousPage
                                endCursor
                                startCursor
                            }
                            edges {
                                node {
                                    ...TaskWithMedia
                                }
                            }
                        }
                    }
                }

                fragment TaskWithMedia on Task {
                    ...TaskBase
                    favoritedAt
                    artworkIds
                    media {
                        ...MediaBase
                    }
                }

                fragment TaskBase on Task {
                    id
                    userId
                    parameters
                    outputs
                    status
                    priority
                    runnerId
                    startedAt
                    endAt
                    createdAt
                    updatedAt
                    retryCount
                    paidCredit
                    moderationAction {
                        promptsModerationAction
                    }
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
                }
            `,
            variables: {
                last: 30
            }
        };

        try {
            const response = await axios.post('https://api.pixai.art/graphql', payload, {
                headers: this.headers,
                proxy: this.proxy
            });

            if (response.data.errors) {
                throw new Error(response.data.errors);
            }

            const tasks = response.data.data.me.tasks.edges;
            const latestTaskId = tasks[tasks.length - 1].node.id;

            if (tasks[0].node.status !== 'completed') {
                return null;
            }

            const taskPayload = {
                query: `
                    query getTaskById($id: ID!) {
                        task(id: $id) {
                            ...TaskDetail
                        }
                    }

                    fragment TaskDetail on Task {
                        ...TaskBase
                        favoritedAt
                        artworkId
                        artworkIds
                        artworks {
                            createdAt
                            hidePrompts
                            id
                            isNsfw
                            isSensitive
                            mediaId
                            title
                            updatedAt
                            flag {
                                ...ModerationFlagBase
                            }
                        }
                        media {
                            ...MediaBase
                        }
                        type {
                            type
                            model
                        }
                    }
                `,
                variables: {
                    id: latestTaskId
                }
            };

            const taskResponse = await axios.post('https://api.pixai.art/graphql', taskPayload, {
                headers: this.headers,
                proxy: this.proxy
            });

            const mediaIds: string[] = [];

            try {
                for (const batch of taskResponse.data.data.task.outputs.batch) {
                    mediaIds.push(batch.mediaId);
                }
            } catch {
                mediaIds.push(taskResponse.data.data.task.outputs.mediaId);
            }

            return mediaIds;
        } catch (error: any) {
            throw new Error(`Error fetching latest task: ${error.message}`);
        }
    }

    async getTaskById(queryId: string): Promise<string[] | null> {
        const payload = {
            query: `
                query getTaskById($id: ID!) {
                    task(id: $id) {
                        ...TaskDetail
                    }
                }

                fragment TaskDetail on Task {
                    ...TaskBase
                    favoritedAt
                    artworkId
                    artworkIds
                    artworks {
                        createdAt
                        hidePrompts
                        id
                        isNsfw
                        isSensitive
                        mediaId
                        title
                        updatedAt
                        flag {
                            ...ModerationFlagBase
                        }
                    }
                    media {
                        ...MediaBase
                    }
                    type {
                        type
                        model
                    }
                }
            `,
            variables: {
                id: queryId
            }
        };

        try {
            const response = await axios.post('https://api.pixai.art/graphql', payload, {
                headers: this.headers,
                proxy: this.proxy
            });

            if (response.data.errors) {
                throw new Error(response.data.errors);
            }

            if (response.data.data.task.status !== 'completed') {
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
        } catch (error: any) {
            throw new Error(`Error fetching task by ID: ${error.message}`);
        }
    }

    async generateImage(prompts: string, width: number = 768, height: number = 1280, x4upscale: boolean = false): Promise<any> {
        const payload = {
            query: `
                mutation Imagine($input: ImagineInput!) {
                    imagine(input: $input) {
                        taskId
                    }
                }
            `,
            variables: {
                input: {
                    prompt: prompts,
                    width: width,
                    height: height,
                    model: "Synthography",
                    scheduler: "DPM++ 2M Karras",
                    numImages: 1,
                    seed: Math.floor(Math.random() * 1000000),
                    enableParams: {
                        x4upscale: x4upscale
                    }
                }
            }
        };

        try {
            const response = await axios.post('https://api.pixai.art/graphql', payload, {
                headers: this.headers,
                proxy: this.proxy
            });

            if (response.data.errors) {
                throw new Error(response.data.errors);
            }

            return response.data.data.imagine.taskId;
        } catch (error: any) {
            throw new Error(`Error generating image: ${error.message}`);
        }
    }
}

export { PixAI, PixError };
