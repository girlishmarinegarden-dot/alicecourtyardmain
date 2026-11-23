/**
 * ALICE'S GARDEN - 前端常量（严格配合 code.gs / code2.gs，不修改 .gs）
 *
 * 双 GAS 约定：
 * - GAS_URL = 部署 code2.gs 的 Web 应用地址（登录、签到、fetch_core、generate_fate、update_memory、refresh_token）
 * - WALL_URL = 部署 code.gs 的 Web 应用地址（留言墙：GET wall_fetch、POST wall_post）
 */
const ALICE_CONSTANTS = {
    /** code2.gs 部署后的 /exec 地址 */
    GAS_URL: "https://script.google.com/macros/s/AKfycbyLE9V4KYPIkcNF5WoAxVudbd2YagtLkbbFwwgTy9aYNZSVJtmknD0LWPIZBcco-h2h/exec",
    /** code.gs 部署后的 /exec 地址（留言墙） */
    WALL_URL: "https://script.google.com/macros/s/AKfycbzSgSyj4NiqV7LT5QdvSSFMfbm_PaXS0GS_sqUClpfc8sMsv2UiE--lp2OjFEKOAbN-/exec",

    BALANCE: {
        GACHA_COST: 200,
        DAILY_REWARD: 1000,
        QUIZ_COUNT: 10,
        ANSWER_MAX_LEN: 30,
        DIVINATION_COST: 100,
        /** 记忆模块首次点击 + 时扣除（每次返回世界后重置） */
        MEMORY_ENTRY_COST: 200
    },

    /** 画廊流式加载：每批显示的已拥有卡牌数量，点击「加载更多」继续加载 */
    GALLERY_PAGE_SIZE: 12,

    SCENES: {
        MAP: "scene-map",
        GARDEN: "scene-garden",
        LIBRARY: "scene-library",
        GALLERY: "scene-gallery",
        THEATER: "scene-theater",
        MARKET: "scene-market",
        DAILYTASK: "scene-dailytask",
        DIVINATION: "scene-divination",
        MEMORY: "scene-memory",
        ALICE_ENDING: "scene-alice-ending",
        MANGA_GALLERY: "scene-manga-gallery"
    },

    ROLES: {
        GUEST: "GUEST",
        CITIZEN: "CITIZEN",
        ADMIN: "ADMIN"
    },

    /** code2.gs 使用的 action：fetch_core, login, refresh_token, daily_checkin, generate_fate, update_memory, hana_welcome */
    /** code.gs 使用的 action：wall_fetch (GET), wall_post (POST) */
    ACTIONS: {
        FETCH_CORE: "fetch_core",
        LOGIN: "login",
        REGISTER: "register",
        REFRESH_TOKEN: "refresh_token",
        CHECKIN: "daily_checkin",
        GENERATE: "generate_fate",
        UPDATE_MEMORY: "update_memory",
        WALL_FETCH: "wall_fetch",
        WALL_POST: "wall_post",
        HANA_WELCOME: "hana_welcome",
        GET_THREE_CARDS_ANALYSIS: "get_three_cards_analysis"
    },

    STORAGE: {
        USER_STATE: "AliceGarden_User_State",
        TOKEN: "AliceGarden_Token",
        WORLD_CACHE: "AliceGarden_World_Cache",
        QUIZ_PROGRESS: "AliceGarden_Quiz_Progress",
        LAST_CHECKIN: "AliceGarden_Last_Checkin",
        BGM_ENABLED: "AliceGarden_BGM_Enabled",
        CHARACTER_FAVOR: "AliceGarden_Character_Favor",
        HANA_WELCOME_CACHE: "AliceGarden_HanaWelcome",
        LANG: "AliceGarden_Lang",
        SHOP_UNLOCKS: "AliceGarden_ShopUnlocks",
        RESIDUAL_UNLOCKED: "AliceGarden_ResidualUnlocked",
        CHAT_NICK: "AliceGarden_ChatNick"
    },

    /** Shella 因果市集可兑换装扮与贴纸包 */
    SHOP_ITEMS: [
        {
            id: "pack_courtyard",
            type: "sticker",
            value: "pack_courtyard",
            title: "限定贴纸包 · 庭院三影",
            badge: "STICKER PACK",
            desc: "解锁聊天室 3 枚专属动效贴纸：Moel 黑猫、404 蝴蝶、第十三张空白牌。",
            cost: 300
        },
        {
            id: "frame_gold",
            type: "frame",
            value: "gold",
            title: "聊天室 · 星金气泡框",
            badge: "CHAT FRAME",
            desc: "在公共频道发言时展示星金流光边框与柔金微晕。",
            cost: 400
        },
        {
            id: "frame_lilac",
            type: "frame",
            value: "lilac",
            title: "聊天室 · 月影紫气泡框",
            badge: "CHAT FRAME",
            desc: "在公共频道发言时展示庭院暮紫边框与雾光阴影。",
            cost: 400
        },
        {
            id: "title_flipper",
            type: "title",
            value: "翻牌者",
            title: "专属称号「翻牌者」",
            badge: "TITLE SEAL",
            desc: "在市民档案与频道聊天昵称旁佩戴 [翻牌者] 印记。",
            cost: 200
        }
    ],

    /** 实体 TCG 卡包 / 活动纪念暗号（站长可随时在此增删） */
    PROMO_CODES: {
        ALICE99: {
            label: "庭院迎宾暗号",
            points: 300,
            desc: "获赠 +300 因果值"
        },
        MOEL01: {
            label: "黑猫边界信物",
            unlockId: "pack_courtyard",
            desc: "直接解锁聊天室限定贴纸包（Moel / 404 蝴蝶 / 空白牌）"
        },
        CARD13: {
            label: "第十三张空白牌暗号",
            unlockId: "title_flipper",
            desc: "直接解锁专属称号「翻牌者」"
        },
        AFTERALICE: {
            label: "梦醒之后纪念暗号",
            unlockId: "frame_gold",
            desc: "直接解锁聊天室「星金气泡框」"
        }
    },

    PATHS: {
        MAP_BG: "assets/backgrounds/map_main.webp",
        UI_LOCK: "assets/icons/lock_icon.png",
        /** 地图节点图标：icon_{节点英文名}.png 或 .webp，如 icon_garden.png */
        NODE_ICONS_DIR: "assets/icons/",
        AVATAR_HANA: "assets/characters/hanadefault.webp",
        CARD_BACK: "assets/ui/card_back.webp",
        BGM_DIR: "assets/bgm/",
        /** 画廊卡牌立绘/卡面图，文件名与卡牌 id 一致，如 CARD_001.webp */
        CARDS_IMAGES: "assets/cards/",
        /** 开门过渡：钥匙图、锁孔图、开门视频 */
        OPENDOOR_KEY: "assets/ui/key.webp",
        OPENDOOR_KEYHOLE: "assets/ui/keyhole.webp",
        OPENDOOR_VIDEO: "assets/videos/opendoor.webm",
        /** 进入庭院时 Hana 前往中 loading 循环视频 */
        HANA_LOADING_VIDEO: "assets/videos/hanaloading.webm",
        /** Alice 终局：loading 过场 webm（可选），无则用 CSS 过场 */
        ALICE_ENDING_LOADING_VIDEO: "assets/videos/ending_loading.webm",
        /** Alice 终局：背景 webm，播放时 fade in，结束 fade out，不 loop */
        ALICE_ENDING_VIDEO: "assets/videos/alice_ending.webm",
        /** 下载结局 HTML 用背景图（项目根目录 ending/ 下） */
        ENDING_BG_WHITE: "ending/whiteending.webp",
        ENDING_BG_BLACK: "ending/blackending.webp",
        ENDING_BG_NORMAL: "ending/normalending.webp"
    },

    /** assets/bgm/ 下按顺序连续播放的 .mp3 文件名（theme → ed → theme …） */
    BGM_FILES: ["theme.mp3", "ed.mp3"],

    /** 角色好感度状态机：角色 id -> 默认图；表情名 -> 文件名后缀（无图时用 default） */
    CHARACTERS: {
        hana: {
            default: "assets/characters/hanadefault.webp",
            emotions: ["default", "smile", "sad", "angry"]
        },
        alice: {
            default: "assets/characters/alicedefault.webp",
            emotions: ["default", "end", "judge"]
        },
        yume: {
            default: "assets/characters/yumedefault.webp",
            emotions: ["default"]
        },
        azalea: {
            default: "assets/characters/azaleadefault.webp",
            emotions: ["default"]
        },
        meiling: {
            default: "assets/characters/meilingdefault.webp",
            emotions: ["default"]
        },
        shella: {
            default: "assets/characters/shelladefault.webp",
            emotions: ["default"]
        },
        mizuki: {
            default: "assets/characters/mizukidefault.webp",
            emotions: ["default"]
        },
        sienna: {
            default: "assets/characters/siennadefault.webp",
            emotions: ["default"]
        }
    },

    DIALOGUES: {
        YUME: [
            "有些页，还没有写完。",
            "历史可以被重演，但结果不会被抹除。",
            "你经过的每一处停顿，我都安静记下了。"
        ],
        AZALEA: [
            "茶还温着，你的卡牌序列我也替你理好了。",
            "请先坐下吧，这里的一切我都已确认无误。",
            "每一次被认真对待的碎片，都值得好好安放。"
        ],
        MEILING: [
            "今天也有被好好看见吗？这是给你的每日祈愿。",
            "一点微小的累积，也能在长夜里留下光。",
            "别忘了来清点今天的因果值哦。"
        ],
        SHELLA: [
            "空着的位置我一直留着。想看看庭院里的等价交换吗？",
            "每一段轨迹都有它的重量，这里的标价一向坦诚。",
            "不急，慢慢看就好，时间在这里走得很慢。"
        ],
        MIZUKI: [
            "书架上的每一卷都还静着，翻开哪一页都可以。",
            "我会在这里守着门，你安心阅读便是。",
            "有些真相不在结论里，而在页边的留白里。"
        ],
        HANA: [
            "停下来也没关系。先抽一张牌吧，我会陪你走完这一页。",
            "我不会替你决定，但你不是一个人在那里。",
            "十个问题之后，Alice 会把这一页折好交给你。"
        ],
        ALICE: [
            "你要去哪一边？",
            "归档已成立。无论黑白，或是尚未写完的空白。"
        ],
        SIENNA: [
            "前十二张是已被翻开的事，第十三张，始终留给翻牌的人。",
            "我不替你下结论，只把牌面的纹理轻轻说给你听。",
            "先把手放在水晶球上，看看今天哪三张牌愿意回应你。"
        ]
    }
};
if (typeof Object.freeze === "function") Object.freeze(ALICE_CONSTANTS);
