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
        ALICE_ENDING: "scene-alice-ending"
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
        INSTALLED: "AliceGarden_Installed",
        LANG: "AliceGarden_Lang"
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
            emotions: ["default", "smile", "sad", "prologue", "thinking"]
        },
        alice: {
            default: "assets/characters/alicedefault.webp",
            emotions: ["default", "smile", "cold"]
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
        YUME: ["记录无声，因果有痕。", "一切成立之事，皆已归档。", "笔尖所及，即为真实。"],
        AZALEA: ["权限确认。卡牌序列已重组。", "秩序即是美德，请妥善保管您的因果资产。", "监控到能量波动……是稀有因果的味道。"],
        MEILING: ["哎呀，今天也辛苦了，这是给勤奋灵魂的奖励~", "补充一点糖分（因果值）吧，温柔的人运气都不会差哦。", "收好这些，这是您与庭院建立联系的证明。"],
        SHELLA: ["呵呵，想交换些什么？我这里的因果……可是明码标价的。", "腹黑？不，我只是比别人更懂得价值的流动而已。", "成交。希望这份碎片能带给你预想中的乐趣。"],
        MIZUKI: ["此处为禁域，守护‘设定’是我的最高准则。", "干扰者已排除。请在规则内阅读，不要触碰红线。", "剑与意志，皆为庭院而鸣。"],
        HANA: ["欢迎来到因果之庭。", "抽一张卡，我会为你讲述它的故事。", "十题之后，Alice 会为你写下终局。"],
        ALICE: ["因果已归档。", "你的选择，即是你的终局。"],
        SIENNA: ["占卜即与因果对话。", "选你所选，见你所见。", "命运之线，在此交织。"]
    }
};
if (typeof Object.freeze === "function") Object.freeze(ALICE_CONSTANTS);
